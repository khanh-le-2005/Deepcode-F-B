import crypto from "crypto";
import mongoose from "mongoose";
import { Order } from "../models/Order.js";
import { Table } from "../models/Table.js";
import { BadRequestError, NotFoundError } from "../utils/AppError.js";

const normalizeKey = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");

const toObjectIdString = (value) => {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") return String(value._id || value.id || value.toString?.() || "");
  return String(value);
};

const getOrderId = (order) => order?._id?.toString?.() || order?.id || "";

const getItemTotal = (item) => {
  const base = Number(item?.basePrice ?? item?.price ?? 0);
  const optionExtra = Number(item?.selectedOption?.priceExtra ?? 0);
  const addonExtra = Array.isArray(item?.selectedAddons)
    ? item.selectedAddons.reduce((sum, addon) => sum + Number(addon?.priceExtra ?? 0), 0)
    : 0;
  const quantity = Number(item?.quantity ?? 1);
  return (base + optionExtra + addonExtra) * quantity;
};

const buildOrderItem = (item = {}) => ({
  menuItemId: String(item.menuItemId || item.id || ""),
  isCombo: Boolean(item.isCombo),
  name: String(item.name || "Món ăn"),
  basePrice: Number(item.basePrice ?? item.price ?? 0),
  quantity: Math.max(1, Number(item.quantity ?? 1)),
  category: item.category || "",
  image: item.image || "",
  selectedOption: item.selectedOption || undefined,
  selectedAddons: Array.isArray(item.selectedAddons) ? item.selectedAddons : [],
  totalPrice: Number(item.totalPrice ?? getItemTotal(item)),
  status: item.status || "in_cart",
});

const recalcOrderTotal = (items = []) =>
  items.reduce((sum, item) => sum + Number(item.totalPrice ?? getItemTotal(item)), 0);

const findTableDoc = async (tableId) => {
  if (!tableId) return null;

  const key = normalizeKey(tableId);
  const candidates = await Table.find().lean();
  return (
    candidates.find((table) => {
      const idKey = normalizeKey(table._id);
      const slugKey = normalizeKey(table.slug);
      const nameKey = normalizeKey(table.name);
      return idKey === key || slugKey === key || nameKey === key;
    }) || null
  );
};

const resolveTableSnapshot = async (tableId, orderType = "dine_in") => {
  const tableDoc = await findTableDoc(tableId);
  if (tableDoc) {
    return {
      tableId: toObjectIdString(tableDoc._id),
      tableName: tableDoc.name,
    };
  }

  if (orderType === "takeaway") {
    return {
      tableId: tableId || "takeaway",
      tableName: "Mang đi / Takeaway",
    };
  }

  if (orderType === "delivery") {
    return {
      tableId: tableId || "delivery",
      tableName: "Giao hàng",
    };
  }

  return {
    tableId: tableId || "delivery",
    tableName: "Mang đi / Takeaway",
  };
};

class OrderService {
  async getOrders() {
    return Order.find().sort({ createdAt: -1 });
  }

  async getOrderById(id) {
    const order = await Order.findById(id);
    if (!order) {
      throw new NotFoundError("Order không tồn tại");
    }
    return order;
  }

  async getOrdersByTableId(tableId) {
    return Order.find({ tableId }).sort({ createdAt: -1 });
  }

  async getActiveSession(tableId) {
    const normalized = normalizeKey(tableId);
    const orders = await Order.find({ status: "active" }).sort({ createdAt: -1 });

    return (
      orders.find((order) => {
        const tableKey = normalizeKey(order.tableId);
        const nameKey = normalizeKey(order.tableName);
        return tableKey === normalized || nameKey === normalized;
      }) || null
    );
  }

  async createOrder(data, io = null) {
    const items = Array.isArray(data?.items) ? data.items.map(buildOrderItem) : [];
    if (items.length === 0) {
      throw new BadRequestError("Vui lòng chọn ít nhất một món");
    }

    const orderType = data?.orderType || "dine_in";
    const tableIdInput = data?.tableId || orderType;
    const { tableId, tableName } = await resolveTableSnapshot(tableIdInput, orderType);

    if (orderType === "dine_in") {
      const activeSession = await this.getActiveSession(tableIdInput);
      if (activeSession) {
        activeSession.items.push(...items);
        activeSession.total = recalcOrderTotal(activeSession.items);
        await activeSession.save();

        if (io) {
          io.emit("new-order", activeSession);
          io.emit("order-updated", activeSession);
        }

        return activeSession;
      }
    }

    const session = await Order.create({
      tableId,
      tableName,
      sessionToken: crypto.randomUUID(),
      orderType,
      items,
      total: recalcOrderTotal(items),
      status: "active",
      paymentStatus: "unpaid",
    });

    if (io) {
      io.emit("new-order", session);
      io.emit("order-updated", session);
      io.emit("tables-updated", await Table.find());
    }

    return session;
  }

