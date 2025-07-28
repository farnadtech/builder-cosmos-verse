import { Router, Response } from 'express';
import { param, validationResult } from 'express-validator';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { query } from "../database/query-wrapper";
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Configure multer for general file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const purpose = req.body.purpose || 'general';
    const uploadDir = `uploads/${purpose}`;
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const purpose = req.body.purpose || 'general';
    cb(null, `${purpose}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', // Images
      '.pdf', '.doc', '.docx', '.txt', '.rtf', // Documents
      '.zip', '.rar', '.7z', '.tar', '.gz', // Archives
      '.mp3', '.wav', '.mp4', '.avi', '.mov', // Media
      '.xls', '.xlsx', '.ppt', '.pptx', // Office
      '.csv', '.json', '.xml' // Data
    ];
    
    const fileExt = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error('فرمت فایل مجاز نیست'));
    }
  }
});

// Upload single file
router.post('/single', authenticateToken, upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'فایل ارسالی یافت نشد'
      });
    }

    const { purpose, referenceId, description } = req.body;

    // Store file info in database
    const uploadResult = await query(
      `INSERT INTO uploads (
         user_id, original_name, file_path, file_size, mime_type, 
         purpose, reference_id, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING id`,
      [
        req.user!.id,
        req.file.originalname,
        req.file.path,
        req.file.size,
        req.file.mimetype,
        purpose || 'general',
        referenceId || null
      ]
    );

    res.status(201).json({
      success: true,
      message: 'فایل با موفقیت آپلود شد',
      data: {
        uploadId: uploadResult.rows[0].id,
        fileName: req.file.originalname,
        filePath: req.file.path,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        purpose: purpose || 'general'
      }
    });

  } catch (error) {
    console.error('File upload error:', error);
    
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: 'خطا در آپلود فایل'
    });
  }
});

// Upload multiple files
router.post('/multiple', authenticateToken, upload.array('files', 10), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'فایل‌های ارسالی یافت نشد'
      });
    }

    const { purpose, referenceId } = req.body;
    const uploadedFiles = [];

    // Store each file info in database
    for (const file of files) {
      const uploadResult = await query(
        `INSERT INTO uploads (
           user_id, original_name, file_path, file_size, mime_type, 
           purpose, reference_id, created_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         RETURNING id`,
        [
          req.user!.id,
          file.originalname,
          file.path,
          file.size,
          file.mimetype,
          purpose || 'general',
          referenceId || null
        ]
      );

      uploadedFiles.push({
        uploadId: uploadResult.rows[0].id,
        fileName: file.originalname,
        filePath: file.path,
        fileSize: file.size,
        mimeType: file.mimetype
      });
    }

    res.status(201).json({
      success: true,
      message: `${files.length} فایل با موفقیت آپلود شد`,
      data: {
        uploadedFiles,
        totalCount: files.length,
        purpose: purpose || 'general'
      }
    });

  } catch (error) {
    console.error('Multiple file upload error:', error);
    
    // Clean up uploaded files on error
    const files = req.files as Express.Multer.File[];
    if (files) {
      files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }

    res.status(500).json({
      success: false,
      message: 'خطا در آپلود فایل‌ها'
    });
  }
});

// Get user's uploaded files
router.get('/list', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      purpose,
      search
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    let whereConditions = ['user_id = $1'];
    let queryParams: any[] = [req.user!.id];
    let paramCount = 1;

    if (purpose && purpose !== 'all') {
      whereConditions.push(`purpose = $${++paramCount}`);
      queryParams.push(purpose);
    }

    if (search) {
      whereConditions.push(`original_name ILIKE $${++paramCount}`);
      queryParams.push(`%${search}%`);
    }

    const whereClause = whereConditions.join(' AND ');

    const filesQuery = `
      SELECT 
        id,
        original_name,
        file_size,
        mime_type,
        purpose,
        reference_id,
        created_at,
        COUNT(*) OVER() as total_count
      FROM uploads
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${++paramCount} OFFSET $${++paramCount}
    `;

    queryParams.push(Number(limit), offset);

    const filesResult = await query(filesQuery, queryParams);
    const totalCount = filesResult.rows.length > 0 ? filesResult.rows[0].total_count : 0;

    res.json({
      success: true,
      data: {
        files: filesResult.rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: Number(totalCount),
          totalPages: Math.ceil(Number(totalCount) / Number(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get user files error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در دریافت لیست فایل‌ها'
    });
  }
});

// Download file
router.get('/download/:fileId', authenticateToken, [
  param('fileId').isInt()
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'شناسه فایل نامعتبر است'
      });
    }

    const { fileId } = req.params;

    // Get file info
    const fileResult = await query(
      'SELECT * FROM uploads WHERE id = $1',
      [fileId]
    );

    if (fileResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'فایل یافت نشد'
      });
    }

    const fileInfo = fileResult.rows[0];

    // Check file access permissions
    let hasAccess = fileInfo.user_id === req.user!.id || req.user!.role === 'admin';

    // Additional access checks based on purpose
    if (!hasAccess && fileInfo.purpose === 'project' && fileInfo.reference_id) {
      // Check if user has access to the project
      const projectAccess = await query(
        'SELECT id FROM projects WHERE id = $1 AND (employer_id = $2 OR contractor_id = $2)',
        [fileInfo.reference_id, req.user!.id]
      );
      hasAccess = projectAccess.rows.length > 0;
    }

    if (!hasAccess && fileInfo.purpose === 'chat' && fileInfo.reference_id) {
      // Check if user has access to the chat message's project
      const chatAccess = await query(`
        SELECT p.id FROM chat_messages cm
        JOIN projects p ON cm.project_id = p.id
        WHERE cm.id = $1 AND (p.employer_id = $2 OR p.contractor_id = $2)
      `, [fileInfo.reference_id, req.user!.id]);
      hasAccess = chatAccess.rows.length > 0;
    }

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'دسترسی به این فایل ندارید'
      });
    }

    // Check if file exists on disk
    if (!fs.existsSync(fileInfo.file_path)) {
      return res.status(404).json({
        success: false,
        message: 'فایل در سرور یافت نشد'
      });
    }

    // Set appropriate headers for download
    res.setHeader('Content-Disposition', `attachment; filename="${fileInfo.original_name}"`);
    res.setHeader('Content-Type', fileInfo.mime_type || 'application/octet-stream');
    res.setHeader('Content-Length', fileInfo.file_size);

    // Stream file to response
    const fileStream = fs.createReadStream(fileInfo.file_path);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Download file error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در دانلود فایل'
    });
  }
});

// Delete file
router.delete('/:fileId', authenticateToken, [
  param('fileId').isInt()
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'شناسه فایل نامعتبر است'
      });
    }

    const { fileId } = req.params;

    // Get file info
    const fileResult = await query(
      'SELECT * FROM uploads WHERE id = $1',
      [fileId]
    );

    if (fileResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'فایل یافت نشد'
      });
    }

    const fileInfo = fileResult.rows[0];

    // Check delete permissions (only file owner or admin can delete)
    if (fileInfo.user_id !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'دسترسی به حذف این فایل ندارید'
      });
    }

    // Delete file from database
    await query('DELETE FROM uploads WHERE id = $1', [fileId]);

    // Delete file from disk
    if (fs.existsSync(fileInfo.file_path)) {
      fs.unlinkSync(fileInfo.file_path);
    }

    res.json({
      success: true,
      message: 'فایل با موفقیت حذف شد'
    });

  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در حذف فایل'
    });
  }
});

// Get file info (without downloading)
router.get('/info/:fileId', authenticateToken, [
  param('fileId').isInt()
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'شناسه فایل نامعتبر است'
      });
    }

    const { fileId } = req.params;

    // Get file info with uploader details
    const fileResult = await query(`
      SELECT 
        u.*,
        usr.first_name as uploader_first_name,
        usr.last_name as uploader_last_name
      FROM uploads u
      JOIN users usr ON u.user_id = usr.id
      WHERE u.id = $1
    `, [fileId]);

    if (fileResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'فایل یافت نشد'
      });
    }

    const fileInfo = fileResult.rows[0];

    // Check access permissions (same as download)
    let hasAccess = fileInfo.user_id === req.user!.id || req.user!.role === 'admin';

    if (!hasAccess && fileInfo.purpose === 'project' && fileInfo.reference_id) {
      const projectAccess = await query(
        'SELECT id FROM projects WHERE id = $1 AND (employer_id = $2 OR contractor_id = $2)',
        [fileInfo.reference_id, req.user!.id]
      );
      hasAccess = projectAccess.rows.length > 0;
    }

    if (!hasAccess && fileInfo.purpose === 'chat' && fileInfo.reference_id) {
      const chatAccess = await query(`
        SELECT p.id FROM chat_messages cm
        JOIN projects p ON cm.project_id = p.id
        WHERE cm.id = $1 AND (p.employer_id = $2 OR p.contractor_id = $2)
      `, [fileInfo.reference_id, req.user!.id]);
      hasAccess = chatAccess.rows.length > 0;
    }

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'دسترسی به این فایل ندارید'
      });
    }

    res.json({
      success: true,
      data: {
        id: fileInfo.id,
        originalName: fileInfo.original_name,
        fileSize: fileInfo.file_size,
        mimeType: fileInfo.mime_type,
        purpose: fileInfo.purpose,
        referenceId: fileInfo.reference_id,
        uploadedAt: fileInfo.created_at,
        uploader: {
          firstName: fileInfo.uploader_first_name,
          lastName: fileInfo.uploader_last_name
        },
        exists: fs.existsSync(fileInfo.file_path)
      }
    });

  } catch (error) {
    console.error('Get file info error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در دریافت اطلاعات فایل'
    });
  }
});

export default router;
