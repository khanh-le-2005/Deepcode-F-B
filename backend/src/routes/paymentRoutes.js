import express from "express";
import {
  processPayment,
  getPayments,
  mockPayment,
  generateQR,
  receivePayosWebhook,
  verifyPayment,
  verifyPaymentByOrderId,
  simulateSuccessfulPayment,
} from "../controllers/paymentController.js";
import { authorize } from "../security/SecurityMiddleware.js";

const router = express.Router();

// --- API NGHIỆP VỤ (Thu ngân / Admin) ---
router.post("/", authorize(["admin", "staff"]), processPayment);
router.get("/", authorize(["admin", "staff"]), getPayments);

// --- API GIẢ LẬP TEST (Chỉ cấp quyền cho Admin) ---
router.post("/mock", authorize(["admin"]), mockPayment); // Giả lập bấm nút thanh toán
router.post(
  "/webhook-mock/:orderId",
  authorize(["admin"]),
  simulateSuccessfulPayment,
); // Giả lập webhook ngân hàng bắn về

// --- API PUBLIC ---
router.post("/generate-qr/:orderId", generateQR);
router.post("/payos-webhook", receivePayosWebhook);
router.get("/verify/:orderCode", verifyPayment);
router.get("/verify-by-order/:orderId", verifyPaymentByOrderId);

export default router;
