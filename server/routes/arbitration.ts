import { Router, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authenticateToken, AuthenticatedRequest, requireArbitrator } from '../middleware/auth';
import { query, executeTransaction } from "../database/query-wrapper"';

const router = Router();

// Create arbitration request
router.post('/', authenticateToken, [
  body('projectId').isInt().withMessage('شناسه پروژه نامعتبر است'),
  body('reason').trim().isLength({ min: 20, max: 1000 }).withMessage('دلیل درخواست داوری باید بین 20 تا 1000 کاراکتر باشد')
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

    const { projectId, reason } = req.body;

    // Check if user has access to this project
    const projectResult = await query(
      'SELECT id, title, employer_id, contractor_id, status FROM projects WHERE id = $1',
      [projectId]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'پروژه یافت نشد'
      });
    }

    const project = projectResult.rows[0];
    const hasAccess = project.employer_id === req.user!.id || project.contractor_id === req.user!.id;

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'دسترسی به این پروژه ندارید'
      });
    }

    // Check if project can be disputed
    if (!['in_progress', 'completed'].includes(project.status)) {
      return res.status(400).json({
        success: false,
        message: 'وضعیت پروژه اجازه درخواست داوری نمی‌دهد'
      });
    }

    // Check if arbitration already exists
    const existingArbitration = await query(
      'SELECT id FROM arbitrations WHERE project_id = $1 AND status != \'resolved\'',
      [projectId]
    );

    if (existingArbitration.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'درخواست داوری فعال برای این پروژه وجود دارد'
      });
    }

    // Create arbitration request
    const arbitrationResult = await query(
      `INSERT INTO arbitrations (project_id, initiator_id, reason, status, created_at)
       VALUES ($1, $2, $3, 'pending', NOW())
       RETURNING id`,
      [projectId, req.user!.id, reason]
    );

    // Update project status to disputed
    await query(
      'UPDATE projects SET status = \'disputed\', updated_at = NOW() WHERE id = $1',
      [projectId]
    );

    // Send notification to other party and admins
    const otherUserId = project.employer_id === req.user!.id ? project.contractor_id : project.employer_id;
    
    await query(
      `INSERT INTO notifications (user_id, title, message, type, data, created_at)
       VALUES ($1, $2, $3, 'arbitration', $4, NOW())`,
      [
        otherUserId,
        'درخواست داوری جدید',
        `درخواست ��اوری برای پروژه "${project.title}" ثبت شد`,
        JSON.stringify({
          projectId,
          arbitrationId: arbitrationResult.rows[0].id,
          initiatorId: req.user!.id
        })
      ]
    );

    // Notify all arbitrators
    await query(
      `INSERT INTO notifications (user_id, title, message, type, data, created_at)
       SELECT u.id, $1, $2, 'arbitration', $3, NOW()
       FROM users u
       WHERE u.role = 'arbitrator' AND u.is_active = true`,
      [
        'پرونده داوری جدید',
        `پرونده داوری جدید برای پروژه "${project.title}" در انتظار تخصیص`,
        JSON.stringify({
          projectId,
          arbitrationId: arbitrationResult.rows[0].id
        })
      ]
    );

    res.status(201).json({
      success: true,
      message: 'درخواست داوری با موفقیت ثبت شد',
      data: {
        arbitrationId: arbitrationResult.rows[0].id,
        projectId,
        status: 'pending'
      }
    });

  } catch (error) {
    console.error('Create arbitration error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در ثبت درخواست داوری'
    });
  }
});

