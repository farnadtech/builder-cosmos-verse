import { Router, Response } from 'express';
import { body, param, query as queryValidator, validationResult } from 'express-validator';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { query } from "../database/query-wrapper"';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Configure multer for chat file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/chat';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `chat-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB limit for chat files
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx', '.txt', '.zip', '.rar'];
    const fileExt = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error('فرمت فایل مجاز نیست'));
    }
  }
});

// Get chat messages for a project
router.get('/project/:projectId', authenticateToken, [
  param('projectId').isInt()
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'شناسه پروژه نامعتبر است'
      });
    }

    const { projectId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // Check if user has access to this project
    const projectResult = await query(
      'SELECT employer_id, contractor_id FROM projects WHERE id = $1',
      [projectId]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'پروژه یافت نشد'
      });
    }

    const project = projectResult.rows[0];
    const hasAccess = req.user!.role === 'admin' || 
                     project.employer_id === req.user!.id || 
                     project.contractor_id === req.user!.id;

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'دسترسی به چت این پروژه ندارید'
      });
    }

    // Get chat messages with sender info
    const messagesQuery = `
      SELECT 
        cm.*,
        u.first_name,
        u.last_name,
        u.role,
        COUNT(*) OVER() as total_count
      FROM chat_messages cm
      JOIN users u ON cm.sender_id = u.id
      WHERE cm.project_id = $1
      ORDER BY cm.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const messagesResult = await query(messagesQuery, [projectId, Number(limit), offset]);

    // Mark messages as read for current user
    await query(
      `UPDATE chat_messages 
       SET is_read = true 
       WHERE project_id = $1 AND sender_id != $2 AND is_read = false`,
      [projectId, req.user!.id]
    );

    const totalCount = messagesResult.rows.length > 0 ? messagesResult.rows[0].total_count : 0;

    res.json({
      success: true,
      data: {
        messages: messagesResult.rows.reverse(), // Reverse to show oldest first
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: Number(totalCount),
          totalPages: Math.ceil(Number(totalCount) / Number(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get chat messages error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در دریافت پیام‌های چت'
    });
  }
});

// Send text message
router.post('/project/:projectId/message', authenticateToken, [
  param('projectId').isInt(),
  body('message').trim().isLength({ min: 1, max: 2000 }).withMessage('متن پیام باید بین 1 تا 2000 کاراکتر باشد')
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

    const { projectId } = req.params;
    const { message } = req.body;

    // Check if user has access to this project
    const projectResult = await query(
      'SELECT employer_id, contractor_id, title FROM projects WHERE id = $1',
      [projectId]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'پروژه یافت نشد'
      });
    }

    const project = projectResult.rows[0];
    const hasAccess = req.user!.role === 'admin' || 
                     project.employer_id === req.user!.id || 
                     project.contractor_id === req.user!.id;

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'دسترسی به چت این پروژه ندارید'
      });
    }

    // Insert message
    const messageResult = await query(
      `INSERT INTO chat_messages (project_id, sender_id, message, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id, created_at`,
      [projectId, req.user!.id, message]
    );

    // Send notification to other party
    const otherUserId = project.employer_id === req.user!.id ? project.contractor_id : project.employer_id;
    
    if (otherUserId) {
      await query(
        `INSERT INTO notifications (user_id, title, message, type, data, created_at)
         VALUES ($1, $2, $3, 'message', $4, NOW())`,
        [
          otherUserId,
          'پیام جدید در پروژه',
          `پیام جدیدی در پروژه "${project.title}" دریافت شد`,
          JSON.stringify({
            projectId: parseInt(projectId),
            senderId: req.user!.id,
            senderName: `${req.user!.firstName} ${req.user!.lastName}`,
            messagePreview: message.substring(0, 100)
          })
        ]
      );
    }

    res.status(201).json({
      success: true,
      message: 'پیام ارسال شد',
      data: {
        id: messageResult.rows[0].id,
        message,
        createdAt: messageResult.rows[0].created_at,
        sender: {
          id: req.user!.id,
          firstName: req.user!.firstName,
          lastName: req.user!.lastName,
          role: req.user!.role
        }
      }
    });

  } catch (error) {
    console.error('Send chat message error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در ارسال پیام'
    });
  }
});

