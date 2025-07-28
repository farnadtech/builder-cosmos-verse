import { Router, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authenticateToken, AuthenticatedRequest, requireEmployer } from '../middleware/auth';
import { query } from '../database/connection';
import { zarinpalService } from '../services/payment';

const router = Router();

// Create escrow payment for project milestone
router.post('/escrow', authenticateToken, requireEmployer, [
  body('projectId').isInt().withMessage('شناسه پروژه نامعتبر است'),
  body('milestoneId').isInt().withMessage('شناسه مرحله نامعتبر است')
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'اطلاعات ورودی نامعتبر است',
        errors: errors.array()
      });
    }

    const { projectId, milestoneId } = req.body;

    // Verify project ownership and milestone
    const projectResult = await query(`
      SELECT p.*, m.title as milestone_title, m.amount as milestone_amount, m.status as milestone_status
      FROM projects p
      JOIN milestones m ON p.id = m.project_id
      WHERE p.id = $1 AND m.id = $2 AND p.employer_id = $3
    `, [projectId, milestoneId, req.user!.id]);

    if (projectResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'پروژه یا مرحله یافت نشد'
      });
    }

    const project = projectResult.rows[0];

    // Check if project has contractor assigned
    if (!project.contractor_id) {
      return res.status(400).json({
        success: false,
        message: 'مجری برای این پروژه انتخاب نشده است'
      });
    }

    // Check if milestone is already paid
    const existingPayment = await query(
      'SELECT id FROM escrow_transactions WHERE project_id = $1 AND milestone_id = $2 AND status IN (\'held\', \'released\')',
      [projectId, milestoneId]
    );

    if (existingPayment.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'این مرحله قبلاً پرداخت شده است'
      });
    }

    const callbackUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/verify-escrow`;
    const description = `پرداخت امانی مرحله "${project.milestone_title}" از پروژه "${project.title}"`;

    // Create escrow payment
    const paymentResult = await zarinpalService.createEscrowPayment(
      projectId,
      milestoneId,
      req.user!.id,
      project.contractor_id,
      project.milestone_amount,
      description,
      callbackUrl
    );

    if (paymentResult.success) {
      res.json({
        success: true,
        message: 'درخواست پرداخت امانی ایجاد شد',
        data: {
          paymentUrl: paymentResult.paymentUrl,
          transactionId: paymentResult.transactionId,
          amount: project.milestone_amount,
          milestone: project.milestone_title
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: paymentResult.message
      });
    }

  } catch (error) {
    console.error('Create escrow payment error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در ایجاد پرداخت امانی'
    });
  }
});

// Verify escrow payment
router.post('/verify-escrow', authenticateToken, [
  body('Authority').notEmpty().withMessage('کد Authority الزامی است'),
  body('Status').equals('OK').withMessage('پرداخت تایید نشده است'),
  body('transaction_id').isInt().withMessage('شناسه تراکنش نامعتبر است')
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { Authority, Status, transaction_id } = req.body;

    if (Status !== 'OK') {
      return res.status(400).json({
        success: false,
        message: 'پرداخت لغو شده یا ناموفق بوده است'
      });
    }

    // Verify escrow payment
    const verification = await zarinpalService.verifyEscrowPayment(
      parseInt(transaction_id),
      Authority
    );

    if (verification.success) {
      // Get transaction details for response
      const transactionResult = await query(`
        SELECT et.*, p.title as project_title, m.title as milestone_title
        FROM escrow_transactions et
        JOIN projects p ON et.project_id = p.id
        JOIN milestones m ON et.milestone_id = m.id
        WHERE et.id = $1
      `, [transaction_id]);

      const transaction = transactionResult.rows[0];

      res.json({
        success: true,
        message: 'پرداخت امانی با موفقیت انجام شد',
        data: {
          transactionId: transaction_id,
          refId: verification.refId,
          amount: transaction.amount,
          project: transaction.project_title,
          milestone: transaction.milestone_title
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: verification.message
      });
    }

  } catch (error) {
    console.error('Verify escrow payment error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در تایید پرداخت امانی'
    });
  }
});

// Release escrow payment to contractor (admin or after milestone completion)
router.post('/release/:transactionId', authenticateToken, [
  param('transactionId').isInt()
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'شناسه تراکنش نامعتبر است'
      });
    }

    const { transactionId } = req.params;

    // Get transaction details
    const transactionResult = await query(`
      SELECT et.*, p.employer_id, p.contractor_id, p.title as project_title
      FROM escrow_transactions et
      JOIN projects p ON et.project_id = p.id
      WHERE et.id = $1 AND et.status = 'held'
    `, [transactionId]);

    if (transactionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'تراکنش امانی یافت نشد یا قابل آزادسازی نیست'
      });
    }

    const transaction = transactionResult.rows[0];

    // Check permissions: admin, employer, or contractor can request release
    const hasPermission = req.user!.role === 'admin' || 
                         transaction.employer_id === req.user!.id ||
                         transaction.contractor_id === req.user!.id;

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'دسترسی به این تراکنش ندارید'
      });
    }

    // Release payment
    const releaseResult = await zarinpalService.releaseEscrowPayment(
      parseInt(transactionId),
      req.user!.id
    );

    if (releaseResult.success) {
      res.json({
        success: true,
        message: releaseResult.message,
        data: {
          transactionId: parseInt(transactionId),
          amount: transaction.amount,
          project: transaction.project_title
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: releaseResult.message
      });
    }

  } catch (error) {
    console.error('Release escrow payment error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در آزادسازی وجه امانی'
    });
  }
});

// Get payment history for user
router.get('/history', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, type = 'all' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereConditions = ['(p.employer_id = $1 OR p.contractor_id = $1)'];
    let queryParams: any[] = [req.user!.id];
    let paramCount = 1;

    if (type !== 'all') {
      if (type === 'sent') {
        whereConditions.push(`p.employer_id = $1`);
      } else if (type === 'received') {
        whereConditions.push(`p.contractor_id = $1`);
      }
    }

    const whereClause = whereConditions.join(' AND ');

    const historyQuery = `
      SELECT 
        et.*,
        p.title as project_title,
        m.title as milestone_title,
        CASE 
          WHEN p.employer_id = $1 THEN 'sent'
          WHEN p.contractor_id = $1 THEN 'received'
        END as transaction_type,
        COUNT(*) OVER() as total_count
      FROM escrow_transactions et
      JOIN projects p ON et.project_id = p.id
      LEFT JOIN milestones m ON et.milestone_id = m.id
      WHERE ${whereClause}
      ORDER BY et.created_at DESC
      LIMIT $${++paramCount} OFFSET $${++paramCount}
    `;

    queryParams.push(Number(limit), offset);

    const historyResult = await query(historyQuery, queryParams);
    const totalCount = historyResult.rows.length > 0 ? historyResult.rows[0].total_count : 0;

    res.json({
      success: true,
      data: {
        transactions: historyResult.rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: Number(totalCount),
          totalPages: Math.ceil(Number(totalCount) / Number(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در دریافت تاریخچه پرداخت‌ها'
    });
  }
});

// Get payment statistics for user
router.get('/stats', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Get payment statistics
    const statsResult = await query(`
      SELECT 
        COUNT(CASE WHEN p.employer_id = $1 THEN 1 END) as total_payments_sent,
        COUNT(CASE WHEN p.contractor_id = $1 THEN 1 END) as total_payments_received,
        COALESCE(SUM(CASE WHEN p.employer_id = $1 AND et.status IN ('held', 'released') THEN et.amount END), 0) as total_amount_sent,
        COALESCE(SUM(CASE WHEN p.contractor_id = $1 AND et.status = 'released' THEN et.amount END), 0) as total_amount_received,
        COALESCE(SUM(CASE WHEN p.employer_id = $1 AND et.status = 'held' THEN et.amount END), 0) as total_amount_in_escrow
      FROM escrow_transactions et
      JOIN projects p ON et.project_id = p.id
      WHERE p.employer_id = $1 OR p.contractor_id = $1
    `, [req.user!.id]);

    // Get recent transactions
    const recentTransactionsResult = await query(`
      SELECT 
        et.*,
        p.title as project_title,
        m.title as milestone_title,
        CASE 
          WHEN p.employer_id = $1 THEN 'sent'
          WHEN p.contractor_id = $1 THEN 'received'
        END as transaction_type
      FROM escrow_transactions et
      JOIN projects p ON et.project_id = p.id
      LEFT JOIN milestones m ON et.milestone_id = m.id
      WHERE (p.employer_id = $1 OR p.contractor_id = $1)
      ORDER BY et.created_at DESC
      LIMIT 5
    `, [req.user!.id]);

    const stats = statsResult.rows[0];

    res.json({
      success: true,
      data: {
        statistics: {
          totalPaymentsSent: parseInt(stats.total_payments_sent),
          totalPaymentsReceived: parseInt(stats.total_payments_received),
          totalAmountSent: parseFloat(stats.total_amount_sent),
          totalAmountReceived: parseFloat(stats.total_amount_received),
          totalAmountInEscrow: parseFloat(stats.total_amount_in_escrow)
        },
        recentTransactions: recentTransactionsResult.rows
      }
    });

  } catch (error) {
    console.error('Get payment stats error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در دریافت آمار پرداخت‌ها'
    });
  }
});

export default router;
