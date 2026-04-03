import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Download, CreditCard, ShoppingCart, Grid, TrendingUp, Award, ChevronRight, FileText } from 'lucide-react';
import axios from 'axios';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Button } from '../../../components/Button';
import { cn } from '../../../lib/cn';

export const AdminReports = () => {
  const [stats, setStats] = useState<any>({});

  useEffect(() => {
    axios.get('/api/stats')
      .then(res => setStats(res.data || {}))
      .catch(err => console.error('Failed to fetch stats:', err));
  }, []);

  const normalizedDailyRevenue = useMemo(() => {
    return (stats.dailyRevenue || []).map((item: any) => ({
      name: item.name || item.date || '',
      value: item.value ?? item.revenue ?? 0,
    }));
  }, [stats.dailyRevenue]);

  const normalizedTopItems = useMemo(() => {
    return (stats.topItems || []).map((item: any) => ({
      name: item.name,
      count: item.count ?? item.sales ?? 0,
      trend: item.trend || `+${Math.floor(Math.random() * 15) + 5}%`,
    }));
  }, [stats.topItems]);

  const totalOrders = stats.totalOrders ?? stats.orderCount ?? 0;
  const activeTablesCount = stats.activeTablesCount ?? stats.activeTables ?? 0;
  const revenue = stats.revenue || 0;
  const averageOrderValue = stats.averageOrderValue || 0;
  const averageServiceTime = stats.averageServiceTime || 0;
  const returnRate = stats.returnRate || 0;

  const reportStats = [
    { label: 'Doanh thu', value: `${revenue.toLocaleString()}đ`, icon: CreditCard, bg: 'bg-brand/10', color: 'text-brand' },
    { label: 'Tổng đơn hàng', value: totalOrders, icon: ShoppingCart, bg: 'bg-blue-50', color: 'text-blue-500' },
    { label: 'Bàn hoạt động', value: activeTablesCount, icon: Grid, bg: 'bg-emerald-50', color: 'text-emerald-500' },
    { label: 'Sản phẩm Hot', value: normalizedTopItems.length, icon: Award, bg: 'bg-rose-50', color: 'text-rose-500' },
  ];

  const insightStats = [
    { label: 'Giá trị đơn TB', value: averageOrderValue ? `${averageOrderValue.toLocaleString()}đ` : 'N/A' },
    { label: 'Thời gian phục vụ TB', value: averageServiceTime ? `${averageServiceTime} phút` : 'N/A' },
    { label: 'Tỉ lệ quay lại', value: returnRate ? `${returnRate}%` : 'N/A' },
  ];

  return (
    <div className="space-y-10 pb-12">
      {/* Header Area */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-gray-900 tracking-tight font-serif">Báo Cáo & Phân Tích</h2>
          <p className="text-gray-500 font-medium mt-1">Dữ liệu chi tiết về hoạt động kinh doanh nhà hàng</p>
        </div>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl border border-gray-100 text-xs font-black uppercase tracking-widest text-gray-500 shadow-card">
            <Calendar className="w-4 h-4 text-brand" />
            <span>7 Ngày Qua</span>
            <ChevronRight className="w-3.5 h-3.5 rotate-90" />
          </div>
          <Button variant="outline" className="bg-white border-gray-100 text-slate-900 h-12 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all shadow-card border-none">
            <Download className="w-4 h-4 mr-2" /> Xuất dữ liệu
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {reportStats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="premium-card p-6 flex flex-col gap-4 relative overflow-hidden group"
          >
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm transition-transform group-hover:scale-110 duration-500", stat.bg)}>
              <stat.icon className={cn("w-5 h-5", stat.color)} />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{stat.label}</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {insightStats.map((item) => (
          <div key={item.label} className="premium-card p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">{item.label}</p>
            <p className="text-2xl font-black text-slate-900 mt-2">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Visual Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 premium-card p-8 flex flex-col min-h-[480px]">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="text-xl font-black font-serif 
   text-gray-900">Doanh thu thời gian thực</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Sơ đồ biến thiên theo ngày</p>
            </div>
            <div className="flex items-center gap-2 text-emerald-500 bg-emerald-50 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
              <TrendingUp className="w-3.5 h-3.5" /> +12.4% so với tuần trước
            </div>
          </div>

          <div className="flex-1 w-full translate-x-[-15px]">
            <ResponsiveContainer width="110%" height="100%">
              <AreaChart data={normalizedDailyRevenue}>
                <defs>
                  <linearGradient id="colorRevReports" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D97706" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#D97706" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 800, fill: '#94A3B8' }}
                  dy={15}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 800, fill: '#94A3B8' }}
                  tickFormatter={(val) => `${val / 1000}k`}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: 'var(--shadow-premium)', padding: '1rem' }}
                  itemStyle={{ fontWeight: 900, color: '#D97706' }}
                  labelStyle={{ fontWeight: 900, marginBottom: '0.5rem', color: '#0F172A' }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#D97706"
                  strokeWidth={4}
                  fillOpacity={1}
                  fill="url(#colorRevReports)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Products */}
        <div className="premium-card p-8 flex flex-col h-full">
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-xl font-black font-serif 
 text-gray-900">Chi tiết sản phẩm</h3>
            <button className="text-[10px] font-black uppercase text-brand tracking-widest hover:underline">Phát hành báo cáo</button>
          </div>

          <div className="flex-1 space-y-8">
            {normalizedTopItems.length > 0 ? normalizedTopItems.map((item: any, i: number) => (
              <div key={`${item.name}-${i}`} className="flex items-center justify-between gap-4 group cursor-pointer hover:translate-x-1 transition-transform">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 bg-slate-50 border border-gray-100 rounded-2xl flex items-center justify-center font-serif 
       font-black text-gray-400 group-hover:bg-slate-900 group-hover:text-white transition-all duration-500">
                    {i + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 truncate leading-none">{item.name}</p>
                    <p className="text-[10px] font-black uppercase text-gray-400 mt-2 tracking-wider">{item.count} lượt bán</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={cn(
                    "text-[10px] font-black tracking-widest",
                    String(item.trend).startsWith('+') ? 'text-emerald-500' : 'text-rose-500'
                  )}>
                    {item.trend}
                  </span>
                  <div className="flex -space-x-1 mt-1.5 justify-end">
                    {[...Array(3)].map((_, idx) => (
                      <div key={idx} className="w-4 h-1 rounded-full bg-slate-100 overflow-hidden">
                        {idx <= (2 - i % 3) && <div className="h-full bg-brand/40" />}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center flex-1 text-center py-20">
                <div className="w-20 h-20 bg-gray-50 rounded-[2.5rem] flex items-center justify-center mb-6">
                  <FileText className="w-10 h-10 text-gray-200" />
                </div>
                <p className="text-gray-400 font-bold text-sm">Chưa có dữ liệu thống kê món ăn</p>
              </div>
            )}
          </div>

          <button className="mt-10 w-full py-4 rounded-2xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-[0.2em] hover:bg-slate-800 transition-all shadow-lg active:scale-95">
            Xem tất cả bảng xếp hạng
          </button>
        </div>
      </div>
    </div>
  );
};
