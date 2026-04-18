import OrderService from "../services/OrderService.js";
import PaymentService from "../services/PaymentService.js";
import { NotFoundError } from "../utils/AppError.js";

// ĐÃ XÓA IMPORT catchAsync

export const getOrders = async (req, res) => {
  const orders = await OrderService.getOrders();
  res.json(orders);
};

export const getOrderById = async (req, res) => {
  const order = await OrderService.getOrderById(req.params.id);
  res.json(order);
};

export const getOrderStatus = async (req, res) => {
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
};

export const getOrdersByTableId = async (req, res) => {
  const orders = await OrderService.getOrdersByTableId(req.params.tableId);
  res.json(orders);
};

export const getActiveSession = async (req, res) => {
  const session = await OrderService.getActiveSession(req.params.tableId);
  if (!session) {
    throw new NotFoundError("No active session found for this table");
  }
  res.json(session);
};

export const createOrder = async (req, res) => {
  const session = await OrderService.createOrder(req.body, req.io);
  
  // Trả về QR ngay nếu là đơn chuyển khoản
  if (req.body.paymentMethod === "transfer") {
    try {
      const qrData = await PaymentService.generatePaymentQR(session._id);
      return res.status(201).json({
        ...session.toObject(),
        qrData
      });
    } catch (qrErr) {
      console.error("QR Generation failed for Table Order:", qrErr);
      // Vẫn trả về order nhưng không có QR
    }
  }

  res.status(201).json(session);
};

export const createCounterOrder = async (req, res) => {
  const session = await OrderService.createCounterOrder(req.body, req.io);

  // Trả về QR ngay nếu là đơn chuyển khoản tại quầy
  if (req.body.paymentMethod === "transfer") {
    try {
      const qrData = await PaymentService.generatePaymentQR(session._id);
      return res.status(201).json({
        ...session.toObject(),
        qrData
      });
    } catch (qrErr) {
      console.error("QR Generation failed for Counter Order:", qrErr);
    }
  }

  res.status(201).json(session);
};

export const createKioskOrder = async (req, res) => {
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

      // Thư viện express-async-errors sẽ tự động bắt lỗi này và ném ra Global Error Handler
      throw qrErr;
    }
  }

  // Đơn tiền mặt trả về bình thường
  res.status(201).json(session);
};

export const checkoutCart = async (req, res) => {
  const session = await OrderService.checkoutCart(req.params.sessionId, req.io);
  res.json({ message: "Cart sent to kitchen successfully", session });
};

export const deleteOrderItem = async (req, res) => {
  const session = await OrderService.deleteOrderItem(
    req.params.sessionId,
    req.params.itemId,
    req.io
  );
  res.json(session);
};

export const updateOrderItemQuantity = async (req, res) => {
  const { sessionId, itemId } = req.params;
  const { delta } = req.body;
  const session = await OrderService.updateOrderItemQuantity(sessionId, itemId, delta, req.io);
  res.json(session);
};

export const adminUpdateItemQuantity = async (req, res) => {
  const { sessionId, itemId } = req.params;
  const { delta } = req.body;
  const session = await OrderService.adminUpdateItemQuantity(sessionId, itemId, delta, req.io, req.user);
  res.json(session);
};

export const calculatePrice = async (req, res) => {
  const result = await OrderService.calculatePrice(req.body);
  res.json(result);
};

export const updateItemStatus = async (req, res) => {
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
};

export const approveAllItems = async (req, res) => {
  const session = await OrderService.approveAllItems(req.params.sessionId, req.io, req.user);
  res.json(session);
};

export const updateOrder = async (req, res) => {
  const session = await OrderService.updateOrder(req.params.id, req.body, req.io);
  res.json(session);
};

export const deleteOrder = async (req, res) => {
  await OrderService.deleteOrder(req.params.id, req.io);
  res.json({ message: "Session deleted" });
};

export const completeOrder = async (req, res) => {
  const order = await OrderService.completeOrder(req.params.id, req.io);
  res.json(order);
};

export const getKitchenOrders = async (req, res) => {
  const orders = await OrderService.getKitchenOrders();
  res.json(orders);
};

export const getHistory = async (req, res) => {
  const { page, limit, start, end } = req.query;
  const history = await OrderService.getOrderHistory(page, limit, start, end);
  res.json(history);
};