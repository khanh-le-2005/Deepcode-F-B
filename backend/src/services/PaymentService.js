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
    // Bỏ qua check paymentStatus === "paid" ở đây vì chúng ta dùng remainingAmount thực tế phía dưới
    // giúp hỗ trợ thanh toán thêm các món mới vào bill cũ.

    // CHỈ TÍNH TIỀN CHO CÁC MÓN CHƯA TRẢ (Item-level Payment)
    const unpaidItems = order.items.filter(item => !item.isPaid && item.status !== 'cancelled');
    const remainingAmountValue = unpaidItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);

    try {
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3001";
      const isKiosk = order.orderType === "delivery" || order.orderType === "takeaway";
      
      // Kiosk → Success page, Bàn → Tracking page
      const redirectPath = isKiosk 
        ? `/success?orderId=${order._id}` 
        : `/table/${order.tableId}/tracking`;

      if (remainingAmountValue <= 0) {
        throw new BadRequestError("Đơn hàng này đã được thanh toán toàn bộ, không có số dư cần trả.");
      }

      // [CRITICAL FIX] Mọi lần bấm thanh toán đều tạo 1 orderCode DUY NHẤT để không bị lỗi 'orderCode đã tồn tại' 
      // hoặc bị mismatch khi frontend đối soát. Nạp đè orderCode vào DB trước khi gọi PayOS.
      const timePart = String(Date.now()).slice(-6);
      const randomPart = Math.floor(100 + Math.random() * 900);
      const newOrderCode = Number(`${timePart}${randomPart}`);

      order.orderCode = newOrderCode;
      await order.save(); // Lưu ngay để DB biết orderCode mới nhất đang chờ đối soát

      const body = {
        orderCode: newOrderCode,
        amount: remainingAmountValue,
        description: `${order.orderCode} (No: ${order.items.length})`,
        items: unpaidItems.map(item => ({
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
        amount: remainingAmountValue,
        qrCode: "", 
        paymentContent: `DC ${order.orderCode}`,
        isMock: true,
        gatewayWarning: `Hệ thống thanh toán trực tuyến đang gặp sự cố. Vui lòng thanh toán bằng TIỀN MẶT tại quầy. (Lỗi: ${errorDetail})`
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
      data = await payos.webhooks.verify(payload);
    } catch (e) {
      console.error("Webhook verification failed:", e);
      return false;
    }
    
    if (!data) return false;
    const { orderCode, amount } = data;
    console.log(`[PayOS Webhook] Verified payload for OrderCode ${orderCode}, amount: ${amount}`);
    
    // Webhook của PayOS mặc định chỉ gửi khi thanh toán thành công (hoặc tuỳ setting, nhưng data.code === "00")
    // Trong một số trường hợp data.code có thể là mảng con, nhưng nếu verify qua là hợp lệ.
    return await this._markOrderAsPaid(orderCode, amount, io);
  }

  async verifyPaymentStatus(orderCode, io) {
    if (!orderCode) throw new BadRequestError("Thiếu orderCode để kiểm tra");
    
    console.log(`[PayOS Verify] Manual/Auto check triggered for OrderCode ${orderCode}`);
    try {
      const paymentInfo = await payos.getPaymentLinkInformation(orderCode);
      console.log(`[PayOS Verify] Current status from API: ${paymentInfo.status}`);

      if (paymentInfo.status === "PAID") {
        const order = await this._markOrderAsPaid(orderCode, paymentInfo.amountPaid, io);
        return { success: true, status: paymentInfo.status, order };
      }

      return { success: false, status: paymentInfo.status };
    } catch (error) {
      console.error(`[PayOS Verify] Error checking PayOS for ${orderCode}:`, error.message);
      throw error;
    }
  }

  async _markOrderAsPaid(orderCode, amountPaid, io) {
    // Tìm order theo orderCode vì webhook sẽ mang orderCode về
    const order = await Order.findOne({ orderCode: orderCode });
    if (!order) {

      console.error(`[PayOS Webhook/Verify] FAILED: Order with code ${orderCode} not found in DB.`);
      throw new NotFoundError(`Order với mã ${orderCode} không tồn tại`);
    }

    // Nếu đã thanh toán rồi thì kiểm tra xem có payment record chưa, nếu chưa thì tạo (phòng trường hợp trùng)
    // Nhưng vì item-level, chúng ta cần duyệt xem có món nào MỚI trả không.
    
    let hasNewPaidItems = false;
    order.items.forEach(item => {
      if (!item.isPaid) {
        item.isPaid = true;
        hasNewPaidItems = true;
      }
    });

    if (hasNewPaidItems) {
      order.markModified("items");
    }

    // Luôn đảm bảo paymentStatus là paid nếu có tiền về
    order.paymentStatus = "paid";

    const isKiosk = order.orderType === "delivery" || order.orderType === "takeaway";
    if (isKiosk) {
      order.status = "active";
      order.items.forEach(item => {
        if (item.status === "awaiting_payment") {
          item.status = "cooking";
        }
      });
      order.markModified("items"); 
    } 

    order.completedByName = "Hệ thống tự động (PayOS)";
    await order.save();

    const orderData = await Order.findById(order._id);
    let tableNameStr = orderData?.tableName || "Bàn không xác định";

    const defaultBank = await BankAccount.findOne({ isDefault: true });
    let bankNameSnapshotStr = "MBBank (PayOS)";
    if (defaultBank) {
      bankNameSnapshotStr = `${defaultBank.bankName} - ${defaultBank.accountNo} (${defaultBank.accountName})`;
    }

    // Ghi nhận lịch sử thanh toán (Tránh duplicate nếu đã xử lý rồi)
    const existingPayment = await Payment.findOne({ orderId: order._id, amount: amountPaid, status: "success" });
    if (!existingPayment) {
      await Payment.create({
        orderId: order._id,
        amount: amountPaid,
        method: "Chuyển khoản (PayOS)",
        bankAccountId: defaultBank ? defaultBank._id : null,
        tableName: tableNameStr,
        bankNameSnapshot: bankNameSnapshotStr,
        cashierName: "Hệ thống điện tử tự động",
        status: "success",
      });
    }

    if (io) {
      io.emit("order-paid", { orderId: order._id, paymentStatus: "paid" });
      io.emit("order-updated", order);
      
      if (isKiosk) {
        io.emit("new-order", order);
        io.emit("notification:kitchen", {
          type: "warning",
          title: "Bếp chú ý: Có đơn Kiosk mới",
          message: `Đơn [${order.tableName}] vừa thanh toán thành công, vui lòng chuẩn bị món!`,
          orderId: order._id,
          sound: "kitchen_ticket.mp3"
        });
      }

      io.emit("tables-updated", await Table.find());

      const orderLabel = order.orderType === "delivery" ? "Giao hàng" : (order.orderType === "takeaway" ? "Mang về" : "Tại bàn");
      const customerName = order.customerInfo?.name || "Khách vãng lai";

      io.emit("notification:staff", {
        type: "success",
        title: `💰 Thanh toán thành công`,
        message: `[${orderLabel}] ${tableNameStr} đã thanh toán ${amountPaid.toLocaleString('vi-VN')}đ qua PayOS.`,
        orderId: order._id,
        sound: "success"
      });
    }

    return order;
  }

  async verifyPaymentByOrderId(orderId, io) {
    // Được sử dụng bởi Frontend Auto-Sync để không phụ thuộc vào old orderCode trên URL
    const order = await Order.findById(orderId);
    if (!order) {
      throw new NotFoundError("Không tìm thấy đơn hàng này để đối soát");
    }

    if (!order.orderCode) {
      return { success: false, message: "Đơn hàng chưa từng tạo mã thanh toán PayOS." };
    }

    // Gọi hàm verifyPaymentStatus cũ (nhưng nay truyền vào orderCode mới nhất từ DB)
    try {
      const result = await this.verifyPaymentStatus(order.orderCode, io);
      return result;
    } catch (error) {
       console.error(`[Verify] OrderId ${orderId} verify failed:`, error.message);
       return { success: false, error: error.message };
    }
  }
}

export default new PaymentService();