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

    // 2. TRẠNG THÁI TÀI CHÍNH (Tiền bạc) - THÊM MỚI VÀO ĐÂY
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "refunded"],
      default: "unpaid",
    },

    // 3. LOẠI HÌNH PHỤC VỤ
    orderType: {
      type: String,
      enum: ["dine_in", "takeaway", "delivery"],
      default: "dine_in"
    },

    // 4. PHƯƠNG THỨC THANH TOÁN (Kiosk mặc định luôn là tiền mặt)
    paymentMethod: {
      type: String,
      enum: ["cash", "transfer"],
      default: "cash"
    },

    // 5. THÔNG TIN KHÁCH HÀNG (dành cho Takeaway & Delivery)
    customerInfo: {
      name: { type: String },
      phone: { type: String },
      deliveryAddress: { type: String }, // Text tự do: "Lớp 10A", "Phòng 203 Tòa B"...
      note: { type: String }  // Ghi chú thêm cho bếp/shipper
    },

    // 6. IP CỦA KHÁCH (để phần lịch sử/chống lạm dụng)
    clientIp: { type: String },

    completedAt: { type: Date },
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    completedByName: { type: String },

    // 7. PAYOS INTEGRATION - Bắt buộc phải có để thanh toán
    orderCode: { type: Number, unique: true, sparse: true },
  },
  globalSchemaOptions,
);

orderSchema.index({ tableId: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });

// Tự động tạo orderCode (kiểu Number int < 2^53) cho PayOS
orderSchema.pre('save', async function () {
  if (!this.orderCode) {
    // Thuật toán: Random 2 chữ số + 8 chữ số cuối cùa Date.now = số duy nhất và đọc được
    const timePart = String(Date.now()).slice(-8);
    const randomPart = Math.floor(10 + Math.random() * 90);
    this.orderCode = Number(`${timePart}${randomPart}`);
  }
});

export const Order = mongoose.model("Order", orderSchema);
