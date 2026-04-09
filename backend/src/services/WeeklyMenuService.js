import { WeeklyMenu } from '../models/WeeklyMenu.js';
import { NotFoundError, BadRequestError } from '../utils/AppError.js';

class WeeklyMenuService {
  async getWeeklyMenus() {
    return WeeklyMenu.find().sort({ startDate: -1 });
  }

  async getWeeklyMenuById(id) {
    const menu = await WeeklyMenu.findById(id).populate({
      path: 'menuItems',
      populate: { path: 'categoryId', select: 'name slug image status' }
    });
    if (!menu) throw new NotFoundError('Danh sách xuất món tuần không tồn tại');
    return menu;
  }

  // Hàm mấu chốt để quét xem Hôm Nay đang nằm trong Tuần Bán nào
  async getActiveWeeklyMenu() {
    const now = new Date();

    try {
      const activeWeek = await WeeklyMenu.findOne({
        startDate: { $lte: now },
        endDate: { $gte: now },
        status: 'active'
      }).populate({
        path: 'menuItems',
        match: { status: 'available' },
        populate: { path: 'categoryId', select: 'name slug image status' }
      });

      if (!activeWeek) return null;
      return activeWeek;

    } catch (err) {
      // Nếu populate bị lỗi (VD: dữ liệu cũ không hợp lệ), trả về null thay vì crash
      console.error('[WeeklyMenuService] getActiveWeeklyMenu populate error:', err.message);
      return null;
    }
  }

  async createWeeklyMenu(data, io) {
    if (!data.title || !data.startDate || !data.endDate) {
      throw new BadRequestError('Vui lòng điền đủ Tên tuần, Ngày Bắt đầu và Ngày Kết thúc');
    }
    
    // Kiểm tra trùng lặp thời gian
    const overlappingMenu = await WeeklyMenu.findOne({
      $or: [
        { startDate: { $lte: data.endDate, $gte: data.startDate } },
        { endDate: { $gte: data.startDate, $lte: data.endDate } },
        { startDate: { $lte: data.startDate }, endDate: { $gte: data.endDate } }
      ]
    });

    // Mặc dù overlappingMenu có thật, nhưng nếu thiết kế chặt mình có thể chặn. Tuy nhiên, Admin đôi khi muốn tạo 2 tuần đè lên nhau, mình cảnh báo thôi, tạm thời block cho an toàn:
    if (overlappingMenu) {
      throw new BadRequestError('Đã có lịch bán trùng thời gian với tuần này: ' + overlappingMenu.title);
    }

    const menu = new WeeklyMenu(data);
    await menu.save();
    
    if (io) io.emit("weekly-menu-updated");
    return menu;
  }

  async updateWeeklyMenu(id, data, io) {
    const menu = await WeeklyMenu.findByIdAndUpdate(id, data, { new: true });
    if (!menu) throw new NotFoundError('Danh sách tuần không tồn tại');
    
    if (io) io.emit("weekly-menu-updated");
    return menu;
  }

  async deleteWeeklyMenu(id, io) {
    const menu = await WeeklyMenu.findByIdAndDelete(id);
    if (!menu) throw new NotFoundError('Danh sách tuần không tồn tại');
    
    if (io) io.emit("weekly-menu-updated");
    return menu;
  }
}

export default new WeeklyMenuService();
