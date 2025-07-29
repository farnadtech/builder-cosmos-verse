import { Router, Response } from 'express';
import { param, validationResult } from 'express-validator';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { query } from "../database/query-wrapper";

const router = Router();

// Get user notifications
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      type = 'all',
      read = 'all'
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    let whereConditions = ['user_id = $1'];
    let queryParams: any[] = [req.user!.userId];
    let paramCount = 1;

    if (type !== 'all') {
      whereConditions.push(`type = $${++paramCount}`);
      queryParams.push(type);
    }

    if (read === 'unread') {
      whereConditions.push('is_read = false');
    } else if (read === 'read') {
      whereConditions.push('is_read = true');
    }

    const whereClause = whereConditions.join(' AND ');

    const notificationsQuery = `
      SELECT 
        id,
        title,
        message,
        type,
        is_read,
        data,
        created_at,
        COUNT(*) OVER() as total_count
      FROM notifications
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${++paramCount} OFFSET $${++paramCount}
    `;

    queryParams.push(Number(limit), offset);

    const notificationsResult = await query(notificationsQuery, queryParams);
    const totalCount = notificationsResult.rows.length > 0 ? notificationsResult.rows[0].total_count : 0;

    // Get unread count
    const unreadCountResult = await query(
      'SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = $1 AND is_read = false',
      [req.user!.id]
    );

    res.json({
      success: true,
      data: {
        notifications: notificationsResult.rows,
        unreadCount: parseInt(unreadCountResult.rows[0].unread_count),
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: Number(totalCount),
          totalPages: Math.ceil(Number(totalCount) / Number(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در دریافت اعلان‌ها'
    });
  }
});

// Mark notification as read
router.patch('/:id/read', authenticateToken, [
  param('id').isInt()
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'شناسه اعلان نامعت��ر است'
      });
    }

    const { id } = req.params;

    // Update notification
    const updateResult = await query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user!.id]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'اعلان یافت نشد'
      });
    }

    res.json({
      success: true,
      message: 'اعلان به عنوان خوانده شده علامت‌گذاری شد'
    });

  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در علامت‌گذاری اعلان'
    });
  }
});

// Mark all notifications as read
router.patch('/mark-all-read', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updateResult = await query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
      [req.user!.id]
    );

    res.json({
      success: true,
      message: 'تمام اعلان‌ها به عنوان خوانده شده علامت‌گذاری شدند',
      data: {
        updatedCount: updateResult.rowCount
      }
    });

  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در علامت‌گذاری اعلان‌ها'
    });
  }
});

// Delete notification
router.delete('/:id', authenticateToken, [
  param('id').isInt()
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'شناسه اعلان نامعتبر است'
      });
    }

    const { id } = req.params;

    const deleteResult = await query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user!.id]
    );

    if (deleteResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'اعلان یافت نشد'
      });
    }

    res.json({
      success: true,
      message: 'اعلان حذف شد'
    });

  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در حذف اعلان'
    });
  }
});

// Delete all read notifications
router.delete('/read/all', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const deleteResult = await query(
      'DELETE FROM notifications WHERE user_id = $1 AND is_read = true',
      [req.user!.id]
    );

    res.json({
      success: true,
      message: 'تمام اعلان‌های خوانده شده حذف شدند',
      data: {
        deletedCount: deleteResult.rowCount
      }
    });

  } catch (error) {
    console.error('Delete read notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در حذف اعلان‌های خوانده شده'
    });
  }
});

// Get notification statistics
router.get('/stats', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const statsResult = await query(`
      SELECT 
        COUNT(*) as total_notifications,
        COUNT(CASE WHEN is_read = false THEN 1 END) as unread_count,
        COUNT(CASE WHEN type = 'message' THEN 1 END) as message_notifications,
        COUNT(CASE WHEN type = 'payment' THEN 1 END) as payment_notifications,
        COUNT(CASE WHEN type = 'project' THEN 1 END) as project_notifications,
        COUNT(CASE WHEN type = 'arbitration' THEN 1 END) as arbitration_notifications,
        COUNT(CASE WHEN type = 'contract' THEN 1 END) as contract_notifications,
        COUNT(CASE WHEN type = 'wallet' THEN 1 END) as wallet_notifications,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as last_week_count,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as last_month_count
      FROM notifications
      WHERE user_id = $1
    `, [req.user!.id]);

    const stats = statsResult.rows[0];

    res.json({
      success: true,
      data: {
        total: parseInt(stats.total_notifications),
        unread: parseInt(stats.unread_count),
        byType: {
          message: parseInt(stats.message_notifications),
          payment: parseInt(stats.payment_notifications),
          project: parseInt(stats.project_notifications),
          arbitration: parseInt(stats.arbitration_notifications),
          contract: parseInt(stats.contract_notifications),
          wallet: parseInt(stats.wallet_notifications)
        },
        byPeriod: {
          lastWeek: parseInt(stats.last_week_count),
          lastMonth: parseInt(stats.last_month_count)
        }
      }
    });

  } catch (error) {
    console.error('Get notification stats error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در دریافت آمار اعلان‌ها'
    });
  }
});

// Create notification (internal use, for admin or system)
router.post('/create', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Only admin can create notifications
    if (req.user!.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'دسترسی کافی ندارید'
      });
    }

    const { userId, title, message, type, data } = req.body;

    if (!userId || !title || !message || !type) {
      return res.status(400).json({
        success: false,
        message: 'فیلدهای الزامی مشخص نشده است'
      });
    }

    const notificationResult = await query(
      `INSERT INTO notifications (user_id, title, message, type, data, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING id`,
      [userId, title, message, type, data ? JSON.stringify(data) : null]
    );

    res.status(201).json({
      success: true,
      message: 'اعلان ایجاد شد',
      data: {
        notificationId: notificationResult.rows[0].id
      }
    });

  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در ایجاد اعلان'
    });
  }
});

// Broadcast notification to all users (admin only)
router.post('/broadcast', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Only admin can broadcast notifications
    if (req.user!.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'دسترسی کافی ندارید'
      });
    }

    const { title, message, type, targetRole, data } = req.body;

    if (!title || !message || !type) {
      return res.status(400).json({
        success: false,
        message: 'فیلدهای الزامی مشخص نشده است'
      });
    }

    let userQuery = 'SELECT id FROM users WHERE is_active = true';
    const queryParams: any[] = [];

    if (targetRole && targetRole !== 'all') {
      userQuery += ' AND role = $1';
      queryParams.push(targetRole);
    }

    const usersResult = await query(userQuery, queryParams);

    // Create notification for each user
    const notifications = usersResult.rows.map(user => ({
      user_id: user.id,
      title,
      message,
      type,
      data: data ? JSON.stringify(data) : null
    }));

    // Bulk insert notifications
    if (notifications.length > 0) {
      const values = notifications.map((_, index) => 
        `($${index * 5 + 1}, $${index * 5 + 2}, $${index * 5 + 3}, $${index * 5 + 4}, $${index * 5 + 5}, NOW())`
      ).join(', ');

      const flatParams = notifications.flatMap(n => [n.user_id, n.title, n.message, n.type, n.data]);

      await query(
        `INSERT INTO notifications (user_id, title, message, type, data, created_at) VALUES ${values}`,
        flatParams
      );
    }

    res.status(201).json({
      success: true,
      message: 'اعلان برای همه کاربران ارسال شد',
      data: {
        sentCount: notifications.length,
        targetRole: targetRole || 'all'
      }
    });

  } catch (error) {
    console.error('Broadcast notification error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در ارسال اعلان عمومی'
    });
  }
});

export default router;
