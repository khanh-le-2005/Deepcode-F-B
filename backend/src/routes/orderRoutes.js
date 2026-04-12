import express from "express";
import * as orderController from "../controllers/orderController.js";
import { authorize } from "../security/SecurityMiddleware.js";

const router = express.Router();

// --- LUỒNG KHÁCH (Public - Không cần Token) ---
router.post("/calculate-price", orderController.calculatePrice);             // API tính giá cho Frontend (Chuẩn 100% Backend)
router.post("/kiosk", orderController.createKioskOrder);                     // Kiosk: Đặt Mang về / Giao hàng (Public - Tiền mặt)

router.get("/table/:tableId/active-session", orderController.getActiveSession); // Khách quét QR kiểm tra bàn
router.get("/:id/status", orderController.getOrderStatus);                      // Khách kiểm tra trạng thái bill
router.post("/", orderController.createOrder);                                   // Khách thêm món vào giỏ
router.post("/:sessionId/checkout", orderController.checkoutCart);               // Khách chốt giỏ gửi bếp
router.delete("/:sessionId/item/:itemId", orderController.deleteOrderItem);      // Khách xóa món (khi đang ở in_cart)
router.patch("/:sessionId/item/:itemId/quantity", orderController.updateOrderItemQuantity); // Khách tăng giảm số lượng
// --- LUỒNG NHÂN VIÊN / ADMIN (Yêu cầu Token) ---
router.get("/", authorize(["admin", "staff"]), orderController.getOrders);
router.get("/history/all", authorize(["admin", "staff"]), orderController.getHistory);
router.get("/kitchen/all", authorize(["admin", "staff", "chef"]), orderController.getKitchenOrders);
router.get("/kitchen/active", authorize(["admin", "staff", "chef"]), orderController.getKitchenOrders);
router.get("/table/:tableId", authorize(["admin", "staff"]), orderController.getOrdersByTableId);
router.get("/:id", authorize(["admin", "staff"]), orderController.getOrderById);

router.post("/counter", authorize(["staff", "admin"]), orderController.createCounterOrder); // Tạo đơn tại quầy POS

router.put("/:sessionId/approve-all", authorize(["staff", "admin", "chef"]), orderController.approveAllItems);
router.put("/:sessionId/item/:itemId/status", authorize(["staff", "admin", "chef"]), orderController.updateItemStatus);

// FIX #1: PUT/DELETE toàn bộ order giờ yêu cầu token, ngăn khách xóa bill người khác
router.put("/:id", authorize(["staff", "admin"]), orderController.updateOrder);
router.delete("/:id", authorize(["admin"]), orderController.deleteOrder);

export default router;

