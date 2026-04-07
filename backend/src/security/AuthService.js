import { User } from "../models/User.js";
import JwtUtil from "./JwtUtil.js";
import { UnauthorizedError } from "../utils/AppError.js";
import bcrypt from "bcryptjs";

class AuthService {
  async authenticateUser(email, password) {
    const user = await User.findOne({ email });
    if (!user) {
      throw new UnauthorizedError("Email hoặc mật khẩu không chính xác");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedError("Email hoặc mật khẩu không chính xác");
    }

    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.refreshTokens;

    const payload = {
      id: user._id,
    };

    // Tạo 2 loại token
    const accessToken = JwtUtil.generateAccessToken(payload);
    const refreshToken = JwtUtil.generateRefreshToken({ id: user._id });

    // Lưu Refresh Token vào Database
    user.refreshTokens.push(refreshToken);
    await user.save();

    return { user: userObj, accessToken, refreshToken };
  }

  async refreshAccessToken(oldRefreshToken) {
    if (!oldRefreshToken) {
      throw new UnauthorizedError("Refresh Token không tồn tại");
    }

    // 1. Giải mã kiểm tra token còn hạn không
    const decoded = JwtUtil.verifyRefreshToken(oldRefreshToken);
    if (!decoded) {
      // Nếu token hết hạn, xoá token rác trong DB
      await User.updateOne(
        { refreshTokens: oldRefreshToken },
        { $pull: { refreshTokens: oldRefreshToken } },
      );
      throw new UnauthorizedError(
        "Refresh Token đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.",
      );
    }

    // 2. Tìm User có chứa mã refresh token này không (Chống token bị thu hồi nhưng vẫn cố xài)
    const user = await User.findOne({
      _id: decoded.id,
      refreshTokens: oldRefreshToken,
    });
    if (!user) {
      // Cảnh báo bảo mật: Ai đó đang dùng token cũ đã bị thu hồi -> Xoá sạch mọi token của user này
      await User.updateOne(
        { _id: decoded.id },
        { $set: { refreshTokens: [] } },
      );
      throw new UnauthorizedError(
        "Bảo mật: Phát hiện dấu hiệu bất thường, yêu cầu đăng nhập lại.",
      );
    }

    // 3. Xoay vòng Token (Cấp token mới, xoá token cũ)
    const payload = {
      id: user._id,
    };

    const newAccessToken = JwtUtil.generateAccessToken(payload);
    const newRefreshToken = JwtUtil.generateRefreshToken({ id: user._id });

    // Cập nhật lại mảng token trong DB
    user.refreshTokens = user.refreshTokens.filter(
      (t) => t !== oldRefreshToken,
    );
    user.refreshTokens.push(newRefreshToken);
    await user.save();

    return { newAccessToken, newRefreshToken };
  }

  async logoutUser(refreshToken) {
    if (refreshToken) {
      await User.updateOne(
        { refreshTokens: refreshToken },
        { $pull: { refreshTokens: refreshToken } },
      );
    }
  }
}

export default new AuthService();
