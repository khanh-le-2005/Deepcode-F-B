// src/services/user.service.js
import { User } from "../models/User.js";
import { BadRequestError } from "../utils/AppError.js";

class UserService {
  // 1. THÊM MỚI (Đã làm ở trên)
  async createUser(userData) {
    const { email, password, name, role } = userData;

    const existingUser = await User.findOne({ email });
    if (existingUser) throw new BadRequestError("Email này đã được sử dụng");

    const newUser = await User.create({
      email,
      password,
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

    // 3.2 Password hashing is now handled automatically by User model pre-save hook

    // 3.3 Cập nhật bằng .save() để kích hoạt pre-save hook (hashing)
    const user = await User.findById(userId);
    if (!user) throw new BadRequestError("Không tìm thấy người dùng này");

    Object.assign(user, updateData);
    await user.save();

    const result = user.toObject();
    delete result.password;
    return result;
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
