import mongoose from 'mongoose';
import { globalSchemaOptions } from '../utils/schemaOptions.js';

const weeklyMenuSchema = new mongoose.Schema({
  title: { type: String, required: true }, // e.g. "Thực đơn Tuần 1 - Tháng 4"
  startDate: { type: Date, required: true }, // Ngày bắt đầu bán
  endDate: { type: Date, required: true },   // Ngày kết thúc bán
  menuItems: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' }], // Trích lục danh sách món được phép
  status: { type: String, enum: ['draft', 'active'], default: 'draft' } // Chỉ mang tính hiển thị quản trị (Tuần chưa tới có thể để active, hệ thống vẫn dựa vào Date để chốt)
}, globalSchemaOptions);

// Ensure query performance when finding active week:
weeklyMenuSchema.index({ startDate: 1, endDate: 1 });

export const WeeklyMenu = mongoose.model('WeeklyMenu', weeklyMenuSchema);
