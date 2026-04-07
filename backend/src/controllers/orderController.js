import OrderService from "../services/OrderService.js";
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
  const session = await OrderService.updateOrderItemQuantity(
    sessionId,
    itemId,
    delta,
    req.io
  );
  res.json(session);
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
  const { page, limit, start, end, type } = req.query;
  const types = type ? type.split(',') : [];
  const history = await OrderService.getOrderHistory(page, limit, start, end, types);
  res.json(history);
});
