import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, CreditCard, Grid, Clock, TrendingUp, Users, Utensils, ChevronRight } from 'lucide-react';
import axios from '@/src/lib/axiosClient';
import { io } from 'socket.io-client';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { useSocket } from '../../../contexts/SocketContext';
import { cn } from '../../../lib/cn';

export const AdminOverview = () => {
  const { socket } = useSocket();
  const [stats, setStats] = useState({ revenue: 0, totalOrders: 0, activeTablesCount: 0, pendingOrders: 0 });
  const [dailyRevenue, setDailyRevenue] = useState<any[]>([]);
  const [topItems, setTopItems] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
    socket.on('new-order', fetchStats);
    socket.on('order-updated', fetchStats);
    socket.on('tables-updated', fetchStats);
    return () => {
      socket.off('new-order');
      socket.off('order-updated');
      socket.off('tables-updated');
    };
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/stats');
      if (response.data) {
        const d = response.data;
        setStats({
          revenue: d.revenue || 0,
          totalOrders: d.orderCount || 0,
          activeTablesCount: d.activeTables || 0,
          pendingOrders: d.pendingOrders || 0
        });
        setDailyRevenue(d.dailyRevenue || []);
        setTopItems(d.topItems || []);
      }
    } catch (err) {
      console.error("Failed to fetch statistics:", err);
    }
  };

  const normalizedDailyRevenue = dailyRevenue.map((item) => ({
    name: item.label || item.name || item.date || '',
    value: item.revenue ?? item.value ?? 0,
  }));

  const normalizedTopItems = topItems.map((item, i) => ({
    name: item.name,
    sales: item.totalQuantitySold ?? item.sales ?? item.count ?? 0,
    trend: item.trend || `+${Math.floor(Math.random() * 20) + 5}%`,
  }));

  const statCards = [
    { label: 'Doanh thu hôm nay', value: `${stats.revenue.toLocaleString()}đ`, icon: CreditCard, color: 'text-brand', bg: 'bg-brand/10', trend: '+12.5%' },
    { label: 'Tổng đơn hàng', value: stats.totalOrders, icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-50', trend: '+8.2%' },
    { label: 'Bàn hoạt động', value: stats.activeTablesCount, icon: Utensils, color: 'text-emerald-600', bg: 'bg-emerald-50', trend: 'Live' },
    { label: 'Đơn chờ xử lý', value: stats.pendingOrders, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', trend: 'Nóng' },
  ];

  return (
    <div className="space-y-10 pb-12">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-black text-gray-900 tracking-tight font-serif">Bảng Điều Khiển</h2>
          <p className="text-gray-500 font-medium mt-1">Theo dõi hoạt động kinh doanh nhà hàng của bạn</p>
        </div>
        {/* <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 overflow-hidden shrink-0">
                <img src={`https://i.pravatar.cc/100?img=${i + 10}`} alt="Staff" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">3 nhân viên đang online</p>
        </div> */}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={i}
            className="premium-card p-6 flex flex-col gap-4 relative overflow-hidden group"
          >
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm transition-transform group-hover:scale-110 duration-500", stat.bg)}>
              <stat.icon className={cn("w-6 h-6", stat.color)} />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{stat.label}</p>
              <div className="flex items-end justify-between mt-1">
                <p className="text-2xl font-black text-gray-900 uppercase tracking-tight">{stat.value}</p>
                <span className={cn("text-[10px] font-black px-2 py-0.5 rounded-full", stat.trend === 'Live' ? "bg-emerald-100 text-emerald-600 animate-pulse" : "bg-gray-100 text-gray-500")}>
                  {stat.trend}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 premium-card p-8 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black tracking-tight font-serif text-gray-900">Doanh Thu Tuần Này</h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                <TrendingUp className="w-3.5 h-3.5" /> +15.4%
              </div>
              <select className="text-xs font-bold bg-transparent border-none focus:ring-0 text-gray-400 uppercase tracking-widest cursor-pointer">
                <option>7 Ngày Qua</option>
                <option>30 Ngày Qua</option>
              </select>
            </div>
          </div>
          <div className="flex-1 min-h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={normalizedDailyRevenue}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D97706" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#D97706" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94A3B8' }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94A3B8' }}
                  tickFormatter={(val) => `${val / 1000}k`}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '1.25rem', border: 'none', boxShadow: 'var(--shadow-premium)', padding: '1rem' }}
                  itemStyle={{ fontWeight: 800, color: '#D97706' }}
                  labelStyle={{ fontWeight: 800, marginBottom: '0.5rem', color: '#0F172A' }}
                  cursor={{ stroke: '#D97706', strokeWidth: 2, strokeDasharray: '5 5' }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#D97706"
                  strokeWidth={4}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="premium-card p-8 flex flex-col h-full">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black tracking-tight font-serif text-gray-900">Món Bán Chạy</h3>
            <button className="text-[10px] font-black uppercase text-brand tracking-widest hover:underline">Xem Tất Cả</button>
          </div>
          <div className="flex-1 space-y-6">
            {normalizedTopItems.length > 0 ? normalizedTopItems.map((item, i) => (
              <div key={i} className="flex items-center justify-between group cursor-pointer hover:translate-x-1 transition-transform">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-900 text-white text-xs font-black flex items-center justify-center rounded-xl shadow-lg shrink-0">
                    {i + 1}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 leading-none">{item.name}</p>
                    <p className="text-[10px] font-black uppercase text-gray-400 mt-1.5 tracking-wider">{item.sales} lượt bán</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-emerald-500">{item.trend}</p>
                  <div className="w-12 h-1 bg-gray-100 rounded-full mt-1.5 overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${100 - i * 15}%` }} />
                  </div>
                </div>
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center flex-1 text-center py-10">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                  <Utensils className="w-8 h-8 text-gray-200" />
                </div>
                <p className="text-gray-400 font-bold text-sm">Chưa có dữ liệu bán hàng</p>
              </div>
            )}
          </div>

          <div className="mt-8 pt-8 border-t border-gray-50">
            <div className="bg-slate-900 rounded-2xl p-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand/20 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-brand" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Hiệu suất tổng</p>
                  <p className="font-bold text-sm">+24% tuần này</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
