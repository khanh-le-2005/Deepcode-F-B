import mongoose from 'mongoose';
import { globalSchemaOptions } from '../utils/schemaOptions.js';

import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['admin', 'staff', 'chef'], default: 'staff' }
}, globalSchemaOptions);

// Hash password before saving
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  // Graceful Migration: Nếu password trong DB chưa được mã hoá (do seed cũ)
  if (!this.password.startsWith('$2b$') && !this.password.startsWith('$2a$')) {
    if (candidatePassword === this.password) {
      // Cập nhật ngầm để tự động Hash chuẩn cho lần sau
      this.password = candidatePassword;
      await this.save();
      return true;
    }
    return false;
  }
  // So sánh bình thường nếu đã mã hoá
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model('User', userSchema);
