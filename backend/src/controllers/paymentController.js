import PaymentService from "../services/PaymentService.js";
import OrderService from "../services/OrderService.js";
import BankAccountService from "../services/BankAccountService.js";
import { catchAsync } from "../utils/catchAsync.js";
import { BadRequestError, NotFoundError } from "../utils/AppError.js";

export const processPayment = catchAsync(async (req, res) => {
  const payment = await PaymentService.processPayment(req.body, req.user);
  res.status(201).json(payment);
});

export const getPayments = catchAsync(async (req, res) => {
  const payments = await PaymentService.getPayments();
  res.json(payments);
});

export const mockPayment = catchAsync(async (req, res) => {
  const { orderId } = req.body;
  if (!orderId) {
    throw new BadRequestError("Vui lòng cung cấp orderId (mã phiên bàn)");
  }

  const order = await OrderService.getOrderById(orderId);
  if (!order) {
    throw new NotFoundError("Session / Bàn này không tồn tại");
  }
  if (order.status === "paid" || order.paymentStatus === "paid") {
    throw new BadRequestError("Hóa đơn này đã được thanh toán rồi!");
  }

  const amount = order.total || 0;
  const defaultBank = await BankAccountService.getDefaultAccount();
  const bankAccountId = defaultBank ? defaultBank._id : null;
  const methodName = defaultBank
    ? `QR ${defaultBank.bankName} (Giả lập)`
    : "QR VNPAY/MOMO (Giả lập Thành Công)";

  const payment = await PaymentService.processPayment(
    {
      orderId,
      amount,
      method: methodName,
      bankAccountId: bankAccountId,
    },
    req.user,
  );

  res.status(200).json({
    success: true,
    message: "Giao dịch giả lập thành công! DB đã đóng bàn và ghi nhận tiền.",
    transactionInfo: payment,
    paymentTime: payment.createdAt
  });
});

export const generateQR = catchAsync(async (req, res) => {
  const qrData = await PaymentService.generatePaymentQR(req.params.orderId);
  res.json(qrData);
});

export const receiveWebhook = catchAsync(async (req, res) => {
  const xSecret = req.headers["x-internal-secret"];
  const expectedSecret =
    process.env.WEBHOOK_SECRET_KEY || "HLG_INTERNAL_SECRET_KEY_VERY_SECURE_2025";

  if (xSecret !== expectedSecret) {
    // Controller returns 403 dynamically. We can throw customized AppError with 403 or just return
    return res.status(403).json({ success: false, error: { message: "Forbidden" } });
  }

  await PaymentService.handleWebhook(req.body, req.io);
  res.status(200).json({ message: "Webhook processed successfully" });
});

export const simulateSuccessfulPayment = catchAsync(async (req, res) => {
  const { orderId } = req.params;

  const mockPayload = {
    booking_id: orderId,
  };

  await PaymentService.handleWebhook(mockPayload, req.io);

  res.status(200).json({
    success: true,
    message: "Đã giả lập thanh toán thành công cho đơn hàng!",
    orderId,
    paymentTime: new Date()
  });
});
