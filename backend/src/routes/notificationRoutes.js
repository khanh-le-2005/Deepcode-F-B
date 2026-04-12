import express from "express";
import crypto from "crypto";

const router = express.Router();

let memoryNotifications = [];

// Helper để push từ bất cứ đâu, hoặc expose io.
// Nhưng thay vì vậy, ta có thể đón nhận emit từ local sự kiện hoặc
// chỉ làm mock cho Frontend fetch không bị lỗi 404.

router.get("/", (req, res) => {
  // Mock data để khi refresh không bị lỗi trắng trơn
  res.json({
    success: true,
    data: memoryNotifications,
    unreadCount: memoryNotifications.filter(n => !n.isRead).length
  });
});

router.put("/:id/read", (req, res) => {
  const notif = memoryNotifications.find(n => n.id === req.params.id || n._id === req.params.id);
  if (notif) notif.isRead = true;
  res.json({ success: true });
});

router.put("/mark-all-read", (req, res) => {
  memoryNotifications.forEach(n => n.isRead = true);
  res.json({ success: true });
});

// Hàm đặc biệt để Service đẩy thông báo vào RAM
export const pushNotification = (notif) => {
  memoryNotifications.unshift(notif);
  if (memoryNotifications.length > 50) memoryNotifications.pop(); // Giữ tối đa 50
};

export default router;
