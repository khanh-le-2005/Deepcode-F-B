import { Payment } from "../models/Payment.js";
import { Order } from "../models/Order.js";
import { Table } from "../models/Table.js";
import { BankAccount } from "../models/BankAccount.js";
import { Notification } from "../models/Notification.js";
import paymentGateway from "../utils/paymentGatewayClient.js";
import { NotFoundError, BadRequestError, ServiceUnavailableError } from "../utils/AppError.js";

class PaymentService {
  async processPayment(data, user = null) {
    const { orderId, amount, method, bankAccountId } = data;

    // FIX #3: Kiểm tra idempotency - tránh thanh toán kép
    const existingOrder = await Order.findById(orderId);
    if (!existingOrder) throw new NotFoundError("Order không tồn tại");
    if (existingOrder.paymentStatus === "paid") {
      throw new BadRequestError(
        "Đơn hàng này đã được thanh toán rồi! Không thể thu tiền 2 lần.",
      );
    }

    // Trích xuất Tên Bàn cụ thể
    const orderObj = await Order.findById(orderId).populate("tableId");
    const tableNameStr =
      orderObj?.tableName || orderObj?.tableId?.name || "Mang đi / Đã xóa bàn";

    // Trích xuất chi tiết Ngân hàng thụ hưởng
    let bankNameSnapshotStr = method || "Tiền mặt";
    if (bankAccountId) {
      const bank = await BankAccount.findById(bankAccountId);
      if (bank) {
        bankNameSnapshotStr = `${bank.bankName} - ${bank.accountNo} (${bank.accountName})`;
      }
    }

    // Lưu lịch sử giao dịch (chụp dữ liệu cứng tại thời điểm thanh toán)
    let payment = new Payment({
      orderId,
      amount,
      method,
      bankAccountId: bankAccountId || null,
      tableName: tableNameStr,
      bankNameSnapshot: bankNameSnapshotStr,
      cashierName: user ? user.name : "Thu ngân ấn nút",
    });
    payment = await payment.save();

    // Cập nhật ngày chốt đơn và ai là người thu tiền
    const updateData = { 
      paymentStatus: "paid", 
      status: "completed", // Đóng vòng đời phục vụ
      completedAt: new Date() 
    };
    if (user) {
      updateData.completedBy = user.id;
      updateData.completedByName = user.name;
    }

    // Đóng Order (Phiên)
    const order = await Order.findByIdAndUpdate(orderId, updateData, {
      new: true,
    });

    // Giải phóng Bàn (chuyển bàn về trạng thái 'empty')
    if (order) {
      await Table.findByIdAndUpdate(
        order.tableId,
        { status: "empty" },
        { new: true },
      );
    }

    return payment;
  }

  async generatePaymentQR(orderId) {
    const order = await Order.findById(orderId);
    if (!order) throw new NotFoundError("Order not found");
    // FIX #4: Dùng đúng trường paymentStatus thay vì status
    if (order.paymentStatus === "paid") {
      throw new BadRequestError("Đơn hàng này đã được thanh toán, không cần tạo QR mới");
    }

    try {
      const response = await paymentGateway.post("/create-payment/", {
        user_id: order._id.toString(),
        amount: order.total,
      });

      return {
        orderId: order._id,
        amount: order.total,
        qrBase64: response.data.qr_base64,
        paymentContent: response.data.payment_content,
      };
    } catch (error) {
      throw new ServiceUnavailableError(
        "Hệ thống ngân hàng tạm thời gián đoạn. Xin vui lòng thanh toán bằng Tiền Mặt tại quầy!",
        "BANK_GATEWAY_DOWN"
      );
    }
  }

  async getPayments() {
    return Payment.find()
      .populate("bankAccountId", "bankName accountNo accountName")
      .populate("orderId", "tableId total")
      .sort({ createdAt: -1 });
  }

  async handleWebhook(payload, io) {
    const orderId = payload.booking_id;

    // 1. Tìm Order
    const order = await Order.findById(orderId);
    if (!order) throw new NotFoundError("Order không tồn tại");

    // 2. Idempotency Check: Tránh Webhook bị gọi 2 lần gây lặp giao dịch
    if (order.paymentStatus === "paid") {
      return true;
    }

    // 3. Đóng đơn hàng & ghi nhận thanh toán
    order.paymentStatus = "paid";
    order.status = "completed";
    order.completedAt = new Date();
    order.completedByName = "Hệ thống tự động (MBBank Auto)";
    await order.save();

    // 4. Giải phóng bàn về trạng thái trống
    await Table.findByIdAndUpdate(order.tableId, { status: "empty" });

    // 5. Lấy thông tin bàn để ghi lịch sử
    const orderData = await Order.findById(orderId).populate("tableId");
    const tableNameStr =
      orderData?.tableName || orderData?.tableId?.name || "Bàn không xác định";

    // 5. Lấy thông tin ngân hàng mặc định
    const defaultBank = await BankAccount.findOne({ isDefault: true });
    let bankNameSnapshotStr = "MBBank / Không rõ STK";
    if (defaultBank) {
      bankNameSnapshotStr = `${defaultBank.bankName} - ${defaultBank.accountNo} (${defaultBank.accountName})`;
    }

    // 6. Lưu lịch sử giao dịch (dữ liệu cứng tại thời điểm thu tiền)
    await Payment.create({
      orderId: order._id,
      amount: order.total,
      method: "Chuyển khoản (Bot Python Auto quét)",
      bankAccountId: defaultBank ? defaultBank._id : null,
      tableName: tableNameStr,
      bankNameSnapshot: bankNameSnapshotStr,
      cashierName: "Hệ thống điện tử tự động",
      status: "success",
    });

    // 7. Lưu thông báo vào DB và bắn Socket đến admin_hub
    const notif = await Notification.create({
      type: "payment_success",
      title: "💳 Thanh toán thành công!",
      message: `${tableNameStr} vừa thanh toán ${order.total?.toLocaleString('vi-VN')}đ qua chuyển khoản`,
      referenceId: payment._id,
    });

    if (io) {
      io.to("admin_hub").emit("new_notification", notif);
      io.to("admin_hub").emit("order-paid", { orderId: order._id, paymentStatus: "paid" });
      io.to("admin_hub").emit("order-updated", order);
      io.emit("tables-updated", await Table.find());
    }

    return true;
  }
}

export default new PaymentService();
