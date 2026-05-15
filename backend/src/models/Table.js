import mongoose from 'mongoose';
import { globalSchemaOptions } from '../utils/schemaOptions.js';

const tableSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  status: { type: String, enum: ['empty', 'occupied'], default: 'empty' },
  isVirtual: { type: Boolean, default: false }  // true = bàn ảo từ Kiosk/Counter
}, globalSchemaOptions);

tableSchema.index({ status: 1 });

export const Table = mongoose.model('Table', tableSchema);