  async createCounterOrder(data, io = null) {
    return this.createOrder(data, io);
  }

  async checkoutCart(sessionId, io = null) {
    const session = await this.getOrderById(sessionId);
    session.items = session.items.map((item) => {
      if (item.status === "in_cart") {
        return { ...item.toObject?.() ?? item, status: "pending_approval" };
      }
      return item;
    });
    session.total = recalcOrderTotal(session.items);
    await session.save();

    if (io) {
      io.emit("order-updated", session);
      io.emit("new-order", session);
    }

    return session;
  }

  async deleteOrderItem(sessionId, itemId, io = null) {
    const session = await this.getOrderById(sessionId);
    const filtered = session.items.filter((item) => toObjectIdString(item._id) !== String(itemId));
    if (filtered.length === session.items.length) {
      throw new NotFoundError("Không tìm thấy món trong đơn");
    }

    session.items = filtered;
    session.total = recalcOrderTotal(session.items);
    await session.save();

    if (io) io.emit("order-updated", session);
    return session;
  }

  async updateOrderItemQuantity(sessionId, itemId, delta, io = null) {
    const session = await this.getOrderById(sessionId);
    const item = session.items.find((entry) => toObjectIdString(entry._id) === String(itemId));
    if (!item) throw new NotFoundError("Không tìm thấy món trong đơn");
    if (item.status !== "in_cart") {
      throw new BadRequestError("Chỉ có thể cập nhật số lượng món trong giỏ");
    }

    const nextQuantity = Number(item.quantity || 1) + Number(delta || 0);
    if (nextQuantity < 1) {
      throw new BadRequestError("Số lượng món phải lớn hơn 0");
    }

    item.quantity = nextQuantity;
    item.totalPrice = getItemTotal(item);
    session.total = recalcOrderTotal(session.items);
    await session.save();

    if (io) io.emit("order-updated", session);
    return session;
  }

  async updateItemStatus(sessionId, itemId, status, io = null, user = null) {
    const allowed = new Set(["pending_approval", "cooking", "served", "cancelled"]);
    if (!allowed.has(status)) {
      throw new BadRequestError("Trạng thái món không hợp lệ");
    }

    const session = await this.getOrderById(sessionId);
    const item = session.items.find((entry) => toObjectIdString(entry._id) === String(itemId));
    if (!item) throw new NotFoundError("Không tìm thấy món trong đơn");

    item.status = status;
    item.actionAt = new Date();
    if (user) {
      item.actionBy = user.id || user._id || user;
      item.actionByName = user.name || "Hệ thống";
    }

    await session.save();

    if (io) io.emit("order-updated", session);
    return session;
  }

  async approveAllItems(sessionId, io = null, user = null) {
    const session = await this.getOrderById(sessionId);
    let changed = false;

    session.items = session.items.map((item) => {
      if (item.status === "pending_approval") {
        changed = true;
        return {
          ...item.toObject?.() ?? item,
          status: "cooking",
          actionAt: new Date(),
          actionBy: user?.id || user?._id || item.actionBy || undefined,
          actionByName: user?.name || item.actionByName || "Hệ thống",
        };
      }
      return item;
    });

    if (changed) {
      await session.save();
      if (io) io.emit("order-updated", session);
    }

    return session;
  }

  async updateOrder(id, data, io = null) {
    const session = await this.getOrderById(id);
    if (data?.status && ["active", "completed", "cancelled"].includes(data.status)) {
      session.status = data.status;
    }
    if (data?.paymentStatus && ["unpaid", "paid", "refunded"].includes(data.paymentStatus)) {
      session.paymentStatus = data.paymentStatus;
    }
    await session.save();

    if (io) io.emit("order-updated", session);
    return session;
  }

  async deleteOrder(id, io = null) {
    const order = await this.getOrderById(id);
    await Order.deleteOne({ _id: order._id });

    if (io) {
      io.emit("order-updated", { ...order.toObject(), status: "cancelled" });
    }

    return true;
  }

  async getKitchenOrders() {
    return Order.find({
      status: "active",
      "items.status": { $in: ["pending_approval", "cooking"] },
    }).sort({ createdAt: -1 });
  }

  async getOrderHistory(page = 1, limit = 20, start = null, end = null, types = []) {
    const query = {};

    if (Array.isArray(types) && types.length > 0) {
      query.orderType = { $in: types };
    }

    if (start || end) {
      query.createdAt = {};
      if (start) query.createdAt.$gte = new Date(start);
      if (end) query.createdAt.$lte = new Date(end);
    }

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Number(limit) || 20);
    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      Order.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      Order.countDocuments(query),
    ]);

    return {
      items,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.max(1, Math.ceil(total / limitNum)),
    };
  }
}

export default new OrderService();
