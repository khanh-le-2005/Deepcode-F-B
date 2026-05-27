import { Combo } from '../models/Combo.js';
import { BadRequestError, NotFoundError } from '../utils/AppError.js';

class ComboService {
  async getCombos() {
    return Combo.find().populate('menuItemIds');
  }

  async getComboById(id) {
    const combo = await Combo.findById(id).populate('menuItemIds');
    if (!combo) throw new NotFoundError('Combo not found');
    return combo;
  }

  async createCombo(data) {
    if (!data.name || typeof data.name !== 'string') {
      throw new BadRequestError('Combo name is required');
    }
    
    // Cast price to number if it is a string representing a number
    if (data.price !== undefined && data.price !== null) {
      data.price = Number(data.price);
    }

    if (data.price === undefined || data.price === null || isNaN(data.price)) {
      throw new BadRequestError('Combo price is required and must be a number');
    }
    const combo = new Combo(data);
    return combo.save();
  }

  async updateCombo(id, data) {
    const combo = await Combo.findByIdAndUpdate(id, data, { new: true }).populate('menuItemIds');
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
