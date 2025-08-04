import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";

// Import database connection
import { testSQLiteConnection } from "./database/sqlite-connection";
import { initializeSQLiteDatabase } from "./scripts/initSQLiteDatabase";

// Import routes
import authRoutes from "./routes/auth";
import projectRoutes from "./routes/projects";
import walletRoutes from "./routes/wallet";
import chatRoutes from "./routes/chat";
import arbitrationRoutes from "./routes/arbitration";
import paymentRoutes from "./routes/payment";
import contractRoutes from "./routes/contracts";
import notificationRoutes from "./routes/notifications";
import adminRoutes from "./routes/admin";
import uploadRoutes from "./routes/upload";
import dashboardRoutes from "./routes/dashboard";
import { handleDemo } from "./routes/demo";

export function createServer() {
  const app = express();

  // Security middleware
  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            "https://fonts.googleapis.com",
            "https://cdn.jsdelivr.net",
          ],
          fontSrc: [
            "'self'",
            "https://fonts.gstatic.com",
            "https://cdn.jsdelivr.net",
          ],
          imgSrc: ["'self'", "data:", "https:"],
          scriptSrc: ["'self'"],
          connectSrc: [
            "'self'",
            "https://api.zarinpal.com",
            "https://sandbox.zarinpal.com",
          ],
        },
      },
    }),
  );

  // CORS configuration
  app.use(
    cors({
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    }),
  );

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
      success: false,
      message:
        "تعداد درخواست‌های شما از حد مجاز بیشتر است. لطفاً بعداً تلاش کنید.",
      messageFA:
        "تعداد درخواست‌های شما از حد مجاز بیشت�� است. لطفاً بعداً تلاش کنید.",
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Stricter rate limiting for auth endpoints
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Increased limit for auth endpoints to allow development/testing
    message: {
      success: false,
      message:
        "تعداد تلاش‌های ورود از حد مجاز بیشتر است. لطفاً 15 دقیقه بعد تلاش کنید.",
      messageFA:
        "تعداد تلاش‌های ورود از حد مجاز بیشتر است. لطفاً 15 دقیقه بعد تلاش کنید.",
    },
  });

  // Apply rate limiting
  app.use("/api/", limiter);
  app.use("/api/auth/", authLimiter);

  // Logging middleware
  app.use(morgan("combined"));

  // Body parsing middleware
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Static file serving for uploads
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  // Serve static files for production frontend
  if (process.env.NODE_ENV === "production") {
    app.use(express.static(path.join(process.cwd(), "dist/spa")));
  }

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({
      success: true,
      message: "ZEMANO API is running",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
    });
  });

  // API Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/projects", projectRoutes);
  app.use("/api/wallet", walletRoutes);
  app.use("/api/chat", chatRoutes);
  app.use("/api/arbitration", arbitrationRoutes);
  app.use("/api/payment", paymentRoutes);
  app.use("/api/contracts", contractRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/upload", uploadRoutes);
  app.use("/api/dashboard", dashboardRoutes);

  // Legacy demo routes (for development)
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ZEMANO API - pong";
    res.json({ message: ping });
  });
  app.get("/api/demo", handleDemo);

  // Error handling middleware
  app.use(
    (
      err: any,
      req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      console.error("Error:", err);

      // Multer errors
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "حجم فایل بیش از حد مجاز است",
          messageFA: "حجم فایل بیش از حد مجاز است",
        });
      }

      if (err.code === "LIMIT_UNEXPECTED_FILE") {
        return res.status(400).json({
          success: false,
          message: "نوع فایل مجاز نیست",
          messageFA: "نوع فایل مجاز نیست",
        });
      }

      // Validation errors
      if (err.type === "entity.parse.failed") {
        return res.status(400).json({
          success: false,
          message: "فرمت داده‌های ارسالی نامعتبر است",
          messageFA: "فرمت داده‌های ارسالی نامعتبر است",
        });
      }

      // Default error response
      res.status(err.status || 500).json({
        success: false,
        message: err.message || "خطای داخلی سرور",
        messageFA: err.messageFA || "خطای داخلی سرور",
        ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
      });
    },
  );

  // 404 handler for API routes
  app.use("/api/*", (req, res) => {
    res.status(404).json({
      success: false,
      message: "API endpoint not found",
      messageFA: "نقطه پایانی API یافت نشد",
    });
  });

  // SPA fallback - serve index.html for all non-API routes in production
  if (process.env.NODE_ENV === "production") {
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist/spa/index.html"));
    });
  }

  // Initialize SQLite database connection and schema
  async function initDb() {
    try {
      await testSQLiteConnection();
      await initializeSQLiteDatabase();
    } catch (error) {
      console.error("SQLite database initialization failed:", error);
    }
  }

  initDb();

  return app;
}

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const app = createServer();
  const port = process.env.PORT || 8080;

  app.listen(port, () => {
    console.log(`🚀 ZEMANO Server running on port ${port}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(`🔗 API URL: http://localhost:${port}/api`);
  });
}
