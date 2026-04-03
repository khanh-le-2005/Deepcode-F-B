import express from "express";
import * as bankAccountController from "../controllers/bankAccountController.js";
import { authorize } from "../security/SecurityMiddleware.js";

const router = express.Router();

// Public hoặc Khách hàng (Cần gọi lúc thanh toán để lấy thông tin tạo QR)
router.get("/default", bankAccountController.getDefaultBankAccount);

// Chỉ Admin mới được quản lý (Thêm/Sửa/Xóa/Xem tất cả)
router.post("/", authorize(["admin"]), bankAccountController.createBankAccount);
router.get("/", authorize(["admin"]), bankAccountController.getBankAccounts);
router.put(
  "/:id",
  authorize(["admin"]),
  bankAccountController.updateBankAccount,
);
router.delete(
  "/:id",
  authorize(["admin"]),
  bankAccountController.deleteBankAccount,
);

export default router;
