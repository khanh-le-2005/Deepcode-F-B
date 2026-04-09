import { Order } from '../models/Order.js';
import { Table } from '../models/Table.js';

class StatsService {
  async getStats() {
    const orders = await Order.find().sort({ createdAt: -1 });
    const tables = await Table.find();
    
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const todayOrders = orders.filter(o => o.createdAt && o.createdAt.toISOString().startsWith(todayStr));
    const revenue = todayOrders.filter(o => o.status === 'paid').reduce((acc, o) => acc + o.total, 0);
    const activeTables = tables.filter(t => t.status === 'occupied').length;
    const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'cooking').length;

    const dailyRevenueMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('vi-VN', { weekday: 'short' });
      dailyRevenueMap[dateStr] = { name: dayName, value: 0 };
    }

    orders.forEach(o => {
      if (o.status === 'paid' && o.createdAt) {
        const dateStr = o.createdAt.toISOString().split('T')[0];
        if (dailyRevenueMap[dateStr]) dailyRevenueMap[dateStr].value += o.total;
      }
    });

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
      if (o.status === 'paid' && o.createdAt) {
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

    const paidOrders = orders.filter(o => o.status === 'paid');
    const averageOrderValue = paidOrders.length > 0 
      ? Math.round(paidOrders.reduce((acc, o) => acc + o.total, 0) / paidOrders.length)
      : 0;

    let totalServiceTime = 0;
    let serviceTimeCount = 0;
    paidOrders.forEach(o => {
      if (o.createdAt && o.updatedAt) {
        const diffMs = o.updatedAt.getTime() - o.createdAt.getTime();
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
      averageOrderValue,
      averageServiceTime,
      returnRate
    };
  }
}

export default new StatsService();
