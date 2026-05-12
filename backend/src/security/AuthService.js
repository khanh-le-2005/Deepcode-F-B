import { User } from '../models/User.js';
import JwtUtil from './JwtUtil.js';
import { UnauthorizedError } from '../utils/AppError.js';

class AuthService {
  async authenticateUser(email, password) {
    const user = await User.findOne({ email });
    if (!user) {
      throw new UnauthorizedError('Email hoặc mật khẩu không chính xác');
    }
    
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new UnauthorizedError('Email hoặc mật khẩu không chính xác');
    }
    
    const userObj = user.toObject();
    delete userObj.password;
    
    const token = JwtUtil.generateToken({
      id: user._id,
      role: user.role,
      email: user.email,
      name: user.name
    });

    const refreshToken = JwtUtil.generateRefreshToken({
      id: user._id,
      role: user.role
    });

    return { user: userObj, token, refreshToken };
  }

  async refreshToken(token) {
    const decoded = JwtUtil.verifyToken(token);
    if (!decoded) {
      throw new UnauthorizedError('Refresh token không hợp lệ hoặc đã hết hạn');
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      throw new UnauthorizedError('Người dùng không tồn tại');
    }

    const newToken = JwtUtil.generateToken({
      id: user._id,
      role: user.role,
      email: user.email,
      name: user.name
    });

    const newRefreshToken = JwtUtil.generateRefreshToken({
      id: user._id,
      role: user.role
    });

    return { token: newToken, refreshToken: newRefreshToken };
  }
}

export default new AuthService();
