import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'qr-dine-super-secret-key-2024';

class JwtUtil {
  generateToken(payload, expiresIn = '24h') {
    return jwt.sign(payload, JWT_SECRET, { expiresIn });
  }

  generateRefreshToken(payload, expiresIn = '7d') {
    return jwt.sign(payload, JWT_SECRET, { expiresIn });
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return null;
    }
  }
}

export default new JwtUtil();
