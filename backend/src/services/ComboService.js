import { Combo } from '../models/Combo.js';
import { BadRequestError, NotFoundError } from '../utils/AppError.js';

class ComboService {
  async getCombos() {
    return Combo.find().populate({
      path: 'menuItemIds',
      populate: { path: 'categoryId', select: 'name slug image status' }
    });
  }

  async getComboById(id) {
    const combo = await Combo.findById(id).populate({
      path: 'menuItemIds',
      populate: { path: 'categoryId', select: 'name slug image status' }
    });
    if (!combo) throw new NotFoundError('Combo not found');
    return combo;
  }

  async createCombo(data) {
    if (!data.name || typeof data.name !== 'string') {
      throw new BadRequestError('Combo name is required');
    }
    if (!data.price || typeof data.price !== 'number') {
      throw new BadRequestError('Combo price is required and must be a number');
    }
    const combo = new Combo(data);
    return combo.save();
  }

  async updateCombo(id, data) {
    const combo = await Combo.findByIdAndUpdate(id, data, { new: true }).populate({
      path: 'menuItemIds',
      populate: { path: 'categoryId', select: 'name slug image status' }
    });
    if (!combo) throw new NotFoundError('Combo not found');
    return combo;
  }

  async deleteCombo(id) {
    const combo = await Combo.findByIdAndDelete(id);
    if (!combo) throw new NotFoundError('Combo not found');
    return combo;
  }
}

export default new ComboService();
