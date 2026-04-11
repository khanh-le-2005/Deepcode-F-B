import { Order } from "../models/Order.js";
import { Table } from "../models/Table.js";
import { Payment } from "../models/Payment.js";
import mongoose from "mongoose";
import crypto from "crypto";
import { NotFoundError, BadRequestError } from "../utils/AppError.js";
import WeeklyMenuService from "./WeeklyMenuService.js";

class OrderService {
  async _findTable(tableId) {
    if (!tableId) return null;
    if (mongoose.Types.ObjectId.isValid(tableId)) {
      const byId = await Table.findById(tableId);
      if (byId) return byId;
    }
    const bySlug = await Table.findOne({ slug: tableId });
    if (bySlug) return bySlug;

    if (/^\d+$/.test(String(tableId))) {
      const byGenSlug = await Table.findOne({ slug: `ban-${tableId}` });
      if (byGenSlug) return byGenSlug;
      const byName = await Table.findOne({
        name: new RegExp(`${tableId}$`, "i"),
      });
      if (byName) return byName;
    }
    return null;
  }

  async getOrders() {
    return Order.find().sort({ createdAt: -1 });
  }

  async getOrderById(id) {
    const order = await Order.findById(id);
    if (!order) throw new NotFoundError("Session not found");
    return order;
  }

  async getOrdersByTableId(tableId) {
    const table = await this._findTable(tableId);
    if (!table) throw new NotFoundError("Table not found");
    return Order.find({ tableId: String(table._id) }).sort({ createdAt: -1 });
  }

  async getActiveSession(tableId) {
    const table = await this._findTable(tableId);
    if (!table) throw new NotFoundError("Table not found");
    return Order.findOne({ tableId: String(table._id), status: "active" });
  }

  async createOrder(data, io) {
    if (!data.tableId) {
      throw new BadRequestError("Table ID is required to create an order");
    }
    if (!data.items || data.items.length === 0) {
      throw new BadRequestError("Cart must contain at least one item");
    }

    const table = await this._findTable(data.tableId);
    if (!table) throw new NotFoundError("Table not found");

    const activeMenu = await WeeklyMenuService.getActiveWeeklyMenu();
    // Nếu chưa có lịch tuần → cho phép đặt tất cả món (chế độ không giới hạn)
    const allowedIds = activeMenu
      ? activeMenu.menuItems.map(m => String(m._id || m))
      : null;

    // Calculate total for incoming items
    let newItemsTotal = 0;
    const newItems = data.items.map((item) => {
      const basePrice = item.basePrice || item.price || 0;
      const menuItemId = item.id || item.menuItemId || item._id;
      const menuItemIdStr = String(menuItemId);

      // Chỉ kiểm tra nếu có lịch tuần active
      if (allowedIds && !allowedIds.includes(menuItemIdStr)) {
        throw new BadRequestError(`Món '${item.name || menuItemIdStr}' chưa được xuất bán trong tuần này!`);
      }

      let itemPrice = Number(basePrice);
      if (item.selectedOption && item.selectedOption.priceExtra)
        itemPrice += Number(item.selectedOption.priceExtra);
      if (item.selectedAddons && item.selectedAddons.length > 0) {
        item.selectedAddons.forEach((addon) => {
          if (addon.priceExtra) itemPrice += Number(addon.priceExtra);
        });
      }
      const totalPrice = itemPrice * Number(item.quantity || 1);
      newItemsTotal += totalPrice;

      return {
        ...item,
        menuItemId: String(menuItemId),
        basePrice: Number(basePrice),
        totalPrice,
        status: "in_cart", // Mới: Thêm vào Giỏ Hàng Chung của Bàn
      };
    });

    // FIX #3: Kiểm tra cả paymentStatus để tránh nhồi món vào bill đã thanh toán
    let session = await Order.findOne({
      tableId: String(table._id),
      status: "active",
      paymentStatus: "unpaid",
    });

    if (session) {
      // Nhồi món mới vào phiên cũ
      session = await Order.findByIdAndUpdate(
        session._id,
        { $push: { items: { $each: newItems } } },
        { new: true },
      );
      // Update total
      session.total += newItemsTotal;
      await session.save();
    } else {
      // Tạo phiên mới
      const sessionToken = crypto.randomBytes(16).toString("hex");
      let newOrder = new Order({
        tableId: String(table._id),
        tableName: table.name, // FIX #4: Lưu cứng tên bàn để không mất khi xóa bàn sau này
        sessionToken,
        items: newItems,
        total: newItemsTotal,
        status: "active",
      });
      session = await newOrder.save();
      await Table.findByIdAndUpdate(
        table._id,
        { status: "occupied" },
        { new: true },
      );
    }

    if (io) {
      io.emit("new-order", session);
      io.emit("tables-updated", await Table.find());
    }
    return session;
  }

