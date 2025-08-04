import { Router, Response } from "express";
import {
  body,
  param,
  query as queryValidator,
  validationResult,
} from "express-validator";
import {
  authenticateToken,
  AuthenticatedRequest,
  requireEmployer,
  requireContractor,
} from "../middleware/auth";
import { query, executeTransaction } from "../database/query-wrapper";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads/projects";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `project-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      ".jpg",
      ".jpeg",
      ".png",
      ".pdf",
      ".doc",
      ".docx",
      ".zip",
      ".rar",
    ];
    const fileExt = path.extname(file.originalname).toLowerCase();

    if (allowedTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error("فرمت فایل مجاز نیست"));
    }
  },
});

// Validation rules
const createProjectValidation = [
  body("title")
    .trim()
    .isLength({ min: 5, max: 255 })
    .withMessage("عنوان پروژه باید بین 5 تا 255 کاراکتر باشد"),
  body("description")
    .trim()
    .isLength({ min: 20 })
    .withMessage("توضیحات پروژه باید حداقل 20 کاراکتر باشد"),
  body("category")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("دست��‌بندی پروژه الزامی است"),
  body("budget")
    .isFloat({ min: 10000 })
    .withMessage("بودجه پروژه باید حداقل 10,000 ریال باشد"),
  body("deadline").isISO8601().withMessage("تاریخ پای��ن پروژه نامعتبر است"),
  body("milestones")
    .isArray({ min: 1 })
    .withMessage("حداقل یک مرحله برای پروژ�� تعریف کنید"),
  body("milestones.*.title")
    .trim()
    .isLength({ min: 2 })
    .withMessage("عنوان مرحله الزامی است"),
  body("milestones.*.amount")
    .isFloat({ min: 1000 })
    .withMessage("مبلغ مرحله باید حداقل 1,000 ریال باشد"),
  body("milestones.*.deadline")
    .optional()
    .isISO8601()
    .withMessage("تاریخ پایان مرحله نامعتبر است"),
  body("totalAmount")
    .optional()
    .isFloat({ min: 10000 })
    .withMessage("مبلغ کل نامعتبر است"),
];

// Get all projects with filters and pagination
router.get(
  "/",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        category,
        search,
        minBudget,
        maxBudget,
        myProjects,
      } = req.query;

      const offset = (Number(page) - 1) * Number(limit);
      let whereConditions: string[] = [];
      let queryParams: any[] = [];
      let paramCount = 0;

      // Build WHERE conditions
      if (status && status !== "all") {
        whereConditions.push(`p.status = $${++paramCount}`);
        queryParams.push(status);
      }

      if (category) {
        whereConditions.push(`p.category = $${++paramCount}`);
        queryParams.push(category);
      }

      if (search) {
        whereConditions.push(
          `(p.title LIKE $${++paramCount} OR p.description LIKE $${++paramCount})`,
        );
        queryParams.push(`%${search}%`, `%${search}%`);
        paramCount++;
      }

      if (minBudget) {
        whereConditions.push(`p.budget >= $${++paramCount}`);
        queryParams.push(Number(minBudget));
      }

      if (maxBudget) {
        whereConditions.push(`p.budget <= $${++paramCount}`);
        queryParams.push(Number(maxBudget));
      }

      if (myProjects === "true") {
        whereConditions.push(
          `(p.employer_id = $${++paramCount} OR p.contractor_id = $${++paramCount})`,
        );
        queryParams.push(req.user!.userId, req.user!.userId);
        paramCount++;
      }

      const whereClause =
        whereConditions.length > 0
          ? "WHERE " + whereConditions.join(" AND ")
          : "";

      // Get projects with user details
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

      // Get milestones for each project (simplified for SQLite)
      const projectIds = projectsResult.rows.map((p) => p.id);
      let milestones: any[] = [];

      if (projectIds.length > 0) {
        // For SQLite, we'll fetch milestones for all projects in separate queries
        for (const projectId of projectIds) {
          const milestonesQuery = `
          SELECT m.*,
                 COALESCE(et.status, 'pending') as payment_status,
                 et.zarinpal_ref_id
          FROM milestones m
          LEFT JOIN escrow_transactions et ON m.id = et.milestone_id
          WHERE m.project_id = $1
          ORDER BY m.order_index
        `;
          const milestonesResult = await query(milestonesQuery, [projectId]);
          milestones.push(...milestonesResult.rows);
        }
      }

      // Group milestones by project
      const projectsWithMilestones = projectsResult.rows.map((project) => ({
        ...project,
        milestones: milestones.filter((m) => m.project_id === project.id),
      }));

      const totalCount =
        projectsResult.rows.length > 0 ? projectsResult.rows[0].total_count : 0;

      res.json({
        success: true,
        data: {
          projects: projectsWithMilestones,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: Number(totalCount),
            totalPages: Math.ceil(Number(totalCount) / Number(limit)),
          },
        },
      });
    } catch (error) {
      console.error("Get projects error:", error);
      res.status(500).json({
        success: false,
        message: "خطا در دریافت لیست پروژه‌ها",
      });
    }
  },
);

