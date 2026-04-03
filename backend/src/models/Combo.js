import mongoose from 'mongoose';
import { globalSchemaOptions } from '../utils/schemaOptions.js';

const comboSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  image: { type: String },
  menuItemIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' }], // Danh sách món ăn trong Combo
  price: { type: Number, required: true }, // Giá cố định của Combo (VD: Combo 3 món 199k)
  status: { type: String, enum: ['available', 'unavailable'], default: 'available' }
}, globalSchemaOptions);

export const Combo = mongoose.model('Combo', comboSchema);