  async calculatePrice(items) {
    if (!items || items.length === 0) {
      return { items: [], totalCartPrice: 0 };
    }

    let totalCartPrice = 0;
    const calculatedItems = items.map((item) => {
      const basePrice = item.basePrice || item.price || 0;
      let itemPrice = Number(basePrice);
      
      let optionExtra = 0;
      let addonExtra = 0;

      if (item.selectedOption && item.selectedOption.priceExtra) {
        optionExtra = Number(item.selectedOption.priceExtra);
        itemPrice += optionExtra;
      }

      if (item.selectedAddons && item.selectedAddons.length > 0) {
        item.selectedAddons.forEach((addon) => {
          if (addon.priceExtra) {
            const extra = Number(addon.priceExtra);
            addonExtra += extra;
            itemPrice += extra;
          }
        });
      }

      const quantity = Number(item.quantity || 1);
      const totalPrice = itemPrice * quantity;
      
      totalCartPrice += totalPrice;

      return {
        ...item,
        calculated: {
          basePrice: Number(basePrice),
          itemPricePerUnit: itemPrice, // Giá 1 món sau khi cộng option/addon
          optionExtra,
          addonExtra,
          quantity,
          totalPrice // Tổng giá trị của mục này (sau khi nhân quantity)
        }
      };
    });

    return { calculatedItems, totalCartPrice };
  }

  async createCounterOrder(data, io) {
    if (!data.items || data.items.length === 0) {
      throw new BadRequestError("Order must contain at least one item");
    }

    let tableIdStr;

    if (data.tableId) {
      // 1. Khách ngồi tại bàn thực tế nhưng gọi qua Thu Ngân/Staff, truyền kèm tableId
      const table = await this._findTable(data.tableId);
      if (!table) throw new NotFoundError("Table not found");
      tableIdStr = String(table._id);
      await Table.findByIdAndUpdate(
        table._id,
        { status: "occupied" },
        { new: true },
      );
    } else {
      // 2. Khách vãng lai mang đi (Không có tableId), tự sinh ra 1 bàn ảo
      const tableName =
        data.tableName ||
        "Mang đi - " + new Date().getHours() + "h" + new Date().getMinutes();
      const slug = crypto.randomBytes(4).toString("hex");
      const table = new Table({ name: tableName, status: "occupied", slug });
      await table.save();
      tableIdStr = String(table._id);
    }

    const activeMenu = await WeeklyMenuService.getActiveWeeklyMenu();
    // Nếu chưa có lịch tuần → cho phép đặt tất cả món (chế độ không giới hạn)
    const allowedIds = activeMenu
      ? activeMenu.menuItems.map(m => String(m._id || m))
      : null;

    let newItemsTotal = 0;
    const newItems = data.items.map((item) => {
      const basePrice = item.basePrice || item.price || 0;
      const menuItemId = item.id || item.menuItemId || item._id;
      const menuItemIdStr = String(menuItemId);

      // Chỉ kiểm tra nếu có lịch tuần active
      if (allowedIds && !allowedIds.includes(menuItemIdStr)) {
        throw new BadRequestError(`Món '${item.name || menuItemIdStr}' chưa được xuất bán trong tuần này!`);
      }

      let itemPrice = Number(basePrice);
      if (item.selectedOption && item.selectedOption.priceExtra)
        itemPrice += Number(item.selectedOption.priceExtra);
      if (item.selectedAddons && item.selectedAddons.length > 0) {
        item.selectedAddons.forEach((addon) => {
          if (addon.priceExtra) itemPrice += Number(addon.priceExtra);
        });
      }
      const totalPrice = itemPrice * Number(item.quantity || 1);
      newItemsTotal += totalPrice;

      return {
        ...item,
        menuItemId: String(menuItemId),
        basePrice: Number(basePrice),
        totalPrice,
        status: "pending_approval", // Gửi thẳng xuống bếp
      };
    });

    let session = await Order.findOne({
      tableId: tableIdStr,
      status: "active",
    });

    if (session) {
      // Nhồi món mới nếu bàn này đã có session
      session = await Order.findByIdAndUpdate(
        session._id,
        { $push: { items: { $each: newItems } } },
        { new: true },
      );
      session.total += newItemsTotal;
      await session.save();
    } else {
      // Bàn mới toanh
      const sessionToken = crypto.randomBytes(16).toString("hex");
      let newOrder = new Order({
        tableId: tableIdStr,
        sessionToken,
        items: newItems,
        total: newItemsTotal,
        status: "active",
      });
      session = await newOrder.save();
    }

    if (io) {
      io.emit("new-order", session);
      io.emit("order-updated", session);
      io.emit("tables-updated", await Table.find());
    }
    return session;
  }