// Get single project by ID
router.get(
  "/:id",
  authenticateToken,
  param("id").isInt(),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "شناسه پروژه نامعتبر ا���ت",
        });
      }

      const projectId = req.params.id;

      // Get project with user details
      const projectResult = await query(
        `
      SELECT 
        p.*,
        e.first_name as employer_first_name,
        e.last_name as employer_last_name,
        e.email as employer_email,
        e.phone_number as employer_phone,
        c.first_name as contractor_first_name,
        c.last_name as contractor_last_name,
        c.email as contractor_email,
        c.phone_number as contractor_phone
      FROM projects p
      LEFT JOIN users e ON p.employer_id = e.id
      LEFT JOIN users c ON p.contractor_id = c.id
      WHERE p.id = $1
    `,
        [projectId],
      );

      if (projectResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "پروژه یافت نشد",
        });
      }

      const project = projectResult.rows[0];

      // Check if user has access to this project
      const hasAccess =
        req.user!.role === "admin" ||
        project.employer_id === req.user!.userId ||
        project.contractor_id === req.user!.userId;

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: "دسترسی به این پ��وژه ندارید",
        });
      }

      // Get milestones with payment info
      const milestonesResult = await query(
        `
      SELECT m.*, 
             COALESCE(et.status, 'pending') as payment_status,
             et.zarinpal_ref_id,
             et.amount as paid_amount,
             et.payment_date
      FROM milestones m
      LEFT JOIN escrow_transactions et ON m.id = et.milestone_id
      WHERE m.project_id = $1
      ORDER BY m.order_index
    `,
        [projectId],
      );

      // Get recent chat messages
      const chatResult = await query(
        `
      SELECT cm.*, u.first_name, u.last_name, u.role
      FROM chat_messages cm
      JOIN users u ON cm.sender_id = u.id
      WHERE cm.project_id = $1
      ORDER BY cm.created_at DESC
      LIMIT 10
    `,
        [projectId],
      );

      res.json({
        success: true,
        data: {
          project: {
            ...project,
            milestones: milestonesResult.rows,
            recentMessages: chatResult.rows.reverse(),
          },
        },
      });
    } catch (error) {
      console.error("Get project error:", error);
      res.status(500).json({
        success: false,
        message: "خطا در دریافت اطلا��ات پروژه",
      });
    }
  },
);

