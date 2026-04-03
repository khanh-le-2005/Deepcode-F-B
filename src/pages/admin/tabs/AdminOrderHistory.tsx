import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, CalendarRange, ChevronLeft, ChevronRight, History, ReceiptText, Clock3, CheckCircle2, XCircle } from 'lucide-react';
import axios from 'axios';
import { Order } from '../../../types';
import { Button } from '../../../components/Button';
import { cn } from '../../../lib/cn';

type HistoryResponse = {
  orders: Order[];
  total: number;
  page: number;
  totalPages: number;
};

const formatDateParam = (dateStr: string, isEnd = false) => {
  if (!dateStr) return '';
  return isEnd ? `${dateStr}T23:59:59.999Z` : `${dateStr}T00:00:00.000Z`;
};

export const AdminOrderHistory = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });

  useEffect(() => {
    fetchHistory();
  }, [page, limit, startDate, endDate]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page,
        limit,
      };

      if (startDate) params.start = formatDateParam(startDate);
      if (endDate) params.end = formatDateParam(endDate, true);

      const res = await axios.get<HistoryResponse>('/api/orders/history/all', { params });
      const data = res.data || { orders: [], total: 0, page, totalPages: 1 };
      setOrders(Array.isArray(data.orders) ? data.orders : []);
      setMeta({
        total: Number(data.total || 0),
        totalPages: Math.max(1, Number(data.totalPages || 1)),
      });
    } catch (err) {
      console.error('Failed to fetch order history:', err);
      setOrders([]);
      setMeta({ total: 0, totalPages: 1 });
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return orders;
    return orders.filter(order => {
      const orderId = String((order as any)._id || order.id || '').toLowerCase();
      const tableName = String(order.tableName || '').toLowerCase();
      const tableId = String(order.tableId || '').toLowerCase();
      const cashierName = String(order.completedByName || '').toLowerCase();
      return orderId.includes(term) || tableName.includes(term) || tableId.includes(term) || cashierName.includes(term);
    });
  }, [orders, searchTerm]);

  const statusLabel = (status: string) => {
    if (status === 'completed') return 'Đã thanh toán';
    if (status === 'cancelled') return 'Đã huỷ';
    return status;
  };

  const statusColor = (status: string) => {
    if (status === 'completed') return 'bg-emerald-100 text-emerald-600 border-emerald-200';
    if (status === 'cancelled') return 'bg-rose-100 text-rose-600 border-rose-200';
    return 'bg-gray-100 text-gray-600 border-gray-200';
  };

  return (
    <div className="space-y-10 pb-12">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-gray-900 tracking-tight font-serif">Lịch sử đơn hàng</h2>
          <p className="text-gray-500 font-medium mt-1">Xem lại các đơn đã hoàn thành hoặc đã huỷ theo ngày</p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <div className="px-4 py-3 rounded-2xl bg-white border border-gray-100 shadow-sm text-xs font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
            <History className="w-4 h-4 text-brand" />
            <span>{meta.total} đơn</span>
          </div>
          <div className="px-4 py-3 rounded-2xl bg-white border border-gray-100 shadow-sm text-xs font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
            <ReceiptText className="w-4 h-4 text-brand" />
            <span>Trang {page}/{meta.totalPages}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="relative lg:col-span-2">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm theo mã đơn, bàn, hoặc thu ngân..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-gray-100 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-brand/20 shadow-sm transition-all"
          />
        </div>

        <div className="relative">
          <CalendarRange className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setPage(1);
              setStartDate(e.target.value);
            }}
            className="w-full bg-white border border-gray-100 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-brand/20 shadow-sm transition-all"
          />
        </div>

        <div className="relative">
          <CalendarRange className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setPage(1);
              setEndDate(e.target.value);
            }}
            className="w-full bg-white border border-gray-100 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-brand/20 shadow-sm transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-black uppercase tracking-widest text-gray-400">Số dòng / trang</span>
        {[10, 20, 50].map((value) => (
          <button
            key={value}
            onClick={() => {
              setPage(1);
              setLimit(value);
            }}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-all",
              limit === value
                ? "bg-slate-900 text-white border-slate-900 shadow-lg"
                : "bg-white text-gray-500 border-gray-100 hover:border-brand/40 hover:text-brand"
            )}
          >
            {value}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-gray-400">Mã đơn</th>
                <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-gray-400">Bàn</th>
                <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-gray-400">Tổng tiền</th>
                <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-gray-400">Thanh toán</th>
                <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-gray-400">Số món</th>
                <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-gray-400">Thời gian chốt</th>
                <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-gray-400">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-8 py-20 text-center text-gray-400 font-bold">
                      Đang tải lịch sử đơn hàng...
                    </td>
                  </tr>
                ) : filteredOrders.length > 0 ? filteredOrders.map((order, index) => {
                  const orderId = String((order as any)._id || order.id || '');
                  const itemCount = order.items?.reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 0;
                  const completedTime = order.completedAt ? new Date(order.completedAt).toLocaleString('vi-VN') : new Date(order.updatedAt).toLocaleString('vi-VN');
                  return (
                    <motion.tr
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                      key={orderId}
                      className="border-b border-gray-50 hover:bg-gray-50/50 transition-all"
                    >
                      <td className="px-8 py-6">
                        <div className="space-y-1">
                          <span className="text-sm font-bold text-gray-900">#{orderId.slice(-8).toUpperCase()}</span>
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{order.paymentStatus}</p>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-gray-800">{order.tableName || 'Chưa xác định'}</p>
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{order.tableId}</p>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-lg font-black text-brand">{Number(order.total || 0).toLocaleString()}đ</span>
                      </td>
                      <td className="px-8 py-6">
                        <span className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-gray-50 text-gray-600 border border-gray-100">
                          {order.paymentStatus === 'paid' ? 'Đã thu' : order.paymentStatus}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-sm font-black text-gray-700">{itemCount} món</span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2 text-gray-400">
                          <Clock3 className="w-4 h-4" />
                          <span className="text-xs font-bold">{completedTime}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={cn("px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border", statusColor(order.status))}>
                          {statusLabel(order.status)}
                        </span>
                      </td>
                    </motion.tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={7} className="px-8 py-20">
                      <div className="flex flex-col items-center justify-center text-center">
                        <div className="w-20 h-20 bg-gray-50 rounded-[2.5rem] flex items-center justify-center mb-6">
                          <CheckCircle2 className="w-10 h-10 text-gray-200" />
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 font-serif mb-2">Không có đơn nào</h3>
                        <p className="text-gray-400 font-medium">Thử đổi khoảng ngày hoặc từ khóa tìm kiếm</p>
                      </div>
                    </td>
                  </tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <p className="text-sm text-gray-500 font-medium">
          Trang {page} / {meta.totalPages} - Tổng {meta.total} đơn
        </p>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage(prev => Math.max(1, prev - 1))}
            className="bg-white border-gray-100 text-slate-900 h-12 px-5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all shadow-card border-none"
          >
            <ChevronLeft className="w-4 h-4 mr-2" /> Trước
          </Button>
          <Button
            variant="outline"
            disabled={page >= meta.totalPages}
            onClick={() => setPage(prev => Math.min(meta.totalPages, prev + 1))}
            className="bg-white border-gray-100 text-slate-900 h-12 px-5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all shadow-card border-none"
          >
            Sau <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
};
