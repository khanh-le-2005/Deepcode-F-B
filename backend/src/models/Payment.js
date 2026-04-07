// models/Payment.js
import mongoose from "mongoose";
import { globalSchemaOptions } from "../utils/schemaOptions.js";

const paymentSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    amount: { type: Number, required: true },
    method: { type: String, default: "Cash" }, // Tiền mặt, QR, Thẻ...

    // THÊM DÒNG NÀY: Lưu lại tài khoản ngân hàng nhận tiền
    bankAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BankAccount",
      default: null,
    },

    // LƯU VẾT LỊCH SỬ CỐ ĐỊNH (Tránh việc xóa Bàn/Xóa Ngân hàng bị mất data)
    tableName: { type: String, default: "Chưa xác định" }, // Tên bàn hoặc người mang đi
    orderTypeSnapshot: { type: String, default: "dine_in" }, // dine_in, takeaway, delivery
    bankNameSnapshot: { type: String, default: "Tiền mặt" }, // Tên ngân hàng & STK
    cashierName: { type: String, default: "Hệ thống tự động" }, // Thu ngân nào thao tác

    status: { type: String, default: "success" },
  },
  globalSchemaOptions,
);

paymentSchema.index({ orderId: 1 });
paymentSchema.index({ createdAt: -1 });

export const Payment = mongoose.model("Payment", paymentSchema);
