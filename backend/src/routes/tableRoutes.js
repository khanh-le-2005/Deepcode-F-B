import express from "express";
import {
  getTables,
  createTable,
  updateTable,
  deleteTable,
} from "../controllers/tableController.js";
import { authorize } from "../security/SecurityMiddleware.js";

const router = express.Router();

// Public: Khách cần GET để kiểm tra trạng thái bàn khi quét QR
router.get("/", getTables);

// FIX #6: Chỉ Admin/Staff mới được tạo/sửa/xóa bàn
router.post("/", authorize(["admin"]), createTable);
router.put("/:id", authorize(["admin", "staff"]), updateTable);
router.patch("/:id", authorize(["admin", "staff"]), updateTable);
router.delete("/:id", authorize(["admin"]), deleteTable);

export default router;
