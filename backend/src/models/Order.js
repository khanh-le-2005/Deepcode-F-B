import mongoose from "mongoose";
import { globalSchemaOptions } from "../utils/schemaOptions.js";

// Chi tiết 1 món ăn trong Cùng 1 Phiên (Item-level Tracking)
const orderItemSchema = new mongoose.Schema({
  menuItemId: { type: String }, // Có thể là ID Món hoặc ID Combo
  isCombo: { type: Boolean, default: false },
  name: { type: String, required: true },
  basePrice: { type: Number, required: true },
  quantity: { type: Number, required: true, default: 1 },
  category: String,
  image: String,

  // Customization
  selectedOption: { name: String, priceExtra: Number }, // Ví dụ: Size L (+10k)
  selectedAddons: [{ name: String, priceExtra: Number }], // Ví dụ: [Thêm lòng (+20k), Thêm bún (+10k)]

  // Tài chính của mục này = (basePrice + option + addons) * quantity
  totalPrice: { type: Number, required: true },

  // Trạng thái theo luồng mới: giỏ hàng -> chờ duyệt -> đang nấu -> đã phục vụ -> hủy
  status: {
    type: String,
    enum: ["in_cart", "awaiting_payment", "pending_approval", "cooking", "served", "cancelled"],
    default: "in_cart",
  },

  // Đánh dấu món này đã trả tiền hay chưa (Dùng cho Thanh toán trước)
  isPaid: { type: Boolean, default: false },

  // Lưu vết: Nhân viên nào đã thao tác xác nhận/đổi trạng thái món này, và vào lúc nào
  actionBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  actionByName: { type: String },
  actionAt: { type: Date },
});

const orderSchema = new mongoose.Schema(
  {
    tableId: { type: String, required: true },
    tableName: { type: String, default: "" }, // FIX #4: Lưu cứng tên bàn lúc mở phiên
    sessionToken: { type: String, required: true },
    items: [orderItemSchema],
    total: { type: Number, default: 0 },

    // 1. TRẠNG THÁI PHỤC VỤ (Vòng đời của bàn/phiên)
    status: {
      type: String,
      enum: ["active", "completed", "cancelled"],
      default: "active",
    },

    // 1.5 PHƯƠNG THỨC THANH TOÁN (Lần cuối chọn)
    paymentMethod: {
      type: String,
      enum: ["cash", "transfer", "none"],
      default: "none",
    },

    // 2. TRẠNG THÁI TÀI CHÍNH (Tiền bạc) - THÊM MỚI VÀO ĐÂY
    paymentStatus: {
      type: String,
      enum: ["unpaid", "partially_paid", "paid", "refunded"],
      default: "unpaid",
    },

    completedAt: { type: Date },
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    completedByName: { type: String },
  },
  globalSchemaOptions,
);

orderSchema.index({ tableId: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });

export const Order = mongoose.model("Order", orderSchema);
