import OrderService from "../services/OrderService.js";
import PaymentService from "../services/PaymentService.js";
import { catchAsync } from "../utils/catchAsync.js";
import { NotFoundError } from "../utils/AppError.js";

export const getOrders = catchAsync(async (req, res) => {
  const orders = await OrderService.getOrders();
  res.json(orders);
});

export const getOrderById = catchAsync(async (req, res) => {
  const order = await OrderService.getOrderById(req.params.id);
  res.json(order);
});

export const getOrderStatus = catchAsync(async (req, res) => {
  const order = await OrderService.getOrderById(req.params.id);
  res.json({
    _id: order._id,
    tableId: order.tableId,
    tableName: order.tableName,
    total: order.total,
    status: order.status,
    paymentStatus: order.paymentStatus,
    completedAt: order.completedAt,
    items: order.items.map(i => ({
      _id: i._id,
      name: i.name,
      quantity: i.quantity,
      status: i.status
    }))
  });
});

export const getOrdersByTableId = catchAsync(async (req, res) => {
  const orders = await OrderService.getOrdersByTableId(req.params.tableId);
  res.json(orders);
});

export const getActiveSession = catchAsync(async (req, res) => {
  const session = await OrderService.getActiveSession(req.params.tableId);
  if (!session) {
    throw new NotFoundError("No active session found for this table");
  }
  res.json(session);
});

export const createOrder = catchAsync(async (req, res) => {
  const session = await OrderService.createOrder(req.body, req.io);
  res.status(201).json(session);
});

export const createCounterOrder = catchAsync(async (req, res) => {
  const session = await OrderService.createCounterOrder(req.body, req.io);
  res.status(201).json(session);
});

export const createKioskOrder = catchAsync(async (req, res) => {
  const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
  
  const session = await OrderService.createKioskOrder(req.body, clientIp, req.io);
  
  // Nếu là đơn chuyển khoản, bắt buộc phải tạo được QR mới cho đặt đơn
  if (req.body.paymentMethod === "transfer") {
    try {
      const qrData = await PaymentService.generatePaymentQR(session._id);
      return res.status(201).json({
        ...session.toObject(),
        qrData
      });
    } catch (qrErr) {
      // Xóa đơn vừa tạo vì không thể thanh toán (tránh đơn rác)
      await OrderService.deleteOrder(session._id, req.io);
      
      // Chuyển tiếp lỗi ngân hàng để thông báo cho khách chuyển sang Tiền mặt
      throw qrErr;
    }
  }

  // Đơn tiền mặt trả về bình thường
  res.status(201).json(session);
});

export const checkoutCart = catchAsync(async (req, res) => {
  const session = await OrderService.checkoutCart(req.params.sessionId, req.io);
  res.json({ message: "Cart sent to kitchen successfully", session });
});

export const deleteOrderItem = catchAsync(async (req, res) => {
  const session = await OrderService.deleteOrderItem(
    req.params.sessionId,
    req.params.itemId,
    req.io
  );
  res.json(session);
});

export const updateOrderItemQuantity = catchAsync(async (req, res) => {
  const { sessionId, itemId } = req.params;
  const { delta } = req.body;
  const session = await OrderService.updateOrderItemQuantity(sessionId, itemId, delta, req.io);
  res.json(session);
});

export const calculatePrice = catchAsync(async (req, res) => {
  const result = await OrderService.calculatePrice(req.body);
  res.json(result);
});

export const updateItemStatus = catchAsync(async (req, res) => {
  const { sessionId, itemId } = req.params;
  const { status } = req.body;
  const session = await OrderService.updateItemStatus(
    sessionId,
    itemId,
    status,
    req.io,
    req.user,
  );
  res.json(session);
});

export const approveAllItems = catchAsync(async (req, res) => {
  const session = await OrderService.approveAllItems(req.params.sessionId, req.io, req.user);
  res.json(session);
});

export const updateOrder = catchAsync(async (req, res) => {
  const session = await OrderService.updateOrder(req.params.id, req.body, req.io);
  res.json(session);
});

export const deleteOrder = catchAsync(async (req, res) => {
  await OrderService.deleteOrder(req.params.id, req.io);
  res.json({ message: "Session deleted" });
});

export const getKitchenOrders = catchAsync(async (req, res) => {
  const orders = await OrderService.getKitchenOrders();
  res.json(orders);
});

export const getHistory = catchAsync(async (req, res) => {
  const { page, limit, start, end } = req.query;
  const history = await OrderService.getOrderHistory(page, limit, start, end);
  res.json(history);
});
