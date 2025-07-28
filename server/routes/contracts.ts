import { Router, Response } from 'express';
import { param, body, validationResult } from 'express-validator';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { query } from '../database/connection';
import { contractService } from '../services/contract';
import fs from 'fs';

const router = Router();

// Generate contract for project
router.post('/generate/:projectId', authenticateToken, [
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

    // Check if user has access to this project
    const projectResult = await query(
      'SELECT employer_id, contractor_id, status FROM projects WHERE id = $1',
      [projectId]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'پروژه یافت نشد'
      });
    }

    const project = projectResult.rows[0];
    
    // Only employer or contractor can generate contract
    const hasAccess = project.employer_id === req.user!.id || 
                     project.contractor_id === req.user!.id ||
                     req.user!.role === 'admin';

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'دسترسی به این پروژه ندارید'
      });
    }

    // Project must be assigned to generate contract
    if (!project.contractor_id) {
      return res.status(400).json({
        success: false,
        message: 'برای تولید قرارداد ابتدا باید مجری انتخاب شود'
      });
    }

    // Generate contract
    const result = await contractService.createProjectContract(parseInt(projectId));

    if (result.success) {
      res.status(201).json({
        success: true,
        message: result.message,
        data: {
          contractNumber: result.contractNumber,
          projectId: parseInt(projectId)
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }

  } catch (error) {
    console.error('Generate contract error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در تولید قرارداد'
    });
  }
});

// Get project contract
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

    // Get contract info
    const contractResult = await query(`
      SELECT 
        c.*,
        p.employer_id,
        p.contractor_id,
        p.title as project_title
      FROM contracts c
      JOIN projects p ON c.project_id = p.id
      WHERE c.project_id = $1
    `, [projectId]);

    if (contractResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'قرارداد برای این پروژه یافت ن��د'
      });
    }

    const contract = contractResult.rows[0];

    // Check access permission
    const hasAccess = contract.employer_id === req.user!.id || 
                     contract.contractor_id === req.user!.id ||
                     req.user!.role === 'admin';

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'دسترسی به این قرارداد ندارید'
      });
    }

    res.json({
      success: true,
      data: {
        contractId: contract.id,
        contractNumber: contract.contract_number,
        projectId: contract.project_id,
        projectTitle: contract.project_title,
        employerSigned: contract.employer_signed,
        contractorSigned: contract.contractor_signed,
        employerSignatureDate: contract.employer_signature_date,
        contractorSignatureDate: contract.contractor_signature_date,
        createdAt: contract.created_at,
        isFullySigned: contract.employer_signed && contract.contractor_signed
      }
    });

  } catch (error) {
    console.error('Get project contract error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در دریافت اطلاعات قرارداد'
    });
  }
});

// Sign contract
router.post('/:contractId/sign', authenticateToken, [
  param('contractId').isInt(),
  body('role').isIn(['employer', 'contractor']).withMessage('نقش نامعتبر است')
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

    const { contractId } = req.params;
    const { role } = req.body;

    // Verify user role matches the signing role
    if ((role === 'employer' && req.user!.role !== 'employer') ||
        (role === 'contractor' && req.user!.role !== 'contractor')) {
      return res.status(400).json({
        success: false,
        message: 'نقش کاربری شما با نقش امضاکننده مطابقت ندارد'
      });
    }

    const result = await contractService.signContract(
      parseInt(contractId),
      req.user!.id,
      role
    );

    if (result.success) {
      // Check if contract is now fully signed
      const contractResult = await query(
        'SELECT employer_signed, contractor_signed, project_id FROM contracts WHERE id = $1',
        [contractId]
      );

      const contract = contractResult.rows[0];
      const isFullySigned = contract.employer_signed && contract.contractor_signed;

      // If fully signed, update project status
      if (isFullySigned) {
        await query(
          'UPDATE projects SET status = \'in_progress\', updated_at = NOW() WHERE id = $1',
          [contract.project_id]
        );

        // Send notifications to both parties
        await query(`
          INSERT INTO notifications (user_id, title, message, type, data, created_at)
          SELECT DISTINCT p.employer_id, $1, $2, 'contract', $3, NOW()
          FROM projects p WHERE p.id = $4
          UNION
          SELECT DISTINCT p.contractor_id, $1, $2, 'contract', $3, NOW()
          FROM projects p WHERE p.id = $4
        `, [
          'قرارداد کامل امضا شد',
          'قرارداد پروژه توسط هر دو طرف امضا شد و پروژه آماده شروع است',
          JSON.stringify({ contractId: parseInt(contractId), projectId: contract.project_id }),
          contract.project_id
        ]);
      }

      res.json({
        success: true,
        message: result.message,
        data: {
          contractId: parseInt(contractId),
          isFullySigned
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }

  } catch (error) {
    console.error('Sign contract error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در امضای قرارداد'
    });
  }
});

// Download contract PDF
router.get('/:contractId/download', authenticateToken, [
  param('contractId').isInt()
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'شناسه قرارداد نامعتبر است'
      });
    }

    const { contractId } = req.params;

    const result = await contractService.getContractPdf(
      parseInt(contractId),
      req.user!.id
    );

    if (result.success && result.pdfPath) {
      // Get contract info for filename
      const contractResult = await query(
        'SELECT contract_number FROM contracts WHERE id = $1',
        [contractId]
      );

      const contractNumber = contractResult.rows[0]?.contract_number || 'contract';

      // Set headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="contract-${contractNumber}.pdf"`);

      // Stream PDF file
      const fileStream = fs.createReadStream(result.pdfPath);
      fileStream.pipe(res);

    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }

  } catch (error) {
    console.error('Download contract error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در دانلود قرارداد'
    });
  }
});

// Get user contracts
router.get('/user/list', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      status = 'all'
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    let whereConditions = ['(p.employer_id = $1 OR p.contractor_id = $1)'];
    let queryParams: any[] = [req.user!.id];
    let paramCount = 1;

    if (status === 'signed') {
      whereConditions.push('c.employer_signed = true AND c.contractor_signed = true');
    } else if (status === 'pending') {
      whereConditions.push('(c.employer_signed = false OR c.contractor_signed = false)');
    }

    const whereClause = whereConditions.join(' AND ');

    const contractsQuery = `
      SELECT 
        c.*,
        p.title as project_title,
        p.budget as project_budget,
        e.first_name as employer_first_name,
        e.last_name as employer_last_name,
        con.first_name as contractor_first_name,
        con.last_name as contractor_last_name,
        CASE 
          WHEN p.employer_id = $1 THEN 'employer'
          WHEN p.contractor_id = $1 THEN 'contractor'
        END as user_role,
        COUNT(*) OVER() as total_count
      FROM contracts c
      JOIN projects p ON c.project_id = p.id
      LEFT JOIN users e ON p.employer_id = e.id
      LEFT JOIN users con ON p.contractor_id = con.id
      WHERE ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT $${++paramCount} OFFSET $${++paramCount}
    `;

    queryParams.push(Number(limit), offset);

    const contractsResult = await query(contractsQuery, queryParams);
    const totalCount = contractsResult.rows.length > 0 ? contractsResult.rows[0].total_count : 0;

    res.json({
      success: true,
      data: {
        contracts: contractsResult.rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: Number(totalCount),
          totalPages: Math.ceil(Number(totalCount) / Number(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get user contracts error:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در دریافت لیست قرا��دادها'
    });
  }
});

export default router;