// Create new project (employer only)
router.post(
  "/",
  authenticateToken,
  requireEmployer,
  upload.single("attachment"),
  createProjectValidation,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "اطلاع��ت ورودی نامعتبر است",
          errors: errors.array(),
        });
      }

      const { title, description, category, budget, deadline, milestones } =
        req.body;
      const attachmentPath = req.file ? req.file.path : null;

      // Validate milestones total amount equals project budget
      const milestonesData = Array.isArray(milestones)
        ? milestones
        : JSON.parse(milestones);
      const totalMilestoneAmount = milestonesData.reduce(
        (sum: number, m: any) => sum + parseFloat(m.amount),
        0,
      );

      if (Math.abs(totalMilestoneAmount - parseFloat(budget)) > 0.01) {
        return res.status(400).json({
          success: false,
          message: "مجموع م����لغ مراحل باید برابر بودجه کل پروژه باشد",
        });
      }

      // Create project
      const projectResult = await query(
        `INSERT INTO projects (title, description, category, budget, deadline, employer_id, attachment_path, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'open', CURRENT_TIMESTAMP)
       RETURNING id`,
        [
          title,
          description,
          category,
          parseFloat(budget),
          deadline,
          req.user!.userId,
          attachmentPath,
        ],
      );

      console.log("Project creation result:", projectResult);

      const projectId = projectResult.rows[0]?.id;
      console.log("Extracted project ID:", projectId);

      if (!projectId) {
        console.error("Failed to get project ID from result:", projectResult);
        return res.status(500).json({
          success: false,
          message: "خطا در ایجاد پروژه",
        });
      }

      // Insert milestones
      for (let i = 0; i < milestonesData.length; i++) {
        const milestone = milestonesData[i];
        await query(
          `INSERT INTO milestones (project_id, title, description, amount, deadline, order_index, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending', CURRENT_TIMESTAMP)`,
          [
            projectId,
            milestone.title,
            milestone.description || "",
            parseFloat(milestone.amount),
            milestone.deadline || null,
            i + 1,
          ],
        );
      }

      // Store file info if uploaded
      if (req.file) {
        await query(
          `INSERT INTO uploads (user_id, original_name, file_path, file_size, mime_type, purpose, reference_id, created_at)
         VALUES ($1, $2, $3, $4, $5, 'project', $6, CURRENT_TIMESTAMP)`,
          [
            req.user!.userId,
            req.file.originalname,
            req.file.path,
            req.file.size,
            req.file.mimetype,
            projectId,
          ],
        );
      }

      const responseData = {
        success: true,
        message: "پروژه با موفقیت ایجاد شد",
        data: {
          project: {
            id: projectId,
            title,
            budget: parseFloat(budget),
            milestonesCount: milestonesData.length,
          },
        },
      };

      console.log("Sending response:", responseData);
      res.status(201).json(responseData);
    } catch (error) {
      console.error("Create project error:", error);

      // Clean up uploaded file on error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.status(500).json({
        success: false,
        message: "خطا در ایجاد پروژه",
      });
    }
  },
);

// Apply for project (contractor only)
router.post(
  "/:id/apply",
  authenticateToken,
  requireContractor,
  param("id").isInt(),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "شناسه پروژه نامعتبر است",
        });
      }

      const projectId = req.params.id;
      const { proposal, estimatedDays } = req.body;

      // Check if project exists and is open
      const projectResult = await query(
        "SELECT id, title, employer_id, status FROM projects WHERE id = $1",
        [projectId],
      );

      if (projectResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "پروژه یافت نشد",
        });
      }

      const project = projectResult.rows[0];

      if (project.status !== "open") {
        return res.status(400).json({
          success: false,
          message: "این پروژه دیگر برای درخواست باز نیست",
        });
      }

      if (project.employer_id === req.user!.userId) {
        return res.status(400).json({
          success: false,
          message: "نمی‌توانید برای پروژه خود درخواست دهید",
        });
      }

      // Check if already applied
      const existingApplication = await query(
        "SELECT id FROM project_applications WHERE project_id = $1 AND contractor_id = $2",
        [projectId, req.user!.userId],
      );

      if (existingApplication.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: "قبلاً برای این پروژه درخواست داده‌ا��د",
        });
      }

      // Create application
      await query(
        `INSERT INTO project_applications (project_id, contractor_id, proposal, estimated_days, status, created_at)
       VALUES ($1, $2, $3, $4, 'pending', CURRENT_TIMESTAMP)`,
        [projectId, req.user!.userId, proposal, estimatedDays],
      );

      // Send notification to employer
      await query(
        `INSERT INTO notifications (user_id, title, message, type, data, created_at)
       VALUES ($1, $2, $3, 'application', $4, CURRENT_TIMESTAMP)`,
        [
          project.employer_id,
          "درخواست جدید برای پروژه",
          `درخواست جدیدی برای پروژه "${project.title}" د����افت شد`,
          JSON.stringify({ projectId, contractorId: req.user!.userId }),
        ],
      );

      res.status(201).json({
        success: true,
        message: "درخواست شما ��ا موفقیت ارسال شد",
      });
    } catch (error) {
      console.error("Apply for project error:", error);
      res.status(500).json({
        success: false,
        message: "خطا در ارسال درخواست",
      });
    }
  },
);

