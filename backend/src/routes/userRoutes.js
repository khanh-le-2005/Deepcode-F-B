// src/routes/userRoutes.js
import express from "express";
import {
  createUser,
  getAllUsers,
  updateUser,
  deleteUser,
} from "../controllers/userController.js";

// Import middleware có sẵn của bạn
import { authorize } from "../security/SecurityMiddleware.js";

const router = express.Router();

// Tất cả các API quản lý User đều yêu cầu đăng nhập và có quyền 'admin'
router.use(authorize(["admin"]));

// Lấy danh sách users
router.get("/", getAllUsers);

// Tạo mới user
router.post("/", createUser);

// Sửa user (Cần truyền ID trên URL)
router.put("/:id", updateUser);

// Xóa user (Cần truyền ID trên URL)
router.delete("/:id", deleteUser);

export default router;
