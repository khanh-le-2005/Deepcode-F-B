import "dotenv/config";
import express from "express";
import "express-async-errors";
import morgan from "morgan";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
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

app.use(cookieParser());

// Global Security Filter (JWT)
app.use("/api", jwtAuthenticationFilter);

// Security Middlewares
app.use(
  helmet({
    contentSecurityPolicy: false,
  }),
);
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: "Too many requests from this IP, please try again later." },
  validate: { xForwardedForHeader: false },
});
app.use("/api/", limiter);

// FIX #8: Rate limiter riêng khắt hơn cho API công khai nhạy cảm
const orderLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 phút
  max: 30, // Tối đa 30 request/phút/IP
  message: { error: "Quá nhiều request. Vui lòng thử lại sau 1 phút." },
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