  async checkoutCart(sessionId, io) {
    const session = await Order.findOneAndUpdate(
      { _id: sessionId, "items.status": "in_cart" },
      { $set: { "items.$[elem].status": "pending_approval" } },
      { arrayFilters: [{ "elem.status": "in_cart" }], new: true },
    );
    if (!session) throw new NotFoundError("Session not found or Cart is empty");
    if (io) io.emit("order-updated", session);
    return session;
  }

  async deleteOrderItem(sessionId, itemId, io) {
    const session = await Order.findById(sessionId);
    if (!session) throw new NotFoundError("Session not found");

    const itemIndex = session.items.findIndex(
      (item) => item._id.toString() === itemId,
    );
    if (itemIndex === -1) throw new NotFoundError("Item not found");

    const item = session.items[itemIndex];
    if (item.status !== "in_cart") {
      throw new BadRequestError("Không thể xóa món đã được gửi bếp");
    }

    session.total -= item.totalPrice;
    session.items.splice(itemIndex, 1);
    
    await session.save();
    
    if (io) io.emit("order-updated", session);
    return session;
  }


  async updateOrderItemQuantity(sessionId, itemId, delta, io) {
    const session = await Order.findById(sessionId);
    if (!session) throw new NotFoundError("Session not found");

    const itemIndex = session.items.findIndex(
      (item) => item._id.toString() === itemId,
    );
    if (itemIndex === -1) throw new NotFoundError("Item not found");

    const item = session.items[itemIndex];
    if (item.status !== "in_cart" && item.status !== "pending_approval") {
      throw new BadRequestError("Chỉ có thể thay đổi số lượng món khi đang trong giỏ hoặc chờ duyệt");
    }

    const pricePerUnit = item.totalPrice / item.quantity;
    const newQuantity = item.quantity + delta;

    if (newQuantity <= 0) {
      // Giảm về 0 thì tự động xoá
      session.total -= item.totalPrice;
      session.items.splice(itemIndex, 1);
    } else {
      // Cập nhật giá
      item.quantity = newQuantity;
      const newTotalPrice = pricePerUnit * newQuantity;
      session.total += (newTotalPrice - item.totalPrice);
      item.totalPrice = newTotalPrice;
    }

    await session.save();
    
    if (io) io.emit("order-updated", session);
    return session;
  }

