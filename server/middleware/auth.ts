import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { query } from "../database/query-wrapper";

interface JWTPayload {
  userId: number;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
    firstName: string;
    lastName: string;
  };
}

// JWT secret from environment variables
const JWT_SECRET = process.env.JWT_SECRET || "zemano_super_secret_key_2024";
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "zemano_refresh_secret_key_2024";

// Generate access token (15 minutes)
export const generateAccessToken = (
  payload: Omit<JWTPayload, "iat" | "exp">,
): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });
};

// Generate refresh token (7 days)
export const generateRefreshToken = (
  payload: Omit<JWTPayload, "iat" | "exp">,
): string => {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: "7d" });
};

// Verify JWT token
export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        success: false,
        message: "Access token required",
        messageFA: "توکن دسترسی مورد نیاز است",
      });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

    try {
      // Get fresh user data from database
      const userResult = await query(
        "SELECT id, email, role, first_name, last_name, is_active FROM users WHERE id = $1",
        [decoded.userId],
      );

      if (userResult.rows.length === 0) {
        res.status(401).json({
          success: false,
          message: "User not found",
          messageFA: "کاربر یافت نشد",
        });
        return;
      }

      const user = userResult.rows[0];

      if (!user.is_active) {
        res.status(401).json({
          success: false,
          message: "Account is deactivated",
          messageFA: "حساب کاربری غیرفعال است",
        });
        return;
      }

      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name,
      };
    } catch (dbError) {
      console.log("Database not available for auth, using token data");

      // Fallback to token data when database is not available
      req.user = {
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        firstName: "کاربر",
        lastName: "تست",
      };
    }

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        message: "Invalid token",
        messageFA: "توکن نامعتبر است",
      });
    } else {
      console.error("Auth middleware error:", error);
      res.status(500).json({
        success: false,
        message: "Authentication error",
        messageFA: "خطا در احراز هویت",
      });
    }
  }
};

// Role-based authorization
export const requireRole = (roles: string[]) => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
        messageFA: "احراز هویت مورد نیاز است",
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: "Insufficient permissions",
        messageFA: "سطح دسترسی کافی نیست",
      });
      return;
    }

    next();
  };
};

// Check if user is employer
export const requireEmployer = requireRole(["employer", "admin"]);

// Check if user is contractor
export const requireContractor = requireRole(["contractor", "admin"]);

// Check if user is arbitrator
export const requireArbitrator = requireRole(["arbitrator", "admin"]);

// Check if user is admin
export const requireAdmin = requireRole(["admin"]);

// Refresh token endpoint
export const refreshToken = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(401).json({
        success: false,
        message: "Refresh token required",
        messageFA: "توکن تازه‌سازی مورد نیاز است",
      });
      return;
    }

    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as JWTPayload;

    // Get user data
    const userResult = await query(
      "SELECT id, email, role FROM users WHERE id = $1 AND is_active = true",
      [decoded.userId],
    );

    if (userResult.rows.length === 0) {
      res.status(401).json({
        success: false,
        message: "Invalid refresh token",
        messageFA: "توکن تازه‌سازی نامعتبر است",
      });
      return;
    }

    const user = userResult.rows[0];

    // Generate new tokens
    const newAccessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const newRefreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    res.status(401).json({
      success: false,
      message: "Invalid refresh token",
      messageFA: "توکن تازه‌سازی نامعتبر است",
    });
  }
};