// Assign project to contractor (employer only)
router.post(
  "/:id/assign",
  authenticateToken,
  requireEmployer,
  param("id").isInt(),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "شناسه پروژ�� نامعتبر است",
        });
      }

      const projectId = req.params.id;
      const { contractorId } = req.body;

      // Verify project ownership and status
      const projectResult = await query(
        "SELECT id, title, status, employer_id FROM projects WHERE id = $1 AND employer_id = $2",
        [projectId, req.user!.userId],
      );

      if (projectResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "پروژه یافت نشد یا دسترسی ندارید",
        });
      }

      const project = projectResult.rows[0];

      if (project.status !== "open") {
        return res.status(400).json({
          success: false,
          message: "وضعیت پروژه اجازه تخصیص نمی‌دهد",
        });
      }

      // Verify contractor exists and has applied
      const contractorResult = await query(
        `SELECT u.id, u.first_name, u.last_name 
       FROM users u
       JOIN project_applications pa ON u.id = pa.contractor_id
       WHERE u.id = $1 AND pa.project_id = $2 AND u.role = 'contractor' AND u.is_active = true`,
        [contractorId, projectId],
      );

      if (contractorResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: "مجری انتخاب شده نامعتبر است",
        });
      }

      // Assign project
      await query(
        "UPDATE projects SET contractor_id = $1, status = 'assigned', updated_at = CURRENT_TIMESTAMP WHERE id = $2",
        [contractorId, projectId],
      );

      // Update application status
      await query(
        "UPDATE project_applications SET status = 'accepted' WHERE project_id = $1 AND contractor_id = $2",
        [projectId, contractorId],
      );

      // Reject other applications
      await query(
        "UPDATE project_applications SET status = 'rejected' WHERE project_id = $1 AND contractor_id != $2",
        [projectId, contractorId],
      );

      // Send notification to contractor
      await query(
        `INSERT INTO notifications (user_id, title, message, type, data, created_at)
       VALUES ($1, $2, $3, 'assignment', $4, CURRENT_TIMESTAMP)`,
        [
          contractorId,
          "پروژه به شما تخصیص یافت",
          `پرو��ه "${project.title}" به شما تخصیص یافت`,
          JSON.stringify({ projectId }),
        ],
      );

      res.json({
        success: true,
        message: "پروژه با موفقیت تخصیص یافت",
      });
    } catch (error) {
      console.error("Assign project error:", error);
      res.status(500).json({
        success: false,
        message: "خطا در تخصیص پروژه",
      });
    }
  },
);

