import { Router, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authenticateToken, AuthenticatedRequest, requireAdmin } from '../middleware/auth';
import { query, executeTransaction } from "../database/query-wrapper";
import bcrypt from 'bcryptjs';

const router = Router();

// All admin routes require admin role
router.use(authenticateToken, requireAdmin);

// Get dashboard statistics
router.get('/dashboard', async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Get user statistics
    const userStatsResult = await query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN role = 'employer' THEN 1 END) as total_employers,
        COUNT(CASE WHEN role = 'contractor' THEN 1 END) as total_contractors,
        COUNT(CASE WHEN role = 'arbitrator' THEN 1 END) as total_arbitrators,
        COUNT(CASE WHEN is_verified = true THEN 1 END) as verified_users,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_users_30_days
      FROM users
      WHERE role != 'admin'
    `);

    // Get project statistics
    const projectStatsResult = await query(`
      SELECT 
        COUNT(*) as total_projects,
        COUNT(CASE WHEN status = 'open' THEN 1 END) as open_projects,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_projects,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_projects,
        COUNT(CASE WHEN status = 'disputed' THEN 1 END) as disputed_projects,
        AVG(budget) as average_budget,
        SUM(budget) as total_project_value
      FROM projects
    `);

    // Get financial statistics
    const financialStatsResult = await query(`
      SELECT 
        COUNT(*) as total_transactions,
        COUNT(CASE WHEN status = 'held' THEN 1 END) as held_transactions,
        COUNT(CASE WHEN status = 'released' THEN 1 END) as released_transactions,
        SUM(CASE WHEN status = 'held' THEN amount END) as total_held_amount,
        SUM(CASE WHEN status = 'released' THEN amount END) as total_released_amount,
        SUM(amount) as total_transaction_volume
      FROM escrow_transactions
    `);

    // Get arbitration statistics
    const arbitrationStatsResult = await query(`
      SELECT 
        COUNT(*) as total_arbitrations,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_arbitrations,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_arbitrations,
        AVG(EXTRACT(DAYS FROM (resolved_at - created_at))) as avg_resolution_days
      FROM arbitrations
    `);

    // Get recent activities
    const recentActivitiesResult = await query(`
      (SELECT 'user_registered' as type, u.first_name || ' ' || u.last_name as description, u.created_at as date
       FROM users u WHERE u.role != 'admin' ORDER BY u.created_at DESC LIMIT 5)
      UNION ALL
      (SELECT 'project_created' as type, p.title as description, p.created_at as date
       FROM projects p ORDER BY p.created_at DESC LIMIT 5)
      UNION ALL
      (SELECT 'payment_completed' as type, 'Payment of ' || et.amount || ' IRR' as description, et.payment_date as date
       FROM escrow_transactions et WHERE et.status = 'released' AND et.payment_date IS NOT NULL 
       ORDER BY et.payment_date DESC LIMIT 5)
      ORDER BY date DESC LIMIT 15
    `);

    const userStats = userStatsResult.rows[0];
    const projectStats = projectStatsResult.rows[0];
    const financialStats = financialStatsResult.rows[0];
    const arbitrationStats = arbitrationStatsResult.rows[0];

    res.json({
      success: true,
      data: {
        users: {
          total: parseInt(userStats.total_users),
          employers: parseInt(userStats.total_employers),
          contractors: parseInt(userStats.total_contractors),
          arbitrators: parseInt(userStats.total_arbitrators),
          verified: parseInt(userStats.verified_users),
          active: parseInt(userStats.active_users),
          newLast30Days: parseInt(userStats.new_users_30_days)
        },
        projects: {
          total: parseInt(projectStats.total_projects),
          open: parseInt(projectStats.open_projects),
          inProgress: parseInt(projectStats.in_progress_projects),
          completed: parseInt(projectStats.completed_projects),
          disputed: parseInt(projectStats.disputed_projects),
          averageBudget: parseFloat(projectStats.average_budget) || 0,
          totalValue: parseFloat(projectStats.total_project_value) || 0
        },
        financial: {
          totalTransactions: parseInt(financialStats.total_transactions),
          heldTransactions: parseInt(financialStats.held_transactions),
          releasedTransactions: parseInt(financialStats.released_transactions),
          totalHeldAmount: parseFloat(financialStats.total_held_amount) || 0,
          totalReleasedAmount: parseFloat(financialStats.total_released_amount) || 0,
          totalVolume: parseFloat(financialStats.total_transaction_volume) || 0
        },
        arbitration: {
          total: parseInt(arbitrationStats.total_arbitrations),
          pending: parseInt(arbitrationStats.pending_arbitrations),
          resolved: parseInt(arbitrationStats.resolved_arbitrations),
          avgResolutionDays: parseFloat(arbitrationStats.avg_resolution_days) || 0
        },
        recentActivities: recentActivitiesResult.rows
      }
    });

  } catch (error) {
    console.error('Get admin dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در دریافت آمار داشبورد'
    });
  }
});

// Get all users with filtering and pagination
router.get('/users', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      role,
      status,
      search,
      verified
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    let whereConditions: string[] = ["role != 'admin'"];
    let queryParams: any[] = [];
    let paramCount = 0;

    if (role && role !== 'all') {
      whereConditions.push(`role = $${++paramCount}`);
      queryParams.push(role);
    }

    if (status && status !== 'all') {
      if (status === 'active') {
        whereConditions.push(`is_active = true`);
      } else if (status === 'inactive') {
        whereConditions.push(`is_active = false`);
      }
    }

    if (verified && verified !== 'all') {
      if (verified === 'verified') {
        whereConditions.push(`is_verified = true`);
      } else if (verified === 'unverified') {
        whereConditions.push(`is_verified = false`);
      }
    }

    if (search) {
      whereConditions.push(`(first_name ILIKE $${++paramCount} OR last_name ILIKE $${++paramCount} OR email ILIKE $${++paramCount} OR phone_number ILIKE $${++paramCount})`);
      queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
      paramCount += 3; // We added 4 parameters but increment by 3 more
    }

    const whereClause = whereConditions.join(' AND ');

    const usersQuery = `
      SELECT 
        id, first_name, last_name, email, phone_number, role, 
        is_verified, is_active, created_at,
        COUNT(*) OVER() as total_count
      FROM users
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${++paramCount} OFFSET $${++paramCount}
    `;

    queryParams.push(Number(limit), offset);

    const usersResult = await query(usersQuery, queryParams);
    const totalCount = usersResult.rows.length > 0 ? usersResult.rows[0].total_count : 0;

    res.json({
      success: true,
      data: {
        users: usersResult.rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: Number(totalCount),
          totalPages: Math.ceil(Number(totalCount) / Number(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get admin users error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در دریافت لیست کاربران'
    });
  }
});

// Get user details
router.get('/users/:id', [
  param('id').isInt()
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'شناسه کاربر نامعتبر است'
      });
    }

    const { id } = req.params;

    // Get user details
    const userResult = await query(
      `SELECT id, first_name, last_name, email, phone_number, role, 
              is_verified, is_active, profile_image, national_id, 
              birth_date, address, created_at
       FROM users WHERE id = $1`,
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'کاربر یافت نشد'
      });
    }

    const user = userResult.rows[0];

    // Get user statistics
    let userStats = {};

    if (user.role === 'employer') {
      const statsResult = await query(`
        SELECT 
          COUNT(*) as total_projects,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_projects,
          SUM(budget) as total_spent
        FROM projects WHERE employer_id = $1
      `, [id]);
      userStats = statsResult.rows[0];
    } else if (user.role === 'contractor') {
      const statsResult = await query(`
        SELECT 
          COUNT(*) as total_projects,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_projects,
          SUM(et.amount) as total_earned
        FROM projects p
        LEFT JOIN escrow_transactions et ON p.id = et.project_id AND et.status = 'released'
        WHERE p.contractor_id = $1
      `, [id]);
      userStats = statsResult.rows[0];
    } else if (user.role === 'arbitrator') {
      const statsResult = await query(`
        SELECT 
          COUNT(*) as total_cases,
          COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_cases,
          AVG(ar.rating) as average_rating
        FROM arbitrations a
        LEFT JOIN arbitrator_ratings ar ON a.id = ar.arbitration_id
        WHERE a.arbitrator_id = $1
      `, [id]);
      userStats = statsResult.rows[0];
    }

    // Get recent activities
    const activitiesResult = await query(`
      (SELECT 'project_created' as type, title as description, created_at as date
       FROM projects WHERE employer_id = $1
       ORDER BY created_at DESC LIMIT 5)
      UNION ALL
      (SELECT 'project_assigned' as type, title as description, updated_at as date
       FROM projects WHERE contractor_id = $1
       ORDER BY updated_at DESC LIMIT 5)
      ORDER BY date DESC LIMIT 10
    `, [id, id]);

    res.json({
      success: true,
      data: {
        user,
        statistics: userStats,
        recentActivities: activitiesResult.rows
      }
    });

  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در دریافت جزئیات کاربر'
    });
  }
});

// Update user status (activate/deactivate)
router.patch('/users/:id/status', [
  param('id').isInt(),
  body('isActive').isBoolean().withMessage('وضعیت فعال بودن نامعتبر است')
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
    const { isActive } = req.body;

    // Prevent admin from deactivating themselves
    if (parseInt(id) === req.user!.id) {
      return res.status(400).json({
        success: false,
        message: 'نمی‌توانید حساب خود را غیرفعال کنید'
      });
    }

    // Update user status
    const updateResult = await query(
      'UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2 AND role != \'admin\' RETURNING first_name, last_name',
      [isActive, id]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'کاربر یافت نشد'
      });
    }

    const user = updateResult.rows[0];

    res.json({
      success: true,
      message: `حساب کاربری ${user.first_name} ${user.last_name} ${isActive ? 'فعال' : 'غیرفعال'} شد`
    });

  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در به‌روزرسانی وضعیت کاربر'
    });
  }
});

// Create new arbitrator
router.post('/arbitrators', [
  body('firstName').trim().isLength({ min: 2, max: 50 }).withMessage('نام باید بین 2 تا 50 کاراکتر باشد'),
  body('lastName').trim().isLength({ min: 2, max: 50 }).withMessage('نام خانوادگی باید بین 2 تا 50 کاراکتر باشد'),
  body('email').isEmail().withMessage('فرمت ایمیل صحیح نیست').normalizeEmail(),
  body('phoneNumber').matches(/^(\+98|0)?9\d{9}$/).withMessage('شماره موبایل صحیح نیست'),
  body('password').isLength({ min: 8 }).withMessage('رمز عبور باید حداقل 8 کاراکتر باشد'),
  body('specialty').optional().trim().isLength({ max: 200 }).withMessage('تخصص نباید بیش از 200 کاراکتر باشد')
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

    const { firstName, lastName, email, phoneNumber, password, specialty } = req.body;

    // Normalize phone number
    const normalizedPhone = phoneNumber.replace(/^(\+98|0)/, '+98');

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1 OR phone_number = $2',
      [email, normalizedPhone]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'کاربری با این ایمیل یا شماره موبایل قبلاً ثبت نام کرده است'
      });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create arbitrator
    const userResult = await query(
      `INSERT INTO users (
         first_name, last_name, email, phone_number, password_hash, 
         role, is_verified, is_active, created_at
       ) VALUES ($1, $2, $3, $4, $5, 'arbitrator', true, true, NOW())
       RETURNING id, email`,
      [firstName, lastName, email, normalizedPhone, passwordHash]
    );

    const user = userResult.rows[0];

    // Create wallet for arbitrator
    await query(
      'INSERT INTO wallets (user_id, balance, total_earned, total_spent) VALUES ($1, 0, 0, 0)',
      [user.id]
    );

    res.status(201).json({
      success: true,
      message: 'حساب داور با موفقیت ایجاد شد',
      data: {
        userId: user.id,
        firstName,
        lastName,
        email: user.email,
        phoneNumber: normalizedPhone,
        role: 'arbitrator'
      }
    });

  } catch (error) {
    console.error('Create arbitrator error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در ایجاد حساب داور'
    });
  }
});

// Get all projects with admin view
router.get('/projects', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      search
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    let whereConditions: string[] = [];
    let queryParams: any[] = [];
    let paramCount = 0;

    if (status && status !== 'all') {
      whereConditions.push(`p.status = $${++paramCount}`);
      queryParams.push(status);
    }

    if (search) {
      whereConditions.push(`(p.title ILIKE $${++paramCount} OR p.description ILIKE $${++paramCount})`);
      queryParams.push(`%${search}%`, `%${search}%`);
      paramCount++;
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    const projectsQuery = `
      SELECT 
        p.*,
        e.first_name as employer_first_name,
        e.last_name as employer_last_name,
        c.first_name as contractor_first_name,
        c.last_name as contractor_last_name,
        COUNT(*) OVER() as total_count
      FROM projects p
      LEFT JOIN users e ON p.employer_id = e.id
      LEFT JOIN users c ON p.contractor_id = c.id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $${++paramCount} OFFSET $${++paramCount}
    `;

    queryParams.push(Number(limit), offset);

    const projectsResult = await query(projectsQuery, queryParams);
    const totalCount = projectsResult.rows.length > 0 ? projectsResult.rows[0].total_count : 0;

    res.json({
      success: true,
      data: {
        projects: projectsResult.rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: Number(totalCount),
          totalPages: Math.ceil(Number(totalCount) / Number(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get admin projects error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در دریافت لیست پروژه‌ها'
    });
  }
});

// Get system settings
router.get('/settings', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const settingsResult = await query(
      'SELECT key, value, description FROM system_settings ORDER BY key'
    );

    const settings: { [key: string]: any } = {};
    settingsResult.rows.forEach(row => {
      settings[row.key] = {
        value: row.value,
        description: row.description
      };
    });

    res.json({
      success: true,
      data: { settings }
    });

  } catch (error) {
    console.error('Get system settings error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در دریافت تنظیمات سیستم'
    });
  }
});

// Update system settings
router.patch('/settings', [
  body('settings').isObject().withMessage('تنظیمات باید آبجکت باشد')
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

    const { settings } = req.body;

    // Update each setting
    for (const [key, value] of Object.entries(settings)) {
      await query(
        'UPDATE system_settings SET value = $1, updated_at = NOW() WHERE key = $2',
        [value, key]
      );
    }

    res.json({
      success: true,
      message: 'تنظیمات ��یستم به‌روزرسانی شد'
    });

  } catch (error) {
    console.error('Update system settings error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در به‌روزرسانی تنظیمات سیستم'
    });
  }
});

// Get audit logs
router.get('/logs', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      page = 1,
      limit = 50,
      action,
      userId
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    let whereConditions: string[] = [];
    let queryParams: any[] = [];
    let paramCount = 0;

    if (action && action !== 'all') {
      whereConditions.push(`action = $${++paramCount}`);
      queryParams.push(action);
    }

    if (userId) {
      whereConditions.push(`user_id = $${++paramCount}`);
      queryParams.push(userId);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    const logsQuery = `
      SELECT 
        al.*,
        u.first_name,
        u.last_name,
        COUNT(*) OVER() as total_count
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT $${++paramCount} OFFSET $${++paramCount}
    `;

    queryParams.push(Number(limit), offset);

    const logsResult = await query(logsQuery, queryParams);
    const totalCount = logsResult.rows.length > 0 ? logsResult.rows[0].total_count : 0;

    res.json({
      success: true,
      data: {
        logs: logsResult.rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: Number(totalCount),
          totalPages: Math.ceil(Number(totalCount) / Number(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در دریافت گزارش‌های سیستم'
    });
  }
});

export default router;
