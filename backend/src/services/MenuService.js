import { MenuItem } from '../models/MenuItem.js';
import { NotFoundError } from '../utils/AppError.js';

class MenuService {
  async getMenuItems(query = {}) {
    // Nếu có categoryId, lọc mảng theo Object Id
    const filter = {};
    if (query.categoryId) {
      filter.categoryId = query.categoryId;
    }
    
    // Nối ngoại (populate) để lấy thêm thông tin category (tên, ảnh, slug)
    return MenuItem.find(filter).populate('categoryId', 'name slug image status').sort({ createdAt: -1 });
  }

  async getMenuItemById(id) {
    const item = await MenuItem.findById(id).populate('categoryId', 'name slug image status');
    if (!item) throw new NotFoundError('Menu item not found');
    return item;
  }

  async createMenuItem(data, io) {
    const item = new MenuItem(data);
    await item.save();
    const populated = await item.populate('categoryId', 'name slug image status');
    if (io) {
      io.emit("menu-updated", await this.getMenuItems());
    }
    return populated;
  }

  async updateMenuItem(id, data, io) {
    const item = await MenuItem.findByIdAndUpdate(id, data, { new: true }).populate('categoryId', 'name slug image status');
    if (!item) throw new NotFoundError('Menu item not found');
    if (io) {
      io.emit("menu-updated", await this.getMenuItems());
    }
    return item;
  }

  async deleteMenuItem(id, io) {
    const item = await MenuItem.findByIdAndDelete(id);
    if (!item) throw new NotFoundError('Menu item not found');
    if (io) {
      io.emit("menu-updated", await this.getMenuItems());
    }
    return item;
  }

  // --- WEEKLY MENU V2 ---
  async getWeeklyMenuItems() {
    // Chỉ lấy các món có availableUntil >= ngày hiện tại VÀ status là available
    return MenuItem.find({
      status: "available",
      availableUntil: { $exists: true, $ne: null, $gte: new Date() },
    }).populate("categoryId");
  }

  async getAdminMenuItems() {
    // Admin lấy tất cả
    return MenuItem.find().populate("categoryId").sort({ createdAt: -1 });
  }

  async publishWeekly(itemIds, io) {
    // Set thời hạn 7 ngày cho các món được chọn
    const availableUntil = new Date();
    availableUntil.setDate(availableUntil.getDate() + 7);

    await MenuItem.updateMany(
      { _id: { $in: itemIds } },
      { $set: { availableUntil } }
    );

    if (io) {
      io.emit("menu-updated", { message: "weekly-menu-published" });
    }
    return { success: true, count: itemIds.length, availableUntil };
  }

  async unpublishWeekly(id, io) {
    const item = await MenuItem.findByIdAndUpdate(
      id,
      { $set: { availableUntil: null } },
      { new: true }
    );
    if (!item) throw new NotFoundError('Menu item not found');
    
    if (io) {
      io.emit("menu-updated", { message: "weekly-menu-unpublished", id });
    }
    return item;
  }
}

export default new MenuService();
