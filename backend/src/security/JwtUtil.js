import jwt from 'jsonwebtoken';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'access-secret-fallback';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh-secret-fallback';

class JwtUtil {
  // Access Token: sống 1 giờ
  generateToken(payload) {
    return jwt.sign(payload, ACCESS_SECRET, { expiresIn: '1h' });
  }

  // Refresh Token: sống 7 ngày
  generateRefreshToken(payload) {
    return jwt.sign({ id: payload.id }, REFRESH_SECRET, { expiresIn: '7d' });
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, ACCESS_SECRET);
    } catch {
      return null;
    }
  }

  verifyRefreshToken(token) {
    try {
      return jwt.verify(token, REFRESH_SECRET);
    } catch {
      return null;
    }
  }
}

export default new JwtUtil();