// Get arbitration cases (for arbitrators)
router.get('/cases', authenticateToken, requireArbitrator, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status = 'all',
      assignedToMe = 'false'
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    let whereConditions: string[] = [];
    let queryParams: any[] = [];
    let paramCount = 0;

    // Filter by status
    if (status !== 'all') {
      whereConditions.push(`a.status = $${++paramCount}`);
      queryParams.push(status);
    }

    // Filter by assigned arbitrator
    if (assignedToMe === 'true') {
      whereConditions.push(`a.arbitrator_id = $${++paramCount}`);
      queryParams.push(req.user!.id);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    const casesQuery = `
      SELECT 
        a.*,
        p.title as project_title,
        p.budget as project_budget,
        e.first_name as employer_first_name,
        e.last_name as employer_last_name,
        c.first_name as contractor_first_name,
        c.last_name as contractor_last_name,
        i.first_name as initiator_first_name,
        i.last_name as initiator_last_name,
        ar.first_name as arbitrator_first_name,
        ar.last_name as arbitrator_last_name,
        COUNT(*) OVER() as total_count
      FROM arbitrations a
      JOIN projects p ON a.project_id = p.id
      JOIN users e ON p.employer_id = e.id
      JOIN users c ON p.contractor_id = c.id
      JOIN users i ON a.initiator_id = i.id
      LEFT JOIN users ar ON a.arbitrator_id = ar.id
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT $${++paramCount} OFFSET $${++paramCount}
    `;

    queryParams.push(Number(limit), offset);

    const casesResult = await query(casesQuery, queryParams);
    const totalCount = casesResult.rows.length > 0 ? casesResult.rows[0].total_count : 0;

    res.json({
      success: true,
      data: {
        cases: casesResult.rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: Number(totalCount),
          totalPages: Math.ceil(Number(totalCount) / Number(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get arbitration cases error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در دریافت پرونده‌های داوری'
    });
  }
});

// Get single arbitration case details
router.get('/:id', authenticateToken, [
  param('id').isInt()
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'شناسه پرونده نامعتبر است'
      });
    }

    const { id } = req.params;

    // Get arbitration case with all related info
    const caseResult = await query(`
      SELECT 
        a.*,
        p.title as project_title,
        p.description as project_description,
        p.budget as project_budget,
        p.deadline as project_deadline,
        p.attachment_path as project_attachment,
        e.first_name as employer_first_name,
        e.last_name as employer_last_name,
        e.email as employer_email,
        e.phone_number as employer_phone,
        c.first_name as contractor_first_name,
        c.last_name as contractor_last_name,
        c.email as contractor_email,
        c.phone_number as contractor_phone,
        i.first_name as initiator_first_name,
        i.last_name as initiator_last_name,
        ar.first_name as arbitrator_first_name,
        ar.last_name as arbitrator_last_name
      FROM arbitrations a
      JOIN projects p ON a.project_id = p.id
      JOIN users e ON p.employer_id = e.id
      JOIN users c ON p.contractor_id = c.id
      JOIN users i ON a.initiator_id = i.id
      LEFT JOIN users ar ON a.arbitrator_id = ar.id
      WHERE a.id = $1
    `, [id]);

    if (caseResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'پرونده داوری یافت نشد'
      });
    }

    const arbitrationCase = caseResult.rows[0];

    // Check access permissions
    const hasAccess = req.user!.role === 'admin' || 
                     req.user!.role === 'arbitrator' ||
                     arbitrationCase.employer_id === req.user!.id ||
                     arbitrationCase.contractor_id === req.user!.id;

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'دسترسی به این پرونده ندارید'
      });
    }

    // Get project milestones with payment info
    const milestonesResult = await query(`
      SELECT 
        m.*,
        et.status as payment_status,
        et.amount as paid_amount,
        et.zarinpal_ref_id
      FROM milestones m
      LEFT JOIN escrow_transactions et ON m.id = et.milestone_id
      WHERE m.project_id = $1
      ORDER BY m.order_index
    `, [arbitrationCase.project_id]);

    // Get chat messages related to this project
    const chatResult = await query(`
      SELECT 
        cm.*,
        u.first_name,
        u.last_name,
        u.role
      FROM chat_messages cm
      JOIN users u ON cm.sender_id = u.id
      WHERE cm.project_id = $1
      ORDER BY cm.created_at DESC
      LIMIT 50
    `, [arbitrationCase.project_id]);

    res.json({
      success: true,
      data: {
        arbitration: arbitrationCase,
        milestones: milestonesResult.rows,
        chatMessages: chatResult.rows.reverse()
      }
    });

  } catch (error) {
    console.error('Get arbitration case error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در دریافت جزئیات پرونده داوری'
    });
  }
});

