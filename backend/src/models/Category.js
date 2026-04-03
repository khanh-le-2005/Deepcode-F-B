import mongoose from 'mongoose';
import { globalSchemaOptions } from '../utils/schemaOptions.js';

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  image: { type: String }, // GridFS Id or URL
  status: { type: String, enum: ['available', 'unavailable'], default: 'available' },
  displayOrder: { type: Number, default: 0 }
}, globalSchemaOptions);

// Pre-save hook to generate slug if not provided or name changes
categorySchema.pre('validate', function() {
  if (this.name && (!this.slug || this.isModified('name'))) {
    this.slug = this.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-+/g, '-');
  }
});

categorySchema.index({ slug: 1, status: 1 });

export const Category = mongoose.model('Category', categorySchema);
