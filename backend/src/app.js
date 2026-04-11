import express from "express";
import "express-async-errors";
import morgan from "morgan";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cors from "cors";
import { jwtAuthenticationFilter } from "./security/SecurityMiddleware.js";
import apiRoutes from "./routes/index.js";
import { globalErrorHandler } from "./middleware/errorHandler.js";

const app = express();

app.set("trust proxy", 1);

// Professional CORS Configuration
app.use(
  cors({
    origin: [
      "http://localhost:8000",
      "http://localhost:8080",
      "http://momangshow.vn",
      "https://momangshow.vn",
      "http://www.momangshow.vn",
      "https://www.momangshow.vn",
      "http://api.momangshow.vn",
      "https://api.momangshow.vn",
      "http://admin.momangshow.vn",
      "https://admin.momangshow.vn",
      "http://150.95.115.212:8080",
      "http://150.95.115.212:8000",
      "http://150.95.115.212",
      "http://localhost:3000",
      "http://localhost:3001",
      "https://pay.momangshow.vn/api",
      "http://127.0.0.1:5500",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

// Global Security Filter (JWT)
app.use("/api", jwtAuthenticationFilter);

// Security Middlewares
app.use(
  helmet({
    contentSecurityPolicy: false,
  }),
);

// Specific Rate Limiters for sensitive endpoints

// 1. Auth Limiter: Protect against brute-force (Login)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts per 15 mins
  message: { error: "Quá nhiều lần đăng nhập sai. Vui lòng thử lại sau 15 phút." },
  validate: { xForwardedForHeader: false },
});
app.use("/api/auth/login", authLimiter);

// 2. Weekly Menu Limiter: Protect public menu from excessive crawling
const weeklyMenuLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: { error: "Yêu cầu quá thường xuyên. Vui lòng đợi 1 phút." },
  validate: { xForwardedForHeader: false },
});
app.use("/api/weekly-menu/active", weeklyMenuLimiter);

// 3. Order Limiter: Protect against spam orders
const orderLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: { error: "Quá nhiều request đặt hàng. Vui lòng thử lại sau 1 phút." },
  validate: { xForwardedForHeader: false },
});
app.use("/api/orders", orderLimiter);

const paymentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 phút
  max: 10, // Tối đa 10 request thanh toán/phút/IP
  message: { error: "Quá nhiều yêu cầu thanh toán. Vui lòng chờ 1 phút." },
  validate: { xForwardedForHeader: false },
});
app.use("/api/payments", paymentLimiter);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(morgan("dev"));

// Inject IO dynamically (set from server.js)
app.use((req, res, next) => {
  req.io = app.get("io");
  next();
});

// API Routes
app.use("/api", apiRoutes);
// Global Error Handler
app.use(globalErrorHandler);

export default app;
