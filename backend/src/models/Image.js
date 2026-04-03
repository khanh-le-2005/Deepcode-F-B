import mongoose from 'mongoose';
import { globalSchemaOptions } from '../utils/schemaOptions.js';

const imageSchema = new mongoose.Schema({
  _id: { type: Number }, // Dùng số nguyên làm ID
  name: { type: String, required: true },
  contentType: { type: String, required: true },
  gridFsId: { type: mongoose.Schema.Types.ObjectId, required: true }
}, globalSchemaOptions);

export const Image = mongoose.model('Image', imageSchema);
