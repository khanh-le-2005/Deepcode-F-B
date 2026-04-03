import express from 'express';
import { login } from '../controllers/authController.js';

const router = express.Router();

router.post('/login', login);

// Lấy thông tin tài khoản hiện tại (Dùng để check token ở Frontend)
router.get('/me', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  res.json(req.user);
});

export default router;
