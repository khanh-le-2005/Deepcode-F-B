import { Category } from '../models/Category.js';
import { NotFoundError, BadRequestError } from '../utils/AppError.js';

class CategoryService {
  async getCategories() {
    return Category.find().sort({ displayOrder: 1, createdAt: -1 });
  }

  async getCategoryById(id) {
    const category = await Category.findById(id);
    if (!category) throw new NotFoundError('Danh mục không tồn tại');
    return category;
  }

  async createCategory(data, io) {
    if (!data.name) throw new BadRequestError('Category name is required');
    const existing = await Category.findOne({ name: data.name });
    if (existing) throw new BadRequestError('Tên danh mục đã tồn tại');

    const category = new Category(data);
    await category.save();
    
    if (io) {
      io.emit("categories-updated", await this.getCategories());
    }
    return category;
  }

  async updateCategory(id, data, io) {
    const category = await Category.findByIdAndUpdate(id, data, { new: true });
    if (!category) throw new NotFoundError('Danh mục không tồn tại');
    if (io) {
      io.emit("categories-updated", await this.getCategories());
    }
    return category;
  }

  async deleteCategory(id, io) {
    const category = await Category.findByIdAndDelete(id);
    if (!category) throw new NotFoundError('Danh mục không tồn tại');
    if (io) {
      io.emit("categories-updated", await this.getCategories());
    }
    return category;
  }
}

export default new CategoryService();
