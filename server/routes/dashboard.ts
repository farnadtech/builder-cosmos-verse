import { Router, Response } from "express";
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth";
import { query } from "../database/query-wrapper";

const router = Router();

// Get user dashboard statistics
router.get(
  "/stats",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      const userRole = req.user?.role;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "کاربر احراز هویت نشده است",
        });
      }

      let stats: any = {
        totalProjects: 0,
        activeProjects: 0,
        completedProjects: 0,
        balance: 0,
      };

      // Get wallet balance
      const walletResult = await query(
        "SELECT balance FROM wallets WHERE user_id = $1",
        [userId],
      );

      if (walletResult.rows.length > 0) {
        stats.balance = walletResult.rows[0].balance || 0;
      }

      if (userRole === "employer") {
        // Employer statistics
        const projectStats = await query(
          `
        SELECT 
          COUNT(*) as total_projects,
          COUNT(CASE WHEN status IN ('open', 'assigned', 'in_progress') THEN 1 END) as active_projects,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_projects,
          COALESCE(SUM(CASE WHEN status = 'completed' THEN budget ELSE 0 END), 0) as total_spent
        FROM projects 
        WHERE employer_id = $1
      `,
          [userId],
        );

        if (projectStats.rows.length > 0) {
          stats = {
            ...stats,
            totalProjects: parseInt(projectStats.rows[0].total_projects) || 0,
            activeProjects: parseInt(projectStats.rows[0].active_projects) || 0,
            completedProjects:
              parseInt(projectStats.rows[0].completed_projects) || 0,
            totalSpent: parseFloat(projectStats.rows[0].total_spent) || 0,
          };
        }
      } else if (userRole === "contractor") {
        // Contractor statistics
        const projectStats = await query(
          `
        SELECT 
          COUNT(*) as total_projects,
          COUNT(CASE WHEN status IN ('assigned', 'in_progress') THEN 1 END) as active_projects,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_projects,
          COALESCE(SUM(CASE WHEN status = 'completed' THEN budget ELSE 0 END), 0) as total_earned
        FROM projects 
        WHERE contractor_id = $1
      `,
          [userId],
        );

        if (projectStats.rows.length > 0) {
          stats = {
            ...stats,
            totalProjects: parseInt(projectStats.rows[0].total_projects) || 0,
            activeProjects: parseInt(projectStats.rows[0].active_projects) || 0,
            completedProjects:
              parseInt(projectStats.rows[0].completed_projects) || 0,
            totalEarned: parseFloat(projectStats.rows[0].total_earned) || 0,
          };
        }
      } else if (userRole === "arbitrator") {
        // Arbitrator statistics
        const arbitrationStats = await query(
          `
        SELECT 
          COUNT(*) as total_cases,
          COUNT(CASE WHEN status IN ('assigned', 'in_review') THEN 1 END) as active_cases,
          COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_cases
        FROM arbitrations 
        WHERE arbitrator_id = $1
      `,
          [userId],
        );

        if (arbitrationStats.rows.length > 0) {
          stats = {
            ...stats,
            totalProjects: parseInt(arbitrationStats.rows[0].total_cases) || 0,
            activeProjects:
              parseInt(arbitrationStats.rows[0].active_cases) || 0,
            completedProjects:
              parseInt(arbitrationStats.rows[0].resolved_cases) || 0,
          };
        }
      } else if (userRole === "admin") {
        // Admin statistics
        const adminStats = await query(`
        SELECT 
          (SELECT COUNT(*) FROM users) as total_users,
          (SELECT COUNT(*) FROM projects) as total_projects,
          (SELECT COUNT(*) FROM escrow_transactions) as total_transactions,
          (SELECT COALESCE(SUM(amount * 0.05), 0) FROM escrow_transactions WHERE status = 'released') as platform_revenue
      `);

        if (adminStats.rows.length > 0) {
          stats = {
            ...stats,
            totalUsers: parseInt(adminStats.rows[0].total_users) || 0,
            totalProjects: parseInt(adminStats.rows[0].total_projects) || 0,
            totalTransactions:
              parseInt(adminStats.rows[0].total_transactions) || 0,
            platformRevenue:
              parseFloat(adminStats.rows[0].platform_revenue) || 0,
          };
        }
      }

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error("Dashboard stats error:", error);
      res.status(500).json({
        success: false,
        message: "خطا در دریافت آمار داشبورد",
      });
    }
  },
);

// Get recent projects for user
router.get(
  "/recent-projects",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      const userRole = req.user?.role;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "کاربر احراز هویت نشده است",
        });
      }

      let projects: any[] = [];

      if (userRole === "employer") {
        const result = await query(
          `
        SELECT 
          p.id, p.title, p.status, p.budget, p.deadline, p.created_at,
          u.first_name as contractor_first_name,
          u.last_name as contractor_last_name
        FROM projects p
        LEFT JOIN users u ON p.contractor_id = u.id
        WHERE p.employer_id = $1
        ORDER BY p.created_at DESC
        LIMIT 10
      `,
          [userId],
        );

        projects = result.rows.map((row) => ({
          ...row,
          contractor:
            row.contractor_first_name && row.contractor_last_name
              ? `${row.contractor_first_name} ${row.contractor_last_name}`
              : null,
        }));
      } else if (userRole === "contractor") {
        const result = await query(
          `
        SELECT 
          p.id, p.title, p.status, p.budget, p.deadline, p.created_at,
          u.first_name as employer_first_name,
          u.last_name as employer_last_name
        FROM projects p
        LEFT JOIN users u ON p.employer_id = u.id
        WHERE p.contractor_id = $1
        ORDER BY p.created_at DESC
        LIMIT 10
      `,
          [userId],
        );

        projects = result.rows.map((row) => ({
          ...row,
          employer:
            row.employer_first_name && row.employer_last_name
              ? `${row.employer_first_name} ${row.employer_last_name}`
              : null,
        }));
      } else if (userRole === "admin") {
        const result = await query(`
        SELECT 
          p.id, p.title, p.status, p.budget, p.deadline, p.created_at,
          e.first_name as employer_first_name,
          e.last_name as employer_last_name,
          c.first_name as contractor_first_name,
          c.last_name as contractor_last_name
        FROM projects p
        LEFT JOIN users e ON p.employer_id = e.id
        LEFT JOIN users c ON p.contractor_id = c.id
        ORDER BY p.created_at DESC
        LIMIT 10
      `);

        projects = result.rows.map((row) => ({
          ...row,
          employer:
            row.employer_first_name && row.employer_last_name
              ? `${row.employer_first_name} ${row.employer_last_name}`
              : null,
          contractor:
            row.contractor_first_name && row.contractor_last_name
              ? `${row.contractor_first_name} ${row.contractor_last_name}`
              : null,
        }));
      }

      res.json({
        success: true,
        data: projects,
      });
    } catch (error) {
      console.error("Recent projects error:", error);
      res.status(500).json({
        success: false,
        message: "خطا در دریافت پروژه‌های اخیر",
      });
    }
  },
);

export default router;
