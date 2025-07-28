import { Router, Response } from 'express';
import { body, param, query as queryValidator, validationResult } from 'express-validator';
import { authenticateToken, AuthenticatedRequest, requireAdmin } from '../middleware/auth';
import { query, executeTransaction } from "../database/query-wrapper"';
import { zarinpalService } from '../services/payment';

const router = Router();

// Get user wallet info
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Get or create wallet
    let walletResult = await query(
      'SELECT * FROM wallets WHERE user_id = $1',
      [req.user!.id]
    );

    if (walletResult.rows.length === 0) {
      // Create wallet if doesn't exist
      await query(
        'INSERT INTO wallets (user_id, balance, total_earned, total_spent) VALUES ($1, 0, 0, 0)',
        [req.user!.id]
      );
      
      walletResult = await query(
        'SELECT * FROM wallets WHERE user_id = $1',
        [req.user!.id]
      );
    }

    const wallet = walletResult.rows[0];

    // Get recent transactions
    const transactionsResult = await query(`
      SELECT 
        wt.*,
        CASE 
          WHEN wt.type IN ('deposit', 'earning') THEN '+'
          WHEN wt.type IN ('withdrawal', 'payment') THEN '-'
          ELSE ''
        END as transaction_sign
      FROM wallet_transactions wt
      WHERE wt.wallet_id = $1
      ORDER BY wt.created_at DESC
      LIMIT 20
    `, [wallet.id]);

    // Get pending withdrawals
    const pendingWithdrawalsResult = await query(`
      SELECT SUM(amount) as total_pending
      FROM wallet_transactions
      WHERE wallet_id = $1 AND type = 'withdrawal' AND status = 'pending'
    `, [wallet.id]);

    const totalPending = pendingWithdrawalsResult.rows[0].total_pending || 0;

    res.json({
      success: true,
      data: {
        wallet: {
          ...wallet,
          available_balance: parseFloat(wallet.balance) - parseFloat(totalPending),
          pending_withdrawals: parseFloat(totalPending)
        },
        transactions: transactionsResult.rows
      }
    });

  } catch (error) {
    console.error('Get wallet error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در دریافت اطلاعات کیف پول'
    });
  }
});

// Get wallet transactions with pagination
router.get('/transactions', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      status,
      startDate,
      endDate
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    
    // Get wallet ID
    const walletResult = await query(
      'SELECT id FROM wallets WHERE user_id = $1',
      [req.user!.id]
    );

    if (walletResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'کیف پول یافت نشد'
      });
    }

    const walletId = walletResult.rows[0].id;

    // Build query conditions
    let whereConditions = ['wt.wallet_id = $1'];
    let queryParams: any[] = [walletId];
    let paramCount = 1;

    if (type && type !== 'all') {
      whereConditions.push(`wt.type = $${++paramCount}`);
      queryParams.push(type);
    }

    if (status && status !== 'all') {
      whereConditions.push(`wt.status = $${++paramCount}`);
      queryParams.push(status);
    }

    if (startDate) {
      whereConditions.push(`wt.created_at >= $${++paramCount}`);
      queryParams.push(startDate);
    }

    if (endDate) {
      whereConditions.push(`wt.created_at <= $${++paramCount}`);
      queryParams.push(endDate);
    }

    const whereClause = whereConditions.join(' AND ');

    // Get transactions with count
    const transactionsQuery = `
      SELECT 
        wt.*,
        CASE 
          WHEN wt.type IN ('deposit', 'earning') THEN '+'
          WHEN wt.type IN ('withdrawal', 'payment') THEN '-'
          ELSE ''
        END as transaction_sign,
        COUNT(*) OVER() as total_count
      FROM wallet_transactions wt
      WHERE ${whereClause}
      ORDER BY wt.created_at DESC
      LIMIT $${++paramCount} OFFSET $${++paramCount}
    `;

    queryParams.push(Number(limit), offset);

    const transactionsResult = await query(transactionsQuery, queryParams);
    const totalCount = transactionsResult.rows.length > 0 ? transactionsResult.rows[0].total_count : 0;

    res.json({
      success: true,
      data: {
        transactions: transactionsResult.rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: Number(totalCount),
          totalPages: Math.ceil(Number(totalCount) / Number(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get wallet transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در دریافت تراکنش‌های کیف پول'
    });
  }
});

