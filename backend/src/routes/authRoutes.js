import express from 'express';
import * as authController from '../controllers/authController.js';

const router = express.Router();

router.post('/login', (req, res, next) => authController.login(req, res, next));
router.post('/refresh-token', (req, res, next) => authController.refreshToken(req, res, next));

// Lấy thông tin tài khoản hiện tại (Dùng để check token ở Frontend)
router.get('/me', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  res.json(req.user);
});

export default router;
