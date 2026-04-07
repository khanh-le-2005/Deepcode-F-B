import mongoose from 'mongoose';
import { globalSchemaOptions } from '../utils/schemaOptions.js';

const menuItemOptionSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g. "Size L"
  priceExtra: { type: Number, required: true } // e.g. 10000
}, { _id: false });

const menuItemAddonSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g. "Thêm lòng"
  priceExtra: { type: Number, required: true } // e.g. 15000
}, { _id: false });

const menuItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  images: [{ type: String }], // ID của GridFS hoặc URL ảnh
  description: String,
  options: [menuItemOptionSchema], // Tuỳ chọn thêm (Không bắt buộc. Cho phép mảng rỗng [] nếu món không có Option)
  addons: [menuItemAddonSchema], // Có thể chọn nhiều hoặc không chọn
  status: { type: String, enum: ['available', 'unavailable'], default: 'available' }
}, globalSchemaOptions);

menuItemSchema.index({ categoryId: 1, status: 1 });
menuItemSchema.index({ status: 1 });

export const MenuItem = mongoose.model('MenuItem', menuItemSchema);
