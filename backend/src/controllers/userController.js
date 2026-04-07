// src/controllers/userController.js
import UserService from "../services/user.service.js";
import { catchAsync } from "../utils/catchAsync.js";
import { z } from "zod";

// Schema Tạo User
const createUserSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
  name: z.string().min(2, "Tên phải có ít nhất 2 ký tự"),
  role: z.enum(["admin", "staff", "chef"]).optional(),
});

// Schema Sửa User (Các trường đều là optional)
const updateUserSchema = z.object({
  email: z.string().email("Email không hợp lệ").optional(),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự").optional(),
  name: z.string().min(2, "Tên phải có ít nhất 2 ký tự").optional(),
  role: z.enum(["admin", "staff", "chef"]).optional(),
});

// [POST] Thêm user
export const createUser = catchAsync(async (req, res) => {
  const validatedData = createUserSchema.parse(req.body);
  const newUser = await UserService.createUser(validatedData);
  res
    .status(201)
    .json({
      success: true,
      message: "Tạo tài khoản thành công",
      user: newUser,
    });
});

// [GET] Lấy danh sách user
export const getAllUsers = catchAsync(async (req, res) => {
  const users = await UserService.getAllUsers();
  res.json({ success: true, users });
});

// [PUT] Sửa user
export const updateUser = catchAsync(async (req, res) => {
  const { id } = req.params; // Lấy ID từ URL
  const validatedData = updateUserSchema.parse(req.body); // Validate dữ liệu gửi lên

  const updatedUser = await UserService.updateUser(id, validatedData);

  res.json({
    success: true,
    message: "Cập nhật thành công",
    user: updatedUser,
  });
});

// [DELETE] Xóa user
export const deleteUser = catchAsync(async (req, res) => {
  const { id } = req.params; // Lấy ID từ URL

  await UserService.deleteUser(id);

  res.json({ success: true, message: "Xóa người dùng thành công" });
});