  async updateItemStatus(sessionId, itemId, status, io, user = null) {
    const updateFields = { "items.$.status": status };
    if (user) {
      updateFields["items.$.actionBy"] = user.id;
      updateFields["items.$.actionByName"] = user.name;
      updateFields["items.$.actionAt"] = new Date();
    }
    const session = await Order.findOneAndUpdate(
      { _id: sessionId, "items._id": itemId },
      { $set: updateFields },
      { new: true },
    );
    if (!session) throw new NotFoundError("Session or Item not found");
    if (io) io.emit("order-updated", session);
    return session;
  }

  async approveAllItems(sessionId, io, user = null) {
    const session = await Order.findById(sessionId);
    if (!session) throw new NotFoundError("Session not found");

    let updated = false;
    session.items.forEach((item) => {
      if (item.status === "pending_approval") {
        item.status = "cooking";
        if (user) {
          item.actionBy = user.id;
          item.actionByName = user.name;
          item.actionAt = new Date();
        }
        updated = true;
      }
    });

    if (updated) {
      await session.save();
      if (io) io.emit("order-updated", session);
    }
    return session;
  }

  async updateOrder(id, data, io) {
    // FIX #2: Xóa "cửa sau" tạo Payment thiếu chi tiết.
    // Việc tạo Payment phải đi qua PaymentService.processPayment() đúng luồng.
    // updateOrder() chỉ được phép đổi trạng thái + dọn bàn nếu completed/cancelled.
    const session = await Order.findByIdAndUpdate(id, data, { new: true });
    if (!session) throw new NotFoundError("Session not found");

    if (session.status === "completed" || session.status === "cancelled") {
      const table = await this._findTable(session.tableId);
      if (table)
        await Table.findByIdAndUpdate(
          table._id,
          { status: "empty" },
          { new: true },
        );
      if (io) io.emit("tables-updated", await Table.find());
    }

    if (io) io.emit("order-updated", session);
    return session;
  }

  async deleteOrder(id, io) {
    const session = await Order.findByIdAndDelete(id);
    if (!session) throw new NotFoundError("Session not found");

    const table = await this._findTable(session.tableId);
    if (table)
      await Table.findByIdAndUpdate(
        table._id,
        { status: "empty" },
        { new: true },
      );
    if (io) io.emit("tables-updated", await Table.find());

    return true;
  }

  async getKitchenOrders() {
    return await Order.find({
      status: "active", // Vẫn là active (bàn đang hoạt động)
      "items.status": { $in: ["pending_approval", "cooking", "served"] },
    });
  }
  async completeOrder(orderId, io) {
    const order = await Order.findById(orderId);
    if (!order) throw new NotFoundError("Order not found");

    order.status = "completed"; // Đóng vòng đời phục vụ
    order.completedAt = new Date();
    await order.save();

    // Bây giờ mới giải phóng bàn vật lý
    await Table.findByIdAndUpdate(order.tableId, { status: "empty" });

    if (io) {
      io.emit("tables-updated", await Table.find());
      io.emit("order-updated", order);
    }
    return order;
  }

  async getOrderHistory(page = 1, limit = 20, startDate, endDate) {
    const query = {
      // SỬA "paid" THÀNH "completed"
      status: { $in: ["completed", "cancelled"] },
    };

    if (startDate && endDate) {
      // Vẫn lọc theo ngày giờ khách rời đi / chốt bàn
      query.completedAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .sort({ completedAt: -1 }) // Sắp xếp đơn mới chốt lên đầu
      .skip((page - 1) * limit)
      .limit(limit);

    return { orders, total, page, totalPages: Math.ceil(total / limit) };
  }
  async getTableHistory(tableId, limit = 10) {
    return await Order.find({
      tableId: String(tableId),
      status: { $in: ["completed", "cancelled"] },
    })
      .sort({ completedAt: -1 })
      .limit(limit);
  }
}

export default new OrderService();
