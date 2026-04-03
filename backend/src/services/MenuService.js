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
}

export default new MenuService();
