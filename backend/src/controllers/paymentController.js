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

export const receivePayosWebhook = catchAsync(async (req, res) => {
  try {
    await PaymentService.handleWebhook(req.body, req.io);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Lỗi xử lý Webhook PayOS:", error);
    res.status(400).json({ success: false, message: "Webhook Signature Invalid" });
  }
});

export const simulateSuccessfulPayment = catchAsync(async (req, res) => {
  const { orderId } = req.params;

  // Fake webhook payload is no longer compatible via PaymentService.handleWebhook due to signature check.
  // Giao dịch mock nên được xử lý qua \`/mock\` hoặc Admin.
  throw new BadRequestError("Chức năng này không còn dùng được vì Payload PayOS cần có Signatue. Dùng /mock thay thế.");

  res.status(200).json({
    success: true,
    message: "Đã giả lập thanh toán thành công cho đơn hàng!",
    orderId,
    paymentTime: new Date()
  });
});
