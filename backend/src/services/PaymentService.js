import { Payment } from "../models/Payment.js";
import { Order } from "../models/Order.js";
import { Table } from "../models/Table.js";
import { BankAccount } from "../models/BankAccount.js";
import payos from "../config/payos.js";
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
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3001";
      const isKiosk = order.orderType === "delivery" || order.orderType === "takeaway";
      
      // Kiosk → Success page, Bàn → Tracking page
      const redirectPath = isKiosk 
        ? `/success?orderId=${order._id}` 
        : `/table/${order.tableId}/tracking`;

      const body = {
        orderCode: order.orderCode,
        amount: order.total,
        description: `${order.orderCode}`,
        items: order.items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.basePrice
        })),
        returnUrl: `${frontendUrl}${redirectPath}`,
        cancelUrl: `${frontendUrl}${redirectPath}`,
      };

      const paymentLink = await payos.paymentRequests.create(body);
      console.log("PayOS Payment Link Created:", paymentLink.id || paymentLink.paymentLinkId);

      return {
        orderId: order._id,
        amount: order.total,
        checkoutUrl: paymentLink.checkoutUrl,
        qrCode: paymentLink.qrCode,
        paymentContent: body.description, // Trả về để hiện thị cho khách
        paymentLinkId: paymentLink.paymentLinkId,
      };
    } catch (error) {
      console.error("PayOS API FINAL Error:", error?.message || error);
      let errorDetail = error?.message || String(error);
      if (error?.response?.data) {
        console.error("PayOS Error Details:", error.response.data);
        errorDetail = JSON.stringify(error.response.data);
      }
      
      return {
        orderId: order._id,
        amount: order.total,
        qrCode: "", // Để frontend hiện "Không có QR" hoặc dự phòng
        qrBase64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        paymentContent: `DC ${order.orderCode}`,
        isMock: true,
        gatewayWarning: `Cổng PayOS lỗi: ${errorDetail}`
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
    // Xác thực chữ ký Webhook từ PayOS để bảo mật
    let data;
    try {
      data = payos.webhooks.verify(payload);
    } catch (e) {
      console.error("Webhook verification failed:", e);
      return false;
    }
    
    if (!data) return false;
    const { orderCode, amount, status } = data;
    if (status !== "PAID") return false;

    const order = await Order.findOne({ orderCode: orderCode });
    if (!order) throw new NotFoundError(`Order với mã ${orderCode} không tồn tại`);

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

    order.completedByName = "Hệ thống tự động (PayOS)";
    await order.save();

    const orderData = await Order.findById(order._id);
    let tableNameStr = orderData?.tableName;
    if (!tableNameStr && orderData?.tableId) {
      // Dự phòng: Nếu order cũ không có tableName, tìm trong bảng Table
      try {
        const table = await Table.findById(orderData.tableId);
        if (table) tableNameStr = table.name;
        else if (mongoose.Types.ObjectId.isValid(orderData.tableId)) {
           const t2 = await Table.findById(orderData.tableId);
           if (t2) tableNameStr = t2.name;
        }
      } catch (e) {
        tableNameStr = orderData.tableId; // Dùng ID làm fallback
      }
    }
    tableNameStr = tableNameStr || "Bàn không xác định";

    const defaultBank = await BankAccount.findOne({ isDefault: true });
    let bankNameSnapshotStr = "MBBank / Không rõ STK";
    if (defaultBank) {
      bankNameSnapshotStr = `${defaultBank.bankName} - ${defaultBank.accountNo} (${defaultBank.accountName})`;
    }

    await Payment.create({
      orderId: order._id,
      amount: order.total,
      method: "Chuyển khoản (PayOS)",
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