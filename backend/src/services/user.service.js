// src/services/user.service.js
import { User } from "../models/User.js";
import { BadRequestError } from "../utils/AppError.js";
import bcrypt from "bcryptjs";

class UserService {
  // 1. THÊM MỚI (Đã làm ở trên)
  async createUser(userData) {
    const { email, password, name, role } = userData;

    const existingUser = await User.findOne({ email });
    if (existingUser) throw new BadRequestError("Email này đã được sử dụng");

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      email,
      password: hashedPassword,
      name,
      role: role || "staff",
    });

    const userResponse = newUser.toObject();
    delete userResponse.password;
    return userResponse;
  }

  // 2. LẤY DANH SÁCH USER (Bỏ qua password)
  async getAllUsers() {
    return await User.find().select("-password");
  }

  // 3. SỬA USER
  async updateUser(userId, updateData) {
    // 3.1 Nếu cập nhật email, kiểm tra xem email mới đã ai dùng chưa (loại trừ user hiện tại)
    if (updateData.email) {
      const existingEmail = await User.findOne({
        email: updateData.email,
        _id: { $ne: userId },
      });
      if (existingEmail)
        throw new BadRequestError("Email này đã được người khác sử dụng");
    }

    // 3.2 Nếu cập nhật mật khẩu, phải mã hóa lại
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    // 3.3 Cập nhật và trả về user mới (loại bỏ password)
    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true, // Trả về document sau khi update
      runValidators: true,
    }).select("-password");

    if (!updatedUser)
      throw new BadRequestError("Không tìm thấy người dùng này");

    return updatedUser;
  }

  // 4. XÓA USER
  async deleteUser(userId) {
    const deletedUser = await User.findByIdAndDelete(userId);
    if (!deletedUser)
      throw new BadRequestError("Không tìm thấy người dùng để xóa");

    return deletedUser;
  }
}

export default new UserService();
