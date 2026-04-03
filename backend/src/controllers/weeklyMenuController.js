import WeeklyMenuService from '../services/WeeklyMenuService.js';
import { catchAsync } from "../utils/catchAsync.js";

// Khách hàng vãng lai (Public) sẽ gọi API này để tải thực đơn của tuần hiện tại
export const getActiveWeeklyMenu = catchAsync(async (req, res) => {
  const activeMenu = await WeeklyMenuService.getActiveWeeklyMenu();
  res.json(activeMenu);
});

// Nội bộ Admin quản lý
export const getWeeklyMenus = catchAsync(async (req, res) => {
  const menus = await WeeklyMenuService.getWeeklyMenus();
  res.json(menus);
});

export const getWeeklyMenuById = catchAsync(async (req, res) => {
  const menu = await WeeklyMenuService.getWeeklyMenuById(req.params.id);
  res.json(menu);
});

export const createWeeklyMenu = catchAsync(async (req, res) => {
  const menu = await WeeklyMenuService.createWeeklyMenu(req.body, req.io);
  res.status(201).json(menu);
});

export const updateWeeklyMenu = catchAsync(async (req, res) => {
  const menu = await WeeklyMenuService.updateWeeklyMenu(req.params.id, req.body, req.io);
  res.json(menu);
});

export const deleteWeeklyMenu = catchAsync(async (req, res) => {
  await WeeklyMenuService.deleteWeeklyMenu(req.params.id, req.io);
  res.json({ message: 'Danh sách tuần này đã bị xóa' });
});
