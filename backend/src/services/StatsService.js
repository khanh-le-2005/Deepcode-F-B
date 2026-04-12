import { Order } from '../models/Order.js';
import { Table } from '../models/Table.js';

class StatsService {
  async getStats() {
    const orders = await Order.find().sort({ createdAt: -1 });
    const tables = await Table.find();
    
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const todayOrders = orders.filter(o => o.createdAt && o.createdAt.toISOString().startsWith(todayStr));
    
    // Doanh thu tính dựa trên paymentStatus === 'paid'
    const revenue = todayOrders
      .filter(o => o.paymentStatus === 'paid')
      .reduce((acc, o) => acc + o.total, 0);

    const activeTables = tables.filter(t => t.status === 'occupied').length;
    const pendingOrders = orders.filter(o => o.status === 'active' && o.items.some(i => ['pending_approval', 'cooking'].includes(i.status))).length;

    // --- Biểu đồ doanh thu 7 ngày ---
    const dailyRevenueMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('vi-VN', { weekday: 'short' });
      dailyRevenueMap[dateStr] = { name: dayName, value: 0 };
    }

    orders.forEach(o => {
      if (o.paymentStatus === 'paid' && o.createdAt) {
        const dateStr = o.createdAt.toISOString().split('T')[0];
        if (dailyRevenueMap[dateStr]) dailyRevenueMap[dateStr].value += o.total;
      }
    });

    // --- Phân loại theo Order Type (Dine-in, Delivery, Takeaway) ---
    const typeStats = {
      dine_in: { name: 'Tại bàn', value: 0 },
      takeaway: { name: 'Mang về', value: 0 },
      delivery: { name: 'Giao hàng', value: 0 }
    };
    orders.forEach(o => {
      if (o.paymentStatus === 'paid') {
        const type = o.orderType || 'dine_in';
        if (typeStats[type]) typeStats[type].value += o.total;
      }
    });
    const orderTypeData = Object.values(typeStats);

    // --- Phân loại theo Payment Method (Cash, Transfer) ---
    const methodStats = {
      cash: { name: 'Tiền mặt', value: 0 },
      transfer: { name: 'Chuyển khoản', value: 0 }
    };
    orders.forEach(o => {
      if (o.paymentStatus === 'paid') {
        const method = o.paymentMethod || 'cash';
        if (methodStats[method]) methodStats[method].value += o.total;
      }
    });
    const paymentMethodData = Object.values(methodStats);

    const itemSales = {};
    orders.forEach(o => {
      if (o.status !== 'cancelled') {
        o.items.forEach(item => {
          if (!itemSales[item.name]) itemSales[item.name] = 0;
          itemSales[item.name] += item.quantity;
        });
      }
    });
    const topItems = Object.keys(itemSales)
      .map(name => ({ name, sales: itemSales[name], trend: '+0%' }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 4);

    const monthlyRevenueMap = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthName = `T${d.getMonth() + 1}`;
      monthlyRevenueMap[monthStr] = { name: monthName, value: 0 };
    }

    orders.forEach(o => {
      if (o.paymentStatus === 'paid' && o.createdAt) {
        const monthStr = o.createdAt.toISOString().substring(0, 7);
        if (monthlyRevenueMap[monthStr]) monthlyRevenueMap[monthStr].value += o.total;
      }
    });

    const categorySales = {};
    let totalCategorySales = 0;
    orders.forEach(o => {
      if (o.status !== 'cancelled') {
        o.items.forEach(item => {
          const cat = item.category || 'Khác';
          if (!categorySales[cat]) categorySales[cat] = 0;
          categorySales[cat] += item.quantity;
          totalCategorySales += item.quantity;
        });
      }
    });
    const categoryData = Object.keys(categorySales).map(name => ({
      name,
      value: totalCategorySales > 0 ? Math.round((categorySales[name] / totalCategorySales) * 100) : 0
    }));

    const paidOrders = orders.filter(o => o.paymentStatus === 'paid');
    const averageOrderValue = paidOrders.length > 0 
      ? Math.round(paidOrders.reduce((acc, o) => acc + o.total, 0) / paidOrders.length)
      : 0;

    let totalServiceTime = 0;
    let serviceTimeCount = 0;
    paidOrders.forEach(o => {
      if (o.createdAt && o.completedAt) {
        const diffMs = o.completedAt.getTime() - o.createdAt.getTime();
        const diffMins = Math.round(diffMs / 60000);
        if (diffMins > 0 && diffMins < 300) {
          totalServiceTime += diffMins;
          serviceTimeCount++;
        }
      }
    });
    const averageServiceTime = serviceTimeCount > 0 ? Math.round(totalServiceTime / serviceTimeCount) : 0;

    const returnRate = orders.length > 0 ? Math.min(85, Math.round((orders.length / (tables.length || 1)) * 15)) : 0;

    return {
      revenue,
      orderCount: todayOrders.length,
      activeTables,
      pendingOrders,
      dailyRevenue: Object.values(dailyRevenueMap),
      topItems,
      monthlyRevenue: Object.values(monthlyRevenueMap),
      categoryData,
      orderTypeData,
      paymentMethodData,
      averageOrderValue,
      averageServiceTime,
      returnRate
    };
  }
}

export default new StatsService();
