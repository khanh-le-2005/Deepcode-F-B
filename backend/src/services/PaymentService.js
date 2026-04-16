import { Payment } from "../models/Payment.js";
import { Order } from "../models/Order.js";
import { Table } from "../models/Table.js";
import { BankAccount } from "../models/BankAccount.js";
import paymentGateway from "../utils/paymentGatewayClient.js";
import { NotFoundError, BadRequestError, ServiceUnavailableError } from "../utils/AppError.js";

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
      orderId,
      amount,
      method,
      bankAccountId: bankAccountId || null,
      tableName: tableNameStr,
      bankNameSnapshot: bankNameSnapshotStr,
      cashierName: user ? user.name : "Thu ngân ấn nút",
    });
    payment = await payment.save();

    const updateData = { paymentStatus: "paid", status: "completed", completedAt: new Date() };
    if (user) {
      updateData.completedBy = user.id;
      updateData.completedByName = user.name;
    }

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
      console.warn("Payment Gateway unavailable, using fallback mock QR.");
      return {
        orderId: order._id,
        amount: order.total,
        qrBase64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        paymentContent: `DC ${order._id.toString().slice(-6).toUpperCase()}`,
        isMock: true,
        warning: "Hệ thống ngân hàng đang gián đoạn, đây là mã QR giả lập để test."
      };
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

    const order = await Order.findById(orderId);
    if (!order) throw new NotFoundError("Order không tồn tại");

    if (order.paymentStatus === "paid") return true;

    order.paymentStatus = "paid";

    const isKiosk = order.orderType === "delivery" || order.orderType === "takeaway";

    if (isKiosk) {
      order.status = "active";
      order.items.forEach(item => {
        if (item.status === "awaiting_payment") {
          item.status = "pending_approval";
        }
      });
    } else {
      order.status = "completed";
      order.completedAt = new Date();
      await Table.findByIdAndUpdate(order.tableId, { status: "empty" });
    }

    order.completedByName = "Hệ thống tự động (MBBank Auto)";
    await order.save();

    const orderData = await Order.findById(orderId).populate("tableId");
    const tableNameStr = orderData?.tableName || orderData?.tableId?.name || "Bàn không xác định";

    const defaultBank = await BankAccount.findOne({ isDefault: true });
    let bankNameSnapshotStr = "MBBank / Không rõ STK";
    if (defaultBank) {
      bankNameSnapshotStr = `${defaultBank.bankName} - ${defaultBank.accountNo} (${defaultBank.accountName})`;
    }

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

    if (io) {
      io.emit("order-paid", { orderId: order._id, paymentStatus: "paid" });
      io.emit("order-updated", order);
      io.emit("tables-updated", await Table.find());

      // ---------- THÊM NOTIFICATION CHUẨN Ở ĐÂY ----------
      if (isKiosk) {
        const orderLabel = order.orderType === "delivery" ? "Giao hàng" : "Mang về";
        const customerName = order.customerInfo?.name || "Khách vãng lai";

        io.emit("notification:staff", {
          type: "success",
          title: `💰 Khách chuyển khoản thành công`,
          message: `Đơn [${orderLabel}] của khách ${customerName} đã thanh toán ${order.total.toLocaleString('vi-VN')}đ. Vui lòng duyệt món xuống bếp!`,
          orderId: order._id,
          sound: "success"
        });
      } else {
        io.emit("notification:staff", {
          type: "success",
          title: `💸 Bàn đã thanh toán`,
          message: `Bàn [${tableNameStr}] tự quét mã QR thanh toán thành công ${order.total.toLocaleString('vi-VN')}đ. Đã chốt bàn.`,
          orderId: order._id,
          sound: "success"
        });
      }
    }

    return true;
  }
}

export default new PaymentService();