// Generate invite link for project (employer only)
router.post(
  "/:id/invite-link",
  authenticateToken,
  requireEmployer,
  param("id").isInt(),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      console.log(
        `📋 Generating invite link for project ${req.params.id} by user ${req.user?.userId}`,
      );

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log("❌ Validation errors:", errors.array());
        return res.status(400).json({
          success: false,
          message: "شناسه پروژه نامعتبر است",
        });
      }

      const projectId = req.params.id;

      // Verify project ownership
      const projectResult = await query(
        "SELECT id, title FROM projects WHERE id = $1 AND employer_id = $2",
        [projectId, req.user!.userId],
      );

      if (projectResult.rows.length === 0) {
        console.log(
          `❌ Project ${projectId} not found or access denied for user ${req.user?.userId}`,
        );
        return res.status(404).json({
          success: false,
          message: "پروژه یافت نشد یا دسترسی ندارید",
        });
      }

      // Generate unique invite token (shorter token to avoid URL issues)
      const inviteToken = crypto.randomBytes(16).toString("hex"); // Reduced from 32 to 16 bytes
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      console.log(`✅ Generated invite token: ${inviteToken}`);

      // Save invite
      await query(
        `INSERT INTO project_invites (project_id, invite_token, expires_at, created_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
        [projectId, inviteToken, expiresAt],
      );

      console.log(`✅ Invite saved to database for project ${projectId}`);

      res.json({
        success: true,
        data: {
          inviteToken,
          expiresAt,
        },
      });
    } catch (error) {
      console.error("Generate invite link error:", error);
      res.status(500).json({
        success: false,
        message: "خط�� در تولید لینک دعوت",
      });
    }
  },
);

// Send project invite (employer only)
router.post(
  "/:id/invite",
  authenticateToken,
  requireEmployer,
  param("id").isInt(),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "شناسه پروژه نامعتبر است",
        });
      }

      const projectId = req.params.id;
      const { method, email, phoneNumber, message, inviteLink } = req.body;

      // Verify project ownership
      const projectResult = await query(
        "SELECT id, title FROM projects WHERE id = $1 AND employer_id = $2",
        [projectId, req.user!.userId],
      );

      if (projectResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "پروژه یافت نشد یا دسترسی ندارید",
        });
      }

      const project = projectResult.rows[0];

      // Extract token from invite link if provided
      let inviteToken = "";
      if (inviteLink) {
        const tokenMatch = inviteLink.match(/\/projects\/accept\/([^/?]+)/);
        if (tokenMatch) {
          inviteToken = tokenMatch[1];
        }
      }

      // If no token from link, generate a new one
      if (!inviteToken) {
        inviteToken = crypto.randomBytes(32).toString("hex");
      }

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      // Save invite record (check if token exists first for SQLite compatibility)
      const existingInvite = await query(
        "SELECT id FROM project_invites WHERE invite_token = $1",
        [inviteToken],
      );

      if (existingInvite.rows.length > 0) {
        // Update existing invite
        await query(
          `UPDATE project_invites SET
         contractor_email = $1,
         contractor_phone = $2,
         message = $3,
         expires_at = $4
         WHERE invite_token = $5`,
          [email || null, phoneNumber || null, message, expiresAt, inviteToken],
        );
      } else {
        // Insert new invite
        await query(
          `INSERT INTO project_invites (project_id, invite_token, contractor_email, contractor_phone, message, expires_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
          [
            projectId,
            inviteToken,
            email || null,
            phoneNumber || null,
            message,
            expiresAt,
          ],
        );
      }

      // Simulate email/SMS sending (for demo purposes)
      let sendResult = { success: false, message: "" };

      if (method === "email" && email) {
        // Simulate email sending
        console.log(`📧 [DEMO] Sending email to: ${email}`);
        console.log(
          `📧 [DEMO] Subject: دعوت برای همکاری در پروژه "${project.title}"`,
        );
        console.log(`📧 [DEMO] Message: ${message}`);
        console.log(
          `📧 [DEMO] Invite Link: ${inviteLink || `${process.env.FRONTEND_URL || "http://localhost:3000"}/projects/accept/${inviteToken}`}`,
        );
        sendResult = { success: true, message: "ایمیل ارسال شد (حالت نمایشی)" };
      } else if (method === "phone" && phoneNumber) {
        // Simulate SMS sending
        console.log(`📱 [DEMO] Sending SMS to: ${phoneNumber}`);
        console.log(`📱 [DEMO] Message: ${message}`);
        console.log(
          `📱 [DEMO] Invite Link: ${inviteLink || `${process.env.FRONTEND_URL || "http://localhost:3000"}/projects/accept/${inviteToken}`}`,
        );
        sendResult = { success: true, message: "پیامک ارسال شد (حالت نمایشی)" };
      } else if (method === "link") {
        // For link method, just confirm the link is ready
        sendResult = { success: true, message: "لینک آماده ارسال است" };
      }

      // Update project status to waiting for acceptance
      await query(
        "UPDATE projects SET status = 'waiting_for_acceptance', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [projectId],
      );

      res.json({
        success: true,
        message: sendResult.success ? sendResult.message : "دعوت‌نامه ثبت شد",
        data: {
          inviteToken,
          method,
          sentTo: email || phoneNumber || "manual",
        },
      });
    } catch (error) {
      console.error("Send invite error:", error);
      res.status(500).json({
        success: false,
        message: "خطا در ارسال دعوت‌نامه",
      });
    }
  },
);

