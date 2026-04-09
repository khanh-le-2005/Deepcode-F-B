import express from "express";
import "express-async-errors";
import morgan from "morgan";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import cookieParser from "cookie-parser";
import { jwtAuthenticationFilter } from "./backend/src/security/SecurityMiddleware.js";

// MongoDB
import { connectDB } from "./backend/src/config/db.js";

// Routes
import menuRoutes from "./backend/src/routes/menuRoutes.js";
import tableRoutes from "./backend/src/routes/tableRoutes.js";
import orderRoutes from "./backend/src/routes/orderRoutes.js";
import paymentRoutes from "./backend/src/routes/paymentRoutes.js";
import statsRoutes from "./backend/src/routes/statsRoutes.js";
import authRoutes from "./backend/src/routes/authRoutes.js";
import comboRoutes from "./backend/src/routes/ComboRoutes.js";
import imageRoutes from "./backend/src/routes/imageRoutes.js";
import bankAccountRoutes from "./backend/src/routes/bankAccountRoutes.js";
import categoryRoutes from "./backend/src/routes/categoryRoutes.js";
import weeklyMenuRoutes from "./backend/src/routes/weeklyMenuRoutes.js";
import userRoutes from "./backend/src/routes/userRoutes.js";
import notificationRoutes from "./backend/src/routes/notificationRoutes.js";
import { seedInitialData } from "./backend/src/config/setup.js";

async function startServer() {
  // Connect to MongoDB
  await connectDB();

  // Seed initial data if empty
  await seedInitialData();

  const app = express();
  app.set("trust proxy", 1);
  app.use(cookieParser());
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: [
        "http://localhost:8000",
        "http://localhost:8080",
        "http://momangshow.vn", "https://momangshow.vn",
        "http://www.momangshow.vn", "https://www.momangshow.vn",
        "http://api.momangshow.vn", "https://api.momangshow.vn",
        "http://admin.momangshow.vn", "https://admin.momangshow.vn",
        "http://150.95.115.212:8080",
        "http://150.95.115.212:8000",
        "http://150.95.115.212",
        "http://localhost:3000",
        "http://localhost:3001",
        "https://pay.momangshow.vn/api",
        "http://127.0.0.1:5500"
      ],
      credentials: true
    },
  });

  const PORT = 3000;

  // Professional CORS Configuration
  app.use(cors({
    origin: [
      "http://localhost:8000",
      "http://localhost:8080",
      "http://momangshow.vn", "https://momangshow.vn",
      "http://www.momangshow.vn", "https://www.momangshow.vn",
      "http://api.momangshow.vn", "https://api.momangshow.vn",
      "http://admin.momangshow.vn", "https://admin.momangshow.vn",
      "http://150.95.115.212:8080",
      "http://150.95.115.212:8000",
      "http://150.95.115.212",
      "http://localhost:3000",
      "http://localhost:3001",
      "https://pay.momangshow.vn/api",
      "http://127.0.0.1:5500"
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  }));

  // Make io accessible to our router
  app.use((req, res, next) => {
    req.io = io;
    next();
  });

  // Global Security Filter (JWT)
  app.use("/api", jwtAuthenticationFilter);

  // Security Middlewares
  app.use(helmet({
    contentSecurityPolicy: false,
  }));

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: { error: "Too many requests from this IP, please try again later." },
    validate: { xForwardedForHeader: false }
  });
  app.use("/api/", limiter);
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  app.use(morgan("dev"));
  // app.use(express.json());

  // API Routes - REAL DATA ONLY
  app.use("/api/auth", authRoutes);
  app.use("/api/images", imageRoutes);
  app.use("/api/categories", categoryRoutes);
  app.use("/api/weekly-menu", weeklyMenuRoutes);
  app.use("/api/menu", menuRoutes);
  app.use("/api/combos", comboRoutes);
  app.use("/api/tables", tableRoutes);
  app.use("/api/orders", orderRoutes);
  app.use("/api/payments", paymentRoutes);
  app.use("/api/bank-accounts", bankAccountRoutes);
  app.use("/api/stats", statsRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/notifications", notificationRoutes);

  // Global Error Handler
  app.use((err, req, res, next) => {
    console.error(err.stack);

    // Handle Zod validation errors specifically
    if (err.name === "ZodError") {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Dữ liệu không hợp lệ",
          details: err.errors.map(e => ({ path: e.path, message: e.message }))
        }
      });
    }

    const statusCode = err.statusCode || err.status || 500;
    const errorCode = err.errorCode || "INTERNAL_SERVER_ERROR";
    const message = err.message || "Internal Server Error";

    res.status(statusCode).json({
      success: false,
      error: {
        code: errorCode,
        message,
      }
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);
    
    socket.on("setup_user", (role) => {
      if (["admin", "staff", "chef"].includes(role)) {
        socket.join("admin_hub");
        console.log(`✅ Socket ${socket.id} joined admin_hub as ${role}`);
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
