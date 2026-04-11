import mongoose from "mongoose";
import { globalSchemaOptions } from "../utils/schemaOptions.js";

const notificationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["new_order", "payment_success", "system_alert"],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Order", // Thường chiếu tới Order hoặc Payment tùy type
    },
    isRead: { type: Boolean, default: false },
  },
  globalSchemaOptions,
);

export const Notification = mongoose.model("Notification", notificationSchema);
