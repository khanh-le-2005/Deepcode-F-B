import express from "express";
import { login, refreshToken, logout } from "../controllers/authController.js";

const router = express.Router();

router.post("/login", login);
router.post("/refresh-token", refreshToken); // API để cấp lại Access Token
router.post("/logout", logout); // API đăng xuất

// Lấy thông tin tài khoản hiện tại (Middleware kiểm tra Access Token sẽ nằm trước cái này)
router.get("/me", (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Not authenticated" });
  res.json(req.user);
});

export default router;