// Request deposit to wallet
router.post('/deposit', authenticateToken, [
  body('amount').isFloat({ min: 10000 }).withMessage('حداقل مبلغ واریز 10,000 ریال است')
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'مبلغ ورودی نامعتبر است',
        errors: errors.array()
      });
    }

    const { amount } = req.body;
    const callbackUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/wallet/verify-deposit`;

    // Create deposit payment request
    const paymentRequest = await zarinpalService.requestPayment({
      amount: parseFloat(amount),
      description: `افزایش موجودی کیف پول - کاربر ${req.user!.id}`,
      mobile: req.user!.phoneNumber,
      email: req.user!.email,
      callbackUrl
    });

    if (paymentRequest.success) {
      // Get or create wallet
      let walletResult = await query(
        'SELECT id FROM wallets WHERE user_id = $1',
        [req.user!.id]
      );

      if (walletResult.rows.length === 0) {
        await query(
          'INSERT INTO wallets (user_id, balance, total_earned, total_spent) VALUES ($1, 0, 0, 0)',
          [req.user!.id]
        );
        
        walletResult = await query(
          'SELECT id FROM wallets WHERE user_id = $1',
          [req.user!.id]
        );
      }

      const walletId = walletResult.rows[0].id;

      // Create pending deposit transaction
      await query(
        `INSERT INTO wallet_transactions (wallet_id, type, amount, description, reference_id, status, created_at)
         VALUES ($1, 'deposit', $2, $3, $4, 'pending', NOW())`,
        [
          walletId,
          parseFloat(amount),
          'افزایش موجودی کیف پول',
          paymentRequest.authority
        ]
      );

      res.json({
        success: true,
        message: 'درخواست واریز ایجاد شد',
        data: {
          paymentUrl: paymentRequest.paymentUrl,
          authority: paymentRequest.authority,
          amount: parseFloat(amount)
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: paymentRequest.message
      });
    }

  } catch (error) {
    console.error('Wallet deposit error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در ایجاد درخواست واریز'
    });
  }
});

// Verify deposit payment
router.post('/verify-deposit', authenticateToken, [
  body('Authority').notEmpty().withMessage('کد Authority الزامی است'),
  body('Status').equals('OK').withMessage('پرداخت تایید نشده است')
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { Authority, Status } = req.body;

    if (Status !== 'OK') {
      return res.status(400).json({
        success: false,
        message: 'پرداخت لغو شده یا ناموفق بوده است'
      });
    }

    // Get pending transaction
    const transactionResult = await query(`
      SELECT wt.*, w.user_id
      FROM wallet_transactions wt
      JOIN wallets w ON wt.wallet_id = w.id
      WHERE wt.reference_id = $1 AND wt.type = 'deposit' AND wt.status = 'pending' AND w.user_id = $2
    `, [Authority, req.user!.id]);

    if (transactionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'تراکنش یافت نشد'
      });
    }

    const transaction = transactionResult.rows[0];

    // Verify payment with ZarinPal
    const verification = await zarinpalService.verifyPayment(Authority, transaction.amount);

    if (verification.success) {
      // Update transaction and wallet in a transaction
      const queries = [
        {
          text: `UPDATE wallet_transactions 
                 SET status = 'completed', updated_at = NOW() 
                 WHERE id = $1`,
          params: [transaction.id]
        },
        {
          text: `UPDATE wallets 
                 SET balance = balance + $1, updated_at = NOW() 
                 WHERE id = $2`,
          params: [transaction.amount, transaction.wallet_id]
        }
      ];

      await executeTransaction(queries);

      res.json({
        success: true,
        message: 'واریز با موفقیت انجام شد',
        data: {
          amount: transaction.amount,
          refId: verification.refId
        }
      });
    } else {
      // Mark transaction as failed
      await query(
        'UPDATE wallet_transactions SET status = \'failed\', updated_at = NOW() WHERE id = $1',
        [transaction.id]
      );

      res.status(400).json({
        success: false,
        message: verification.message
      });
    }

  } catch (error) {
    console.error('Verify deposit error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در تایید واریز'
    });
  }
});

// Request withdrawal from wallet
router.post('/withdraw', authenticateToken, [
  body('amount').isFloat({ min: 50000 }).withMessage('حداقل مبلغ برداشت 50,000 ریال است'),
  body('bankAccount').notEmpty().withMessage('شماره حساب الزامی است'),
  body('accountHolder').notEmpty().withMessage('نام صاحب حساب الزامی است')
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

    const { amount, bankAccount, accountHolder, description } = req.body;

    // Get wallet
    const walletResult = await query(
      'SELECT * FROM wallets WHERE user_id = $1',
      [req.user!.id]
    );

    if (walletResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'کیف پول یافت نشد'
      });
    }

    const wallet = walletResult.rows[0];

    // Check if user has enough balance
    if (parseFloat(wallet.balance) < parseFloat(amount)) {
      return res.status(400).json({
        success: false,
        message: 'موجودی کافی در کیف پول ندارید'
      });
    }

    // Create withdrawal request
    await query(
      `INSERT INTO wallet_transactions (
         wallet_id, type, amount, description, status, created_at,
         data
       ) VALUES ($1, 'withdrawal', $2, $3, 'pending', NOW(), $4)`,
      [
        wallet.id,
        parseFloat(amount),
        description || 'درخواست برداشت',
        JSON.stringify({
          bankAccount,
          accountHolder,
          requestedBy: req.user!.id,
          requestedAt: new Date().toISOString()
        })
      ]
    );

    // Send notification to admin
    await query(
      `INSERT INTO notifications (user_id, title, message, type, data, created_at)
       SELECT u.id, $1, $2, 'withdrawal', $3, NOW()
       FROM users u
       WHERE u.role = 'admin'`,
      [
        'درخواست برداشت جدید',
        `درخواست برداشت ${amount} ریال از کاربر ${req.user!.firstName} ${req.user!.lastName}`,
        JSON.stringify({
          userId: req.user!.id,
          amount: parseFloat(amount),
          bankAccount,
          accountHolder
        })
      ]
    );

    res.status(201).json({
      success: true,
      message: 'درخواست برداشت ثبت شد و در انتظار تایید مدیر است',
      data: {
        amount: parseFloat(amount),
        bankAccount,
        accountHolder
      }
    });

  } catch (error) {
    console.error('Wallet withdrawal error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در ثبت درخواست برداشت'
    });
  }
});

// Get pending withdrawals (admin only)
router.get('/withdrawals', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, status = 'pending' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const withdrawalsQuery = `
      SELECT 
        wt.*,
        u.first_name,
        u.last_name,
        u.email,
        u.phone_number,
        w.balance as current_balance,
        COUNT(*) OVER() as total_count
      FROM wallet_transactions wt
      JOIN wallets w ON wt.wallet_id = w.id
      JOIN users u ON w.user_id = u.id
      WHERE wt.type = 'withdrawal' AND wt.status = $1
      ORDER BY wt.created_at ASC
      LIMIT $2 OFFSET $3
    `;

    const withdrawalsResult = await query(withdrawalsQuery, [status, Number(limit), offset]);
    const totalCount = withdrawalsResult.rows.length > 0 ? withdrawalsResult.rows[0].total_count : 0;

    res.json({
      success: true,
      data: {
        withdrawals: withdrawalsResult.rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: Number(totalCount),
          totalPages: Math.ceil(Number(totalCount) / Number(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get withdrawals error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در دریافت درخواست‌های برداشت'
    });
  }
});

// Approve or reject withdrawal (admin only)
router.patch('/withdrawals/:id', authenticateToken, requireAdmin, [
  param('id').isInt(),
  body('action').isIn(['approve', 'reject']).withMessage('عمل نامعتبر است'),
  body('adminNote').optional().isString()
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

    const { id } = req.params;
    const { action, adminNote } = req.body;

    // Get withdrawal request
    const withdrawalResult = await query(`
      SELECT wt.*, w.user_id, w.balance, u.first_name, u.last_name
      FROM wallet_transactions wt
      JOIN wallets w ON wt.wallet_id = w.id
      JOIN users u ON w.user_id = u.id
      WHERE wt.id = $1 AND wt.type = 'withdrawal' AND wt.status = 'pending'
    `, [id]);

    if (withdrawalResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'درخواست برداشت یافت نشد'
      });
    }

    const withdrawal = withdrawalResult.rows[0];

    if (action === 'approve') {
      // Check if user still has enough balance
      if (parseFloat(withdrawal.balance) < parseFloat(withdrawal.amount)) {
        return res.status(400).json({
          success: false,
          message: 'موجودی کافی در کیف پول کاربر موجود نیست'
        });
      }

      // Update transaction and wallet balance
      const queries = [
        {
          text: `UPDATE wallet_transactions 
                 SET status = 'completed', updated_at = NOW(),
                     data = jsonb_set(COALESCE(data, '{}'), '{adminNote}', $1)
                 WHERE id = $2`,
          params: [JSON.stringify(adminNote || ''), id]
        },
        {
          text: `UPDATE wallets 
                 SET balance = balance - $1, total_spent = total_spent + $1, updated_at = NOW() 
                 WHERE id = $2`,
          params: [withdrawal.amount, withdrawal.wallet_id]
        }
      ];

      await executeTransaction(queries);

      // Send notification to user
      await query(
        `INSERT INTO notifications (user_id, title, message, type, data, created_at)
         VALUES ($1, $2, $3, 'withdrawal', $4, NOW())`,
        [
          withdrawal.user_id,
          'درخواست برداشت تایید شد',
          `درخواست برداشت ${withdrawal.amount} ریال شما تایید و پردازش شد`,
          JSON.stringify({ amount: withdrawal.amount, adminNote })
        ]
      );

      res.json({
        success: true,
        message: 'درخواست برداشت تایید شد'
      });

    } else { // reject
      // Update transaction status
      await query(
        `UPDATE wallet_transactions 
         SET status = 'cancelled', updated_at = NOW(),
             data = jsonb_set(COALESCE(data, '{}'), '{adminNote}', $1)
         WHERE id = $2`,
        [JSON.stringify(adminNote || ''), id]
      );

      // Send notification to user
      await query(
        `INSERT INTO notifications (user_id, title, message, type, data, created_at)
         VALUES ($1, $2, $3, 'withdrawal', $4, NOW())`,
        [
          withdrawal.user_id,
          'درخواست برداشت رد شد',
          `درخواست برداشت ${withdrawal.amount} ریال شما رد ش��`,
          JSON.stringify({ amount: withdrawal.amount, adminNote })
        ]
      );

      res.json({
        success: true,
        message: 'درخواست برداشت رد شد'
      });
    }

  } catch (error) {
    console.error('Process withdrawal error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در پردازش درخواست برداشت'
    });
  }
});

export default router;
