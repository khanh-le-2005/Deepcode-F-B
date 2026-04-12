import MenuService from '../services/MenuService.js';
import ImageService from '../services/ImageService.js';
import { catchAsync } from "../utils/catchAsync.js";

export const getMenuItems = catchAsync(async (req, res) => {
  const items = await MenuService.getMenuItems(req.query);
  res.json(items);
});

export const getMenuItemById = catchAsync(async (req, res) => {
  const item = await MenuService.getMenuItemById(req.params.id);
  res.json(item);
});

export const createMenuItem = catchAsync(async (req, res) => {
  let itemData = req.body;
  
  // Nếu client gửi JSON Text qua form-data với key "data"
  if (req.body.data && typeof req.body.data === 'string') {
    itemData = JSON.parse(req.body.data);
  }
  
  // Nếu client gửi file đính kèm, nén và lấy ID gắn vào itemData
  if (req.files && req.files.length > 0) {
    const imageIds = [];
    for (const file of req.files) {
      const savedImage = await ImageService.saveImage(file);
      imageIds.push(savedImage.id); // CHỈ LƯU ID ẢNH
    }
    itemData.images = imageIds;
  }

  const item = await MenuService.createMenuItem(itemData, req.io);
  res.status(201).json(item);
});

export const updateMenuItem = catchAsync(async (req, res) => {
  let itemData = req.body;
  
  if (req.body.data && typeof req.body.data === 'string') {
    itemData = JSON.parse(req.body.data);
  }
  
  // Nếu cập nhật kèm theo hình mới, sẽ ghi đè mảng hình cũ bằng các ID hình mới
  if (req.files && req.files.length > 0) {
    const imageIds = [];
    for (const file of req.files) {
      const savedImage = await ImageService.saveImage(file);
      imageIds.push(savedImage.id);
    }
    itemData.images = imageIds;
  }

  const item = await MenuService.updateMenuItem(req.params.id, itemData, req.io);
  res.json(item);
});

export const publishWeekly = catchAsync(async (req, res) => {
  const { itemIds } = req.body;
  if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
    return res.status(400).json({ error: "Tham số itemIds không được để trống" });
  }

  // Import WeeklyMenuService động để tránh vòng lặp dependencies nếu có
  const { default: WeeklyMenuService } = await import('../services/WeeklyMenuService.js');

  const now = new Date();
  const nextWeek = new Date(now);
  nextWeek.setDate(now.getDate() + 7);

  const menu = await WeeklyMenuService.createWeeklyMenu({
    title: `Thực đơn Xuất bản Siêu tốc - ${now.toLocaleDateString('vi-VN')}`,
    startDate: now,
    endDate: nextWeek,
    menuItems: itemIds,
    status: 'active'
  }, req.io);

  res.json({
    success: true,
    message: "Đã tạo lịch bán tuần mới thành công!",
    weeklyMenu: menu
  });
});

export const deleteMenuItem = catchAsync(async (req, res) => {
  await MenuService.deleteMenuItem(req.params.id, req.io);
  res.json({ message: 'Menu item deleted' });
});