// Assign arbitrator to case (admin or self-assign by arbitrator)
router.patch('/:id/assign', authenticateToken, [
  param('id').isInt(),
  body('arbitratorId').optional().isInt()
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
    const { arbitratorId } = req.body;

    // Get arbitration case
    const caseResult = await query(
      'SELECT * FROM arbitrations WHERE id = $1 AND status = \'pending\'',
      [id]
    );

    if (caseResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'پرونده داوری یافت نشد یا قابل تخصیص نیست'
      });
    }

    let finalArbitratorId: number;

    if (req.user!.role === 'admin') {
      // Admin can assign any arbitrator
      if (!arbitratorId) {
        return res.status(400).json({
          success: false,
          message: 'شناسه داور الزامی است'
        });
      }

      // Verify arbitrator exists and is active
      const arbitratorResult = await query(
        'SELECT id FROM users WHERE id = $1 AND role = \'arbitrator\' AND is_active = true',
        [arbitratorId]
      );

      if (arbitratorResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'داور انتخاب شده نامعتبر است'
        });
      }

      finalArbitratorId = arbitratorId;
    } else if (req.user!.role === 'arbitrator') {
      // Arbitrator can self-assign
      finalArbitratorId = req.user!.id;
    } else {
      return res.status(403).json({
        success: false,
        message: 'دسترسی کافی ندارید'
      });
    }

    // Assign arbitrator
    await query(
      'UPDATE arbitrations SET arbitrator_id = $1, status = \'assigned\', updated_at = NOW() WHERE id = $2',
      [finalArbitratorId, id]
    );

    // Send notifications
    const arbitrationCase = caseResult.rows[0];
    
    // Get project info for notifications
    const projectResult = await query(
      'SELECT title, employer_id, contractor_id FROM projects WHERE id = $1',
      [arbitrationCase.project_id]
    );

    if (projectResult.rows.length > 0) {
      const project = projectResult.rows[0];

      // Notify employer and contractor
      const userIds = [project.employer_id, project.contractor_id];
      
      for (const userId of userIds) {
        await query(
          `INSERT INTO notifications (user_id, title, message, type, data, created_at)
           VALUES ($1, $2, $3, 'arbitration', $4, NOW())`,
          [
            userId,
            'داور تخصیص یافت',
            `داور برای پرونده داوری پروژه "${project.title}" تخصیص یافت`,
            JSON.stringify({
              arbitrationId: parseInt(id),
              arbitratorId: finalArbitratorId,
              projectId: arbitrationCase.project_id
            })
          ]
        );
      }
    }

    res.json({
      success: true,
      message: 'داو�� با موفقیت تخصیص یافت'
    });

  } catch (error) {
    console.error('Assign arbitrator error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در تخصیص داور'
    });
  }
});

