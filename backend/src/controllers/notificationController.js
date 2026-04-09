import { Notification } from "../models/Notification.js";
import { catchAsync } from "../utils/catchAsync.js";
import { NotFoundError } from "../utils/AppError.js";

// 1. Get all notifications (Sorted by newest, default limit 50)
export const getNotifications = catchAsync(async (req, res) => {
  const notifications = await Notification.find()
    .sort({ createdAt: -1 })
    .limit(50);

  // Tính số lượng chưa đọc
  const unreadCount = await Notification.countDocuments({ isRead: false });

  res.json({
    success: true,
    data: notifications,
    unreadCount,
  });
});

// 2. Mark a notification as read
export const markAsRead = catchAsync(async (req, res) => {
  const { id } = req.params;
  const notification = await Notification.findByIdAndUpdate(
    id,
    { isRead: true },
    { new: true }
  );

  if (!notification) {
    throw new NotFoundError("Thông báo không tồn tại");
  }

  res.json({
    success: true,
    data: notification,
  });
});

// 3. Mark ALL notifications as read
export const markAllAsRead = catchAsync(async (req, res) => {
  await Notification.updateMany({ isRead: false }, { isRead: true });

  res.json({
    success: true,
    message: "Đã đánh dấu đọc tất cả thông báo",
  });
});
