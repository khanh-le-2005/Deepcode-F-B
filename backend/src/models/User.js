import mongoose from "mongoose";
import { globalSchemaOptions } from "../utils/schemaOptions.js";

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, enum: ["admin", "staff", "chef"], default: "staff" },
    // Thêm mảng lưu trữ Refresh Token để quản lý phiên đăng nhập
    refreshTokens: [{ type: String }],
  },
  globalSchemaOptions,
);

export const User = mongoose.model("User", userSchema);
