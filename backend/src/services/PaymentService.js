import { Payment } from "../models/Payment.js";
import { Order } from "../models/Order.js";
import { Table } from "../models/Table.js";
import { BankAccount } from "../models/BankAccount.js";
import { NotFoundError, BadRequestError, ServiceUnavailableError } from "../utils/AppError.js";
import pkg from "@payos/node";
const PayOS = pkg.PayOS || pkg;

const payos = new PayOS({
  clientId: process.env.PAYOS_CLIENT_ID || "client_id",
  apiKey: process.env.PAYOS_API_KEY || "api_key",
  checksumKey: process.env.PAYOS_CHECKSUM_KEY || "checksum_key"
});

class PaymentService {
  async processPayment(data, user = null) {
    const { orderId, amount, method, bankAccountId } = data;

    const existingOrder = await Order.findById(orderId);
    if (!existingOrder) throw new NotFoundError("Order không tồn tại");
    if (existingOrder.paymentStatus === "paid") {
      throw new BadRequestError("Đơn hàng này đã được thanh toán rồi! Không thể thu tiền 2 lần.");
    }

    const orderObj = await Order.findById(orderId).populate("tableId");
    const tableNameStr = orderObj?.tableName || orderObj?.tableId?.name || "Mang đi / Đã xóa bàn";

    let bankNameSnapshotStr = method || "Tiền mặt";
    if (bankAccountId) {
      const bank = await BankAccount.findById(bankAccountId);
      if (bank) {
        bankNameSnapshotStr = `${bank.bankName} - ${bank.accountNo} (${bank.accountName})`;
      }
    }

    let payment = new Payment({
      orderId, amount, method,
      bankAccountId: bankAccountId || null,
      tableName: tableNameStr,
      bankNameSnapshot: bankNameSnapshotStr,
      cashierName: user ? user.name : "Thu ngân ấn nút",
    });
    payment = await payment.save();

    const updateData = { paymentStatus: "paid", status: "completed", completedAt: new Date() };
    if (user) { updateData.completedBy = user.id; updateData.completedByName = user.name; }

    const order = await Order.findByIdAndUpdate(orderId, updateData, { new: true });

    if (order) {
      await Table.findByIdAndUpdate(order.tableId, { status: "empty" }, { new: true });
    }

    return payment;
  }

  async generatePaymentQR(orderId) {
    const order = await Order.findById(orderId);
    if (!order) throw new NotFoundError("Order not found");
    if (order.paymentStatus === "paid") {
      throw new BadRequestError("Đơn hàng này đã được thanh toán, không cần tạo QR mới");
    }

    try {
      // Tích hợp thanh toán PayOS
      const domain = process.env.FRONTEND_URL || "http://localhost:3000";
      const body = {
        orderCode: order.orderCode, // Bắt buộc là Number và Sinh tự động ở Order model
        amount: order.total,
        description: `Thanh toan ID ${order._id.toString().slice(-6)}`.substring(0, 25),
        returnUrl: `${domain}/order/${order._id}/success`, 
        cancelUrl: `${domain}/order/${order._id}/cancel`, 
      };

      const paymentLinkResponse = await payos.createPaymentLink(body);

      return {
        orderId: order._id,
        amount: order.total,
        checkoutUrl: paymentLinkResponse.checkoutUrl, 
        qrCode: paymentLinkResponse.qrCode, // Text thuần để hiển thị vietqr
        paymentContent: body.description
      };
    } catch (error) {
      console.error("PayOS Error:", error);
      throw new ServiceUnavailableError("Cổng thanh toán PayOS đang gián đoạn hoặc API Key sai.");
    }
  }

  async getPayments() {
    return Payment.find()
      .populate("bankAccountId", "bankName accountNo accountName")
      .populate("orderId", "tableId total")
      .sort({ createdAt: -1 });
  }

  async handleWebhook(payload, io) {
    let webhookData;
    try {
        // Xác minh Signature của Webhook ngầm từ Server PayOS
        webhookData = payos.verifyPaymentWebhookData(payload);
    } catch (error) {
        console.error("Webhook Verification Failed:", error);
        throw new BadRequestError("Invalid PayOS webhook signature");
    }

    if (webhookData.code !== "00") return true; // Canceled or processing

    const orderCode = webhookData.orderCode;
    const order = await Order.findOne({ orderCode: orderCode });
    if (!order) throw new NotFoundError("Order thuộc PayOS code không tồn tại");

    if (order.paymentStatus === "paid") return true;

    order.paymentStatus = "paid";
    
    const isKiosk = order.orderType === "delivery" || order.orderType === "takeaway";
    
    if (isKiosk) {
      order.status = "active";
      order.items.forEach(item => {
        if (item.status === "awaiting_payment") item.status = "pending_approval";
      });
    } else {
      order.status = "completed";
      order.completedAt = new Date();
      await Table.findByIdAndUpdate(order.tableId, { status: "empty" });
    }

    order.completedByName = "Tự động (PayOS)";
    await order.save();

    const orderData = await Order.findById(order._id).populate("tableId");
    const tableNameStr = orderData?.tableName || orderData?.tableId?.name || "Bàn không xác định";

    await Payment.create({
      orderId: order._id,
      amount: order.total,
      method: "Chuyển khoản (PayOS)",
      bankAccountId: null,
      tableName: tableNameStr,
      bankNameSnapshot: "PayOS Official",
      cashierName: "Hệ thống thanh toán",
      status: "success",
    });

    // Thông báo WebSocket
    if (io) {
      io.to('role_staff').to(`table_${order.tableId}`).emit("order-paid", { orderId: order._id, paymentStatus: "paid" });
      io.to('role_staff').to(`table_${order.tableId}`).emit("order-updated", order);
      io.to('role_staff').emit("tables-updated", await Table.find());

      if (isKiosk) {
        const orderLabel = order.orderType === "delivery" ? "Giao hàng" : "Mang về";
        const customerName = order.customerInfo?.name || "Khách vãng lai";

        io.to('role_staff').emit("notification:staff", {
          type: "success",
          title: `💰 Khách chuyển khoản thành công`,
          message: `Đơn [${orderLabel}] của khách ${customerName} đã thanh toán ${order.total.toLocaleString("vi-VN")}đ qua PayOS. Vui lòng duyệt món xuống bếp!`,
          orderId: order._id,
          sound: "success",
        });
      } else {
        io.to('role_staff').emit("notification:staff", {
          type: "success",
          title: `💸 Bàn đã thanh toán qua PayOS`,
          message: `Bàn [${tableNameStr}] thanh toán thành công ${order.total.toLocaleString("vi-VN")}đ. Đã chốt bàn.`,
          orderId: order._id,
          sound: "success",
        });
      }
    }
    return true;
  }
}

export default new PaymentService();
