import { Order } from '../models/Order.js';
import { Table } from '../models/Table.js';

class StatsService {
  async getOverview(start, end) {
    const orders = await Order.find({
      createdAt: { $gte: start, $lte: end }
    }).lean();

    const tables = await Table.find().lean();
    
    const paidOrders = orders.filter(o => o.paymentStatus === 'paid');
    const totalRevenue = paidOrders.reduce((acc, o) => acc + o.total, 0);
    const totalOrders = paidOrders.length;
    const averageOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
    
    let totalItems = 0;
    let cancelledItems = 0;
    orders.forEach(o => {
      if (o.status !== 'cancelled') {
        o.items.forEach(item => {
          totalItems += item.quantity;
          if (item.status === 'cancelled') cancelledItems += item.quantity;
        });
      }
    });
    
    const cancelledItemRatio = totalItems > 0 ? Number(((cancelledItems / totalItems) * 100).toFixed(2)) : 0;
    
    // Đếm số ID bàn duy nhất có order trong quãng thời gian này (bàn đã phục vụ)
    const servedTablesSet = new Set(orders.filter(o => o.status === 'completed' || o.paymentStatus === 'paid').map(o => o.tableId));
    const tablesServed = servedTablesSet.size;

    return {
      totalRevenue,
      totalOrders,
      averageOrderValue,
      cancelledItemRatio,
      tablesServed
    };
  }

  async getRevenueChart(start, end, groupBy) {
    const orders = await Order.find({
      createdAt: { $gte: start, $lte: end },
      paymentStatus: 'paid'
    }).lean();

    const map = {};
    
    orders.forEach(o => {
      const date = new Date(o.createdAt);
      let key = '';
      if (groupBy === 'day') {
        key = date.toISOString().split('T')[0]; // YYYY-MM-DD
      } else if (groupBy === 'week') {
        const day = date.getDay();
        const diff = date.getDate() - day + (day == 0 ? -6:1);
        const startOfWeek = new Date(date.setDate(diff));
        key = startOfWeek.toISOString().split('T')[0];
      } else if (groupBy === 'month') {
        key = date.toISOString().substring(0, 7); // YYYY-MM
      } else {
        key = date.toISOString().split('T')[0];
      }

      if (!map[key]) map[key] = { revenue: 0, orders: 0 };
      map[key].revenue += o.total;
      map[key].orders += 1;
    });

    return Object.keys(map).sort().map(label => ({
      label,
      revenue: map[label].revenue,
      orders: map[label].orders
    }));
  }

  async getTopItems(start, end, limit) {
    const orders = await Order.find({
      createdAt: { $gte: start, $lte: end }
    }).lean();

    const itemSales = {};
    orders.forEach(o => {
      if (o.status !== 'cancelled') {
        o.items.forEach(item => {
          if (item.status !== 'cancelled') {
            if (!itemSales[item.menuItemId]) {
              itemSales[item.menuItemId] = { name: item.name, totalQuantitySold: 0, totalRevenue: 0 };
            }
            itemSales[item.menuItemId].totalQuantitySold += item.quantity;
            itemSales[item.menuItemId].totalRevenue += item.totalPrice;
          }
        });
      }
    });

    const topList = Object.keys(itemSales).map(id => ({
      menuItemId: id,
      name: itemSales[id].name,
      totalQuantitySold: itemSales[id].totalQuantitySold,
      totalRevenue: itemSales[id].totalRevenue
    })).sort((a, b) => b.totalQuantitySold - a.totalQuantitySold).slice(0, limit);

    return topList;
  }

  async getKitchenPerformance(start, end) {
    const orders = await Order.find({
      createdAt: { $gte: start, $lte: end }
    }).lean();

    let totalCookingTimeMin = 0;
    let totalItemsCooked = 0;
    let pendingApprovalItems = 0;
    let longestWaitTimeMin = 0;

    const now = new Date();

    orders.forEach(o => {
      if (o.status !== 'cancelled') {
        o.items.forEach(item => {
          if (item.status === 'pending_approval') {
            pendingApprovalItems += item.quantity;
            const waitTime = (now.getTime() - new Date(o.createdAt).getTime()) / 60000;
            if (waitTime > longestWaitTimeMin) longestWaitTimeMin = waitTime;
          } else if (item.status === 'served') {
            totalItemsCooked += item.quantity;
            if (item.actionAt) {
              const cookTime = (new Date(item.actionAt).getTime() - new Date(o.createdAt).getTime()) / 60000;
              if (cookTime > 0) {
                totalCookingTimeMin += cookTime * item.quantity;
              }
            }
          }
        });
      }
    });

    const averageCookingTimeMin = totalItemsCooked > 0 ? Number((totalCookingTimeMin / totalItemsCooked).toFixed(2)) : 0;
    longestWaitTimeMin = Number(longestWaitTimeMin.toFixed(2));

    return {
      averageCookingTimeMin,
      totalItemsCooked,
      pendingApprovalItems,
      longestWaitTimeMin
    };
  }
}

export default new StatsService();
