import { User } from '../models/User.js';
import JwtUtil from './JwtUtil.js';
import { UnauthorizedError } from '../utils/AppError.js';

class AuthService {
  async authenticateUser(email, password) {
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      throw new UnauthorizedError('Email hoặc mật khẩu không chính xác');
    }
    
    const userObj = user.toObject();
    delete userObj.password;

    const payload = {
      id: user._id,
      role: user.role,
      email: user.email,
      name: user.name
    };

    const token = JwtUtil.generateToken(payload);
    const refreshToken = JwtUtil.generateRefreshToken(payload);

    return { user: userObj, token, refreshToken };
  }

  async refreshAccessToken(refreshToken) {
    const decoded = JwtUtil.verifyRefreshToken(refreshToken);
    if (!decoded) {
      throw new UnauthorizedError('Refresh token không hợp lệ hoặc đã hết hạn');
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      throw new UnauthorizedError('Tài khoản không tồn tại');
    }

    const payload = { id: user._id, role: user.role, email: user.email, name: user.name };
    const newToken = JwtUtil.generateToken(payload);
    const newRefreshToken = JwtUtil.generateRefreshToken(payload);

    return { token: newToken, refreshToken: newRefreshToken };
  }
}

export default new AuthService();