// Submit arbitration decision (arbitrator only)
router.patch('/:id/decision', authenticateToken, requireArbitrator, [
  param('id').isInt(),
  body('decision').isIn(['contractor', 'employer', 'split']).withMessage('تصمیم نامعتبر است'),
  body('resolution').trim().isLength({ min: 50, max: 2000 }).withMessage('توضیحات تصمیم باید بین 50 تا 2000 کاراکتر باشد'),
  body('contractorPercentage').optional().isFloat({ min: 0, max: 100 }).withMessage('درصد مجری نامعتبر است')
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
    const { decision, resolution, contractorPercentage } = req.body;

    // Validate split decision
    if (decision === 'split' && (contractorPercentage === undefined || contractorPercentage < 0 || contractorPercentage > 100)) {
      return res.status(400).json({
        success: false,
        message: 'برای تصمیم تقسیمی، درصد مجری باید مشخص شود'
      });
    }

    // Get arbitration case assigned to this arbitrator
    const caseResult = await query(`
      SELECT a.*, p.title as project_title, p.employer_id, p.contractor_id
      FROM arbitrations a
      JOIN projects p ON a.project_id = p.id
      WHERE a.id = $1 AND a.arbitrator_id = $2 AND a.status = 'assigned'
    `, [id, req.user!.id]);

    if (caseResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'پرونده داوری یافت نشد یا به شما تخصیص نیافته است'
      });
    }

    const arbitrationCase = caseResult.rows[0];

    // Update arbitration with decision
    await query(
      `UPDATE arbitrations 
       SET decision = $1, resolution = $2, contractor_percentage = $3, 
           status = 'resolved', resolved_at = NOW(), updated_at = NOW()
       WHERE id = $4`,
      [decision, resolution, decision === 'split' ? contractorPercentage : null, id]
    );

    // Update project status
    await query(
      'UPDATE projects SET status = \'completed\', updated_at = NOW() WHERE id = $1',
      [arbitrationCase.project_id]
    );

    // Handle escrow transactions based on decision
    await this.processArbitrationDecision(arbitrationCase.project_id, decision, contractorPercentage);

    // Send notifications to involved parties
    const userIds = [arbitrationCase.employer_id, arbitrationCase.contractor_id];
    
    for (const userId of userIds) {
      await query(
        `INSERT INTO notifications (user_id, title, message, type, data, created_at)
         VALUES ($1, $2, $3, 'arbitration', $4, NOW())`,
        [
          userId,
          'رأی داوری صادر شد',
          `رأی نهایی برای پرونده داوری پروژه "${arbitrationCase.project_title}" صادر شد`,
          JSON.stringify({
            arbitrationId: parseInt(id),
            decision,
            contractorPercentage: contractorPercentage || null,
            projectId: arbitrationCase.project_id
          })
        ]
      );
    }

    res.json({
      success: true,
      message: 'رأی داوری با موفقیت ثبت شد',
      data: {
        decision,
        contractorPercentage: contractorPercentage || null,
        resolution
      }
    });

  } catch (error) {
    console.error('Submit arbitration decision error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در ثبت رأی داوری'
    });
  }
});

// Process arbitration decision for escrow transactions
async function processArbitrationDecision(projectId: number, decision: string, contractorPercentage?: number) {
  try {
    // Get all held escrow transactions for this project
    const transactionsResult = await query(
      'SELECT * FROM escrow_transactions WHERE project_id = $1 AND status = \'held\'',
      [projectId]
    );

    for (const transaction of transactionsResult.rows) {
      const amount = parseFloat(transaction.amount);
      
      if (decision === 'contractor') {
        // Release full amount to contractor
        await releaseToContractor(transaction.id, amount);
      } else if (decision === 'employer') {
        // Refund full amount to employer
        await refundToEmployer(transaction.id, amount);
      } else if (decision === 'split' && contractorPercentage !== undefined) {
        // Split amount between contractor and employer
        const contractorAmount = amount * (contractorPercentage / 100);
        const employerAmount = amount - contractorAmount;
        
        if (contractorAmount > 0) {
          await releaseToContractor(transaction.id, contractorAmount);
        }
        if (employerAmount > 0) {
          await refundToEmployer(transaction.id, employerAmount, true);
        }
        
        // Update transaction status
        await query(
          'UPDATE escrow_transactions SET status = \'split\', release_date = NOW() WHERE id = $1',
          [transaction.id]
        );
      }
    }
  } catch (error) {
    console.error('Process arbitration decision error:', error);
    throw error;
  }
}

// Helper function to release amount to contractor
async function releaseToContractor(transactionId: number, amount: number) {
  const transactionResult = await query(
    'SELECT contractor_id FROM escrow_transactions WHERE id = $1',
    [transactionId]
  );
  
  if (transactionResult.rows.length > 0) {
    const contractorId = transactionResult.rows[0].contractor_id;
    
    // Add to contractor wallet
    await addToWallet(contractorId, amount, 'earning', `آزادسازی وجه بر اساس رأی داور - تراکنش #${transactionId}`);
    
    // Update transaction
    await query(
      'UPDATE escrow_transactions SET status = \'released\', release_date = NOW() WHERE id = $1',
      [transactionId]
    );
  }
}

