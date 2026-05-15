import JwtUtil from './JwtUtil.js';
import { User } from '../models/User.js';

// Danh sách các URL không cần token (Whitelist giống Spring Security permitAll)
const PUBLIC_PATHS = [
  // --- AUTH ---
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh-token',
  '/api/auth/logout',

  // --- TÀI NGUYÊN CÔNG KHAI ---
  '/api/images',                  // Xem ảnh món ăn
  '/api/menu',                    // Khách xem thực đơn
  '/api/categories',              // Khách lấy danh mục lọc món
  '/api/weekly-menu/active',      // Khách lấy thực đơn tuần hiện tại
  '/api/combos',                  // Khách xem combo

  // --- LUỒNG KHÁCH (QR Scan -> Gọi món -> Thanh Toán) ---
  '/api/orders',         // Khách mở bàn, thêm món vào giỏ, checkout (chỉ các sub-route public)
  '/api/tables',         // Khách kiểm tra trạng thái bàn khi quét QR (chỉ GET)
  '/api/payments/generate-qr',   // Khách tạo QR thanh toán
  '/api/payments/payos-webhook', // PayOS gọi webhook xác nhận thanh toán (PUBLIC - không cần token)
  // NOTE: /api/payments/mock NOT public - yêu cầu token Staff/Admin (FIX #5)
  '/api/bank-accounts/default',  // Khách lấy thông tin ngân hàng để hiển thị QR

  // --- HẠ TẦNG ---
  '/api/ws-notifications',
  '/api/verification',
  '/callback/zalo-oa',
  '/v3/api-docs',
  '/swagger-ui'
];

// Middleware xác thực JWT
export const jwtAuthenticationFilter = async (req, res, next) => {
  // 1. Luôn thử parse token nếu có Header Authorization
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const decoded = JwtUtil.verifyToken(token);
    
    if (decoded) {
      // Bổ sung: Kiểm tra "Online" - User có còn tồn tại trong DB không?
      try {
        const userExists = await User.findById(decoded.id).select('_id role');
        if (userExists) {
          req.user = { 
            id: userExists._id, 
            role: userExists.role,
            ...decoded // Giữ lại email, name từ token để dùng nếu cần
          }; 
        } else {
          req.user = null; // User đã bị xóa
        }
      } catch (err) {
        req.user = null;
      }
    }
  }

  // 2. Kiểm tra nếu là đường dẫn Public → cho qua dù có token hay không
  const isPublic = PUBLIC_PATHS.some(path => req.originalUrl.startsWith(path));
  if (isPublic) {
    return next();
  }

  // 3. Route Private → BẮT BUỘC phải có token hợp lệ VÀ user tồn tại trong DB
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token or user no longer exists' });
  }

  next();
};

// Middleware phân quyền theo Role
export const authorize = (roles = []) => {
  if (typeof roles === 'string') {
    roles = [roles];
  }

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: You do not have permission' });
    }

    next();
  };
};
