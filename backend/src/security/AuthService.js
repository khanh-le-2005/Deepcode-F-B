import { User } from '../models/User.js';
import JwtUtil from './JwtUtil.js';
import { UnauthorizedError } from '../utils/AppError.js';

class AuthService {
  async authenticateUser(email, password) {
    const user = await User.findOne({ email, password });
    if (!user) {
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

    return { user: userObj, token };
  }
}

export default new AuthService();