// Get project by invite token (public)
router.get("/invite/:token", async (req, res: Response) => {
  try {
    const { token } = req.params;
    console.log(`🔗 Fetching project data for invite token: ${token}`);

    // Get invite and project info
    const result = await query(
      `
      SELECT
        p.*,
        e.first_name as employer_first_name,
        e.last_name as employer_last_name,
        pi.status as invite_status,
        pi.expires_at
      FROM project_invites pi
      JOIN projects p ON pi.project_id = p.id
      JOIN users e ON p.employer_id = e.id
      WHERE pi.invite_token = $1
    `,
      [token],
    );

    console.log(`📋 Query result: ${result.rows.length} rows found`);

    if (result.rows.length === 0) {
      console.log(`❌ No invite found for token: ${token}`);
      return res.status(404).json({
        success: false,
        message: "لینک دعوت نامعتبر یا منقضی شده است",
      });
    }

    const data = result.rows[0];
    console.log(`✅ Found project: ${data.title} (ID: ${data.id})`);

    // Check if invite is expired
    if (new Date() > new Date(data.expires_at)) {
      return res.status(400).json({
        success: false,
        message: "لینک دعوت من��ضی شده است",
      });
    }

    // Get milestones
    const milestonesResult = await query(
      "SELECT * FROM milestones WHERE project_id = $1 ORDER BY order_index",
      [data.id],
    );

    // Mock employer rating and completed projects (should come from actual data)
    const projectData = {
      id: data.id,
      title: data.title,
      description: data.description,
      category: data.category,
      budget: data.budget,
      deadline: data.deadline,
      status: data.status,
      milestones: milestonesResult.rows,
      employer: {
        firstName: data.employer_first_name,
        lastName: data.employer_last_name,
        rating: 4.5, // Mock data
        completedProjects: 12, // Mock data
      },
      attachments: [], // TODO: Get actual attachments
      contractTerms: `قرارداد همکاری برای پروژه "${data.title}"

شرا��ط عمومی:
- پرداخت بر اساس مراحل تعریف شده انجام می‌شود
- رعایت کیفیت و مهلت‌های تعیین شده الزامی است
- در صورت اختلاف، پرونده به داوری ارجاع می‌شود
- تمام حقوق طرفین محفوظ است

مسئولیت‌های مجری:
- اجرای پروژه طبق مشخصات ارائه شده
- ارائه گزارش پیشرفت به‌موقع
- رعایت استانداردهای کیفی

مسئولیت‌��ای کارفرما:
- پرداخت به‌موقع طبق مراحل تعریف شده
- ارائه اطلاعات و منابع مورد نیاز
- بازخورد سریع به درخ��است‌ها�� مجری`,
    };

    res.json({
      success: true,
      data: {
        project: projectData,
      },
    });
  } catch (error) {
    console.error("Get project by invite error:", error);
    res.status(500).json({
      success: false,
      message: "خ��ا در دریافت اطلاعات پروژه",
    });
  }
});