// Helper function to refund amount to employer
async function refundToEmployer(transactionId: number, amount: number, isSplit: boolean = false) {
  const transactionResult = await query(
    'SELECT employer_id FROM escrow_transactions WHERE id = $1',
    [transactionId]
  );
  
  if (transactionResult.rows.length > 0) {
    const employerId = transactionResult.rows[0].employer_id;
    
    // Add to employer wallet
    await addToWallet(employerId, amount, 'refund', `بازگشت وجه بر اساس رأی داور - تراکنش #${transactionId}`);
    
    if (!isSplit) {
      // Update transaction
      await query(
        'UPDATE escrow_transactions SET status = \'refunded\', release_date = NOW() WHERE id = $1',
        [transactionId]
      );
    }
  }
}

// Helper function to add amount to wallet
async function addToWallet(userId: number, amount: number, type: string, description: string) {
  // Get or create wallet
  let walletResult = await query('SELECT id FROM wallets WHERE user_id = $1', [userId]);
  
  let walletId: number;
  if (walletResult.rows.length === 0) {
    const newWalletResult = await query(
      'INSERT INTO wallets (user_id, balance, total_earned) VALUES ($1, $2, $3) RETURNING id',
      [userId, amount, type === 'earning' ? amount : 0]
    );
    walletId = newWalletResult.rows[0].id;
  } else {
    walletId = walletResult.rows[0].id;
    
    // Update wallet balance
    await query(
      `UPDATE wallets 
       SET balance = balance + $1, 
           total_earned = total_earned + $2
       WHERE id = $3`,
      [amount, type === 'earning' ? amount : 0, walletId]
    );
  }

  // Add wallet transaction
  await query(
    `INSERT INTO wallet_transactions (wallet_id, type, amount, description, status)
     VALUES ($1, $2, $3, $4, 'completed')`,
    [walletId, type, amount, description]
  );
}

// Rate arbitrator (after case is resolved)
router.post('/:id/rate', authenticateToken, [
  param('id').isInt(),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('امتیاز باید بین 1 تا 5 باشد'),
  body('feedback').optional().trim().isLength({ max: 500 }).withMessage('نظر نباید بیش از 500 کاراکتر باشد')
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
    const { rating, feedback } = req.body;

    // Get resolved arbitration case
    const caseResult = await query(`
      SELECT a.*, p.employer_id, p.contractor_id
      FROM arbitrations a
      JOIN projects p ON a.project_id = p.id
      WHERE a.id = $1 AND a.status = 'resolved' AND a.arbitrator_id IS NOT NULL
    `, [id]);

    if (caseResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'پرونده داوری یافت نشد یا هنوز حل نشده است'
      });
    }

    const arbitrationCase = caseResult.rows[0];

    // Check if user was involved in this case
    if (arbitrationCase.employer_id !== req.user!.id && arbitrationCase.contractor_id !== req.user!.id) {
      return res.status(403).json({
        success: false,
        message: 'شما در این پرونده دخیل نبوده‌اید'
      });
    }

    // Check if already rated
    const existingRating = await query(
      'SELECT id FROM arbitrator_ratings WHERE arbitration_id = $1 AND rater_id = $2',
      [id, req.user!.id]
    );

    if (existingRating.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'قبلاً به این داور امتیاز داده‌اید'
      });
    }

    // Submit rating
    await query(
      `INSERT INTO arbitrator_ratings (arbitration_id, rater_id, arbitrator_id, rating, feedback, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [id, req.user!.id, arbitrationCase.arbitrator_id, rating, feedback || null]
    );

    res.status(201).json({
      success: true,
      message: 'امتیاز شما ثبت شد'
    });

  } catch (error) {
    console.error('Rate arbitrator error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در ثبت امتیاز'
    });
  }
});

export default router;
