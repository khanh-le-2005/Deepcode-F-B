/**
 * ============================================================
 * AUTO-CLEANUP JOB: Tự động hủy đơn Kiosk chuyển khoản quá hạn
 * ============================================================
 *
 * Chạy mỗi 2 phút (setInterval).
 *
 * Logic:
 *   1. Tìm tất cả Order thỏa điều kiện:
 *      - orderType: "delivery" hoặc "takeaway" (chỉ Kiosk)
 *      - paymentMethod: "transfer"
 *      - paymentStatus: "unpaid"
 *      - createdAt < (now - 15 phút)
 *   2. Với mỗi đơn quá hạn:
 *      a) Gọi PayOS API hủy link thanh toán (bằng orderCode)
 *      b) Cập nhật Order → cancelled
 *      c) Giải phóng bàn ảo → empty
 *      d) Emit socket event thông báo cho Staff
 *   3. Log kết quả ra console
 */

import { Order } from "../models/Order.js";
import { Table } from "../models/Table.js";
import payos from "../config/payos.js";

const EXPIRE_MINUTES = 15;
const POLL_INTERVAL_MS = 2 * 60 * 1000; // 2 phút

async function cancelExpiredKioskOrders(io) {
  const cutoff = new Date(Date.now() - EXPIRE_MINUTES * 60 * 1000);

  // 1. Truy vấn: Chỉ đơn KIOSK + chuyển khoản + chưa trả + quá hạn
  const expiredOrders = await Order.find({
    orderType: { $in: ["delivery", "takeaway"] },
    paymentMethod: "transfer",
    paymentStatus: "unpaid",
    status: { $nin: ["cancelled", "completed"] },
    createdAt: { $lt: cutoff },
  });

  if (expiredOrders.length === 0) return;

  console.log(`[AutoCleanup] Tìm thấy ${expiredOrders.length} đơn Kiosk chuyển khoản quá ${EXPIRE_MINUTES} phút.`);

  for (const order of expiredOrders) {
    try {
      // 2a. Hủy link thanh toán trên PayOS
      if (order.orderCode) {
        try {
          await payos.paymentRequests.cancel(order.orderCode, "Hệ thống tự động hủy - quá 15 phút không thanh toán");
          console.log(`[AutoCleanup] ✅ Đã hủy PayOS link: orderCode=${order.orderCode}`);
        } catch (payosErr) {
          // PayOS có thể trả lỗi nếu link đã expired/cancelled rồi → bỏ qua
          console.warn(`[AutoCleanup] ⚠️ PayOS cancel lỗi (có thể đã hủy trước đó): ${payosErr.message}`);
        }
      }

      // 2b. Cập nhật trạng thái Order trong MongoDB
      order.status = "cancelled";
      order.paymentStatus = "cancelled";
      order.completedAt = new Date();
      order.completedByName = "Hệ thống tự động (Auto-Cancel 15p)";
      await order.save();

      // 2c. Xóa bàn ảo (vì là bàn Kiosk nên không cần giữ lại)
      if (order.tableId) {
        await Table.findByIdAndDelete(order.tableId);
      }

      // 2d. Gửi Socket.io thông báo
      if (io) {
        io.emit("order-updated", order);
        io.emit("tables-updated", await Table.find());

        const orderLabel = order.orderType === "delivery" ? "Giao hàng" : "Mang về";
        const customerName = order.customerInfo?.name || "Khách vãng lai";
        const customerPhone = order.customerInfo?.phone || "";

        io.emit("notification:staff", {
          type: "warning",
          title: `⏰ Đơn tự động hủy`,
          message: `Đơn [${orderLabel}] của ${customerName} ${customerPhone} đã quá ${EXPIRE_MINUTES} phút không thanh toán chuyển khoản. Hệ thống đã tự động hủy đơn và link PayOS.`,
          orderId: order._id,
          sound: "cancel",
        });
      }

      console.log(`[AutoCleanup] ✅ Đã hủy đơn: ${order._id} (${order.tableName})`);
    } catch (err) {
      console.error(`[AutoCleanup] ❌ Lỗi khi hủy đơn ${order._id}:`, err.message);
    }
  }

  console.log(`[AutoCleanup] Hoàn tất. Đã xử lý ${expiredOrders.length} đơn.`);
}

/**
 * Khởi động background job.
 * Gọi hàm này 1 lần duy nhất trong server.js sau khi httpServer.listen().
 *
 * @param {import("socket.io").Server} io - Instance Socket.io để emit events
 */
export function startAutoCleanup(io) {
  console.log(`[AutoCleanup] 🚀 Đã khởi động. Quét mỗi ${POLL_INTERVAL_MS / 1000}s, hủy đơn Kiosk transfer > ${EXPIRE_MINUTES} phút.`);

  // Chạy ngay 1 lần khi server khởi động
  cancelExpiredKioskOrders(io).catch(err =>
    console.error("[AutoCleanup] Lỗi lần chạy đầu:", err.message)
  );

  // Lặp lại mỗi 2 phút
  setInterval(() => {
    cancelExpiredKioskOrders(io).catch(err =>
      console.error("[AutoCleanup] Lỗi chu kỳ:", err.message)
    );
  }, POLL_INTERVAL_MS);
}
