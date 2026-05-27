import mongoose from 'mongoose';
import { globalSchemaOptions } from '../utils/schemaOptions.js';

const bannerSchema = new mongoose.Schema({
  title: { type: String, required: true },       // Tiêu đề của banner
  subtitle: { type: String },                    // Phụ đề hoặc mô tả ngắn
  image: { type: String, required: true },       // ID ảnh (GridFS) hoặc URL ảnh banner
  link: { type: String },                        // Đường dẫn liên kết khi click
  displayOrder: { type: Number, default: 0 },    // Thứ tự ưu tiên hiển thị (số nhỏ hiển thị trước)
  status: { 
    type: String, 
    enum: ['active', 'inactive'], 
    default: 'active' 
  },                                             // Trạng thái: active hoặc inactive
  startDate: { type: Date },                     // Ngày bắt đầu áp dụng hiển thị (tùy chọn)
  endDate: { type: Date }                        // Ngày kết thúc hiển thị (tùy chọn)
}, globalSchemaOptions);

bannerSchema.index({ status: 1, displayOrder: 1 });

export const Banner = mongoose.model('Banner', bannerSchema);