// Accept project invitation with registration (public endpoint)
router.post(
  "/accept/:token",
  async (req, res: Response) => {
    try {
      const { token } = req.params;

      // Get invite and project info
      const result = await query(
        `
      SELECT
        pi.*,
        p.id as project_id,
        p.title,
        p.status as project_status
      FROM project_invites pi
      JOIN projects p ON pi.project_id = p.id
      WHERE pi.invite_token = $1
    `,
        [token],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "لینک دعوت نامعتبر است",
        });
      }

      const invite = result.rows[0];

      // Check if invite is expired
      if (new Date() > new Date(invite.expires_at)) {
        return res.status(400).json({
          success: false,
          message: "لینک دعوت منقضی شده است",
        });
      }

      // Check if invite is already accepted
      if (invite.status === "accepted") {
        return res.status(400).json({
          success: false,
          message: "این دعوت قبلاً پذیرش شده است",
        });
      }

      // Check if project is still waiting for acceptance
      if (invite.project_status !== "waiting_for_acceptance") {
        return res.status(400).json({
          success: false,
          message: "این پروژه دیگر قابل پذیرش نیست",
        });
      }

      // For public accept, we just update the invite status but don't assign contractor yet
      // The contractor assignment will happen after user registers/logs in
      await query(
        "UPDATE project_invites SET status = 'pending_registration', accepted_at = CURRENT_TIMESTAMP WHERE invite_token = $1",
        [token],
      );

      res.json({
        success: true,
        message: "دعوت پذیرش شد. برای ادامه باید وارد حساب کاربری خود شوید یا ثبت نام کنید.",
        data: {
          requiresLogin: true,
          inviteToken: token
        }
      });
    } catch (error) {
      console.error("Accept project error:", error);
      res.status(500).json({
        success: false,
        message: "خطا د�� پذیرش پروژه",
      });
    }
  },
);

// Finalize project invite after user registration and verification
router.post(
  "/finalize-invite/:token",
  authenticateToken,
  requireContractor,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { token } = req.params;

      // Get invite and project info
      const result = await query(
        `
        SELECT
          pi.*,
          p.id as project_id,
          p.title,
          p.status as project_status
        FROM project_invites pi
        JOIN projects p ON pi.project_id = p.id
        WHERE pi.invite_token = $1 AND pi.status = 'pending_registration'
      `,
        [token],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "دعوت نامعتبر یا قبلاً پردازش شده است",
        });
      }

      const invite = result.rows[0];

      // Check if invite is expired
      if (new Date() > new Date(invite.expires_at)) {
        return res.status(400).json({
          success: false,
          message: "لینک دعوت منقضی شده است",
        });
      }

      // Finalize the invitation - assign contractor to project
      await query(
        "UPDATE project_invites SET status = 'accepted', contractor_id = $1 WHERE invite_token = $2",
        [req.user!.userId, token],
      );

      // Update project with contractor and change status to active
      await query(
        "UPDATE projects SET contractor_id = $1, status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = $2",
        [req.user!.userId, invite.project_id],
      );

      res.json({
        success: true,
        message: "پروژه با موفقیت به شما تخصیص یافت",
        data: {
          projectId: invite.project_id
        }
      });
    } catch (error) {
      console.error("Finalize invite error:", error);
      res.status(500).json({
        success: false,
        message: "خطا در تکمیل فرآیند دعوت",
      });
    }
  },
);

// Update project status
router.patch(
  "/:id/status",
  authenticateToken,
  param("id").isInt(),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "شناسه پروژه نامعتبر است",
        });
      }

      const projectId = req.params.id;
      const { status } = req.body;

      const allowedStatuses = [
        "open",
        "assigned",
        "in_progress",
        "completed",
        "cancelled",
        "disputed",
      ];
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "وضعیت پروژه نامعتبر است",
        });
      }

      // Check project access
      const projectResult = await query(
        "SELECT * FROM projects WHERE id = $1",
        [projectId],
      );

      if (projectResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "پروژه یافت نشد",
        });
      }

      const project = projectResult.rows[0];
      const hasAccess =
        req.user!.role === "admin" ||
        project.employer_id === req.user!.userId ||
        project.contractor_id === req.user!.userId;

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: "دسترسی به این پروژه ندارید",
        });
      }

      // Update status
      await query(
        "UPDATE projects SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
        [status, projectId],
      );

      res.json({
        success: true,
        message: "وضعیت پروژه با موفقیت به‌ر��زرسانی شد",
      });
    } catch (error) {
      console.error("Update project status error:", error);
      res.status(500).json({
        success: false,
        message: "خطا در به‌روزرسانی وضعیت پروژه",
      });
    }
  },
);

export default router;