// Send file attachment
router.post('/project/:projectId/file', authenticateToken, upload.single('file'), [
  param('projectId').isInt()
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'شناسه پروژه نامعتبر است'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'فایل ارسالی یافت نشد'
      });
    }

    const { projectId } = req.params;
    const { description } = req.body;

    // Check if user has access to this project
    const projectResult = await query(
      'SELECT employer_id, contractor_id, title FROM projects WHERE id = $1',
      [projectId]
    );

    if (projectResult.rows.length === 0) {
      // Clean up uploaded file
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({
        success: false,
        message: 'پروژه یافت نشد'
      });
    }

    const project = projectResult.rows[0];
    const hasAccess = req.user!.role === 'admin' || 
                     project.employer_id === req.user!.id || 
                     project.contractor_id === req.user!.id;

    if (!hasAccess) {
      // Clean up uploaded file
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(403).json({
        success: false,
        message: 'دسترسی به چت این پروژه ندارید'
      });
    }

    // Insert message with file attachment
    const messageResult = await query(
      `INSERT INTO chat_messages (
         project_id, sender_id, message, attachment_path, attachment_type, created_at
       ) VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING id, created_at`,
      [
        projectId,
        req.user!.id,
        description || `فایل ارسال شد: ${req.file.originalname}`,
        req.file.path,
        req.file.mimetype
      ]
    );

    // Store file info
    await query(
      `INSERT INTO uploads (
         user_id, original_name, file_path, file_size, mime_type, purpose, reference_id, created_at
       ) VALUES ($1, $2, $3, $4, $5, 'chat', $6, NOW())`,
      [
        req.user!.id,
        req.file.originalname,
        req.file.path,
        req.file.size,
        req.file.mimetype,
        messageResult.rows[0].id
      ]
    );

    // Send notification to other party
    const otherUserId = project.employer_id === req.user!.id ? project.contractor_id : project.employer_id;
    
    if (otherUserId) {
      await query(
        `INSERT INTO notifications (user_id, title, message, type, data, created_at)
         VALUES ($1, $2, $3, 'message', $4, NOW())`,
        [
          otherUserId,
          'فایل جدید در پروژه',
          `فایل جدیدی در پروژه "${project.title}" ارسال ش��`,
          JSON.stringify({
            projectId: parseInt(projectId),
            senderId: req.user!.id,
            senderName: `${req.user!.firstName} ${req.user!.lastName}`,
            fileName: req.file.originalname
          })
        ]
      );
    }

    res.status(201).json({
      success: true,
      message: 'فایل با موفقیت ارسال شد',
      data: {
        id: messageResult.rows[0].id,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        fileType: req.file.mimetype,
        description: description || `فایل ارسال شد: ${req.file.originalname}`,
        createdAt: messageResult.rows[0].created_at,
        sender: {
          id: req.user!.id,
          firstName: req.user!.firstName,
          lastName: req.user!.lastName,
          role: req.user!.role
        }
      }
    });

  } catch (error) {
    console.error('Send chat file error:', error);
    
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: 'خطا در ارسال فایل'
    });
  }
});

// Download chat file
router.get('/file/:messageId', authenticateToken, [
  param('messageId').isInt()
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'شناسه پیام نامعتبر است'
      });
    }

    const { messageId } = req.params;

    // Get message with project info
    const messageResult = await query(`
      SELECT 
        cm.*,
        p.employer_id,
        p.contractor_id,
        u.original_name
      FROM chat_messages cm
      JOIN projects p ON cm.project_id = p.id
      LEFT JOIN uploads u ON u.reference_id = cm.id AND u.purpose = 'chat'
      WHERE cm.id = $1 AND cm.attachment_path IS NOT NULL
    `, [messageId]);

    if (messageResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'فایل یافت نشد'
      });
    }

    const message = messageResult.rows[0];

    // Check access
    const hasAccess = req.user!.role === 'admin' || 
                     message.employer_id === req.user!.id || 
                     message.contractor_id === req.user!.id;

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'دسترسی به این فایل ندارید'
      });
    }

    // Check if file exists
    if (!fs.existsSync(message.attachment_path)) {
      return res.status(404).json({
        success: false,
        message: 'فایل در سرور یافت نشد'
      });
    }

    // Set appropriate headers for download
    const fileName = message.original_name || path.basename(message.attachment_path);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', message.attachment_type || 'application/octet-stream');

    // Stream file to response
    const fileStream = fs.createReadStream(message.attachment_path);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Download chat file error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در دانلود فایل'
    });
  }
});

// Get unread message count for user
router.get('/unread-count', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Get count of unread messages in user's projects
    const unreadCountResult = await query(`
      SELECT COUNT(*) as unread_count
      FROM chat_messages cm
      JOIN projects p ON cm.project_id = p.id
      WHERE (p.employer_id = $1 OR p.contractor_id = $1)
        AND cm.sender_id != $1
        AND cm.is_read = false
    `, [req.user!.id]);

    // Get unread count per project
    const projectsUnreadResult = await query(`
      SELECT 
        p.id as project_id,
        p.title,
        COUNT(cm.id) as unread_count,
        MAX(cm.created_at) as last_message_date
      FROM projects p
      LEFT JOIN chat_messages cm ON p.id = cm.project_id 
        AND cm.sender_id != $1 
        AND cm.is_read = false
      WHERE (p.employer_id = $1 OR p.contractor_id = $1)
      GROUP BY p.id, p.title
      HAVING COUNT(cm.id) > 0
      ORDER BY MAX(cm.created_at) DESC
    `, [req.user!.id]);

    res.json({
      success: true,
      data: {
        totalUnread: parseInt(unreadCountResult.rows[0].unread_count),
        projectsUnread: projectsUnreadResult.rows
      }
    });

  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در دریافت تعداد پیام‌های خوانده نشده'
    });
  }
});

// Mark messages as read
router.patch('/project/:projectId/mark-read', authenticateToken, [
  param('projectId').isInt()
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'شناسه پروژه نامعتبر است'
      });
    }

    const { projectId } = req.params;

    // Check project access
    const projectResult = await query(
      'SELECT employer_id, contractor_id FROM projects WHERE id = $1',
      [projectId]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'پروژه یافت نشد'
      });
    }

    const project = projectResult.rows[0];
    const hasAccess = req.user!.role === 'admin' || 
                     project.employer_id === req.user!.id || 
                     project.contractor_id === req.user!.id;

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'دسترسی به این پروژه ندارید'
      });
    }

    // Mark messages as read
    const updateResult = await query(
      `UPDATE chat_messages 
       SET is_read = true 
       WHERE project_id = $1 AND sender_id != $2 AND is_read = false`,
      [projectId, req.user!.id]
    );

    res.json({
      success: true,
      message: 'پیام‌ها به عنوان خوانده شده علامت‌گذاری شدند',
      data: {
        markedCount: updateResult.rowCount
      }
    });

  } catch (error) {
    console.error('Mark messages as read error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در علامت‌گذاری پیام‌ها'
    });
  }
});

export default router;
