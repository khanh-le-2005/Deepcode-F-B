import { Table } from '../models/Table.js';
import mongoose from 'mongoose';
import { BadRequestError, NotFoundError } from '../utils/AppError.js';

const slugify = (value) => {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
};

class TableService {
  async getTables() {
    const tables = await Table.find();
    const missingSlugs = tables.filter(t => !t.slug);
    if (missingSlugs.length > 0) {
      await Promise.all(missingSlugs.map(t => {
        const slug = slugify(t.name);
        return Table.findByIdAndUpdate(t._id, { slug }, { new: true });
      }));
      return Table.find();
    }
    return tables;
  }

  async createTable(data) {
    if (!data.name || typeof data.name !== 'string') {
      throw new BadRequestError('Table name is required');
    }
    const slug = slugify(data.name);
    
    if (await Table.findOne({ slug })) {
      throw new BadRequestError('Table slug already exists');
    }

    return new Table({ ...data, slug }).save();
  }

  async updateTable(id, data) {
    const update = { ...data };
    if (typeof data.name === 'string') {
      const slug = slugify(data.name);
      if (!slug) throw new BadRequestError('Table name is required');
      
      const existing = await Table.findOne({ slug });
      if (existing && String(existing._id) !== String(id)) {
        throw new BadRequestError('Table slug already exists');
      }
      update.slug = slug;
    }

    const table = await Table.findByIdAndUpdate(id, update, { new: true });
    if (!table) throw new NotFoundError('Table not found');
    return table;
  }

  async deleteTable(id) {
    const table = await Table.findByIdAndDelete(id);
    if (!table) throw new NotFoundError('Table not found');
    return table;
  }
}

export default new TableService();
