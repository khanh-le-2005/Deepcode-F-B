import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, CalendarRange, ChevronLeft, ChevronRight, History, ReceiptText, Clock3, CheckCircle2 } from 'lucide-react';
import axiosClient from '@/src/api/axiosClient';
import { Order, Payment } from '../../../types';
import { Button } from '../../../components/Button';
import { cn } from '../../../api/cn';

const formatDateParam = (dateStr: string, isEnd = false) => {
  if (!dateStr) return '';
  return isEnd ? `${dateStr}T23:59:59.999Z` : `${dateStr}T00:00:00.000Z`;
};

export const AdminOrderHistory = () => {
  const [activeTab, setActiveTab] = useState<'orders' | 'payments'>('orders');
  
  // States cho Data
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  
  // States cho Loading & Search
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentSearch, setPaymentSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // --- STATE QUẢN LÝ PHÂN TRANG (Dùng chung cho cả 2 tab) ---
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });

  // Reset về trang 1 khi thay đổi điều kiện lọc (Tab, Từ khóa, Ngày tháng)
  useEffect(() => {
    setPage(1);
  }, [activeTab, searchTerm, paymentSearch, startDate, endDate, limit]);

  // Lắng nghe sự thay đổi để gọi API
  useEffect(() => {
    if (activeTab === 'orders') {
      fetchHistory(page);
    } else {
      fetchPayments(page);
    }
  }, [page, limit, startDate, endDate, activeTab, searchTerm, paymentSearch]);

  // --- HÀM FETCH ĐƠN HÀNG (Hỗ trợ phân trang Fallback) ---
  const fetchHistory = async (currentPage: number) => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page: currentPage,
        limit,
        search: searchTerm || undefined
      };

      if (startDate) params.start = formatDateParam(startDate);
      if (endDate) params.end = formatDateParam(endDate, true);

      const res = await axiosClient.get('/api/orders/history/all', { params });
      const data = res.data;

      // 1. Nếu Backend hỗ trợ chuẩn Pagination
      if (data && data.data) {
        setOrders(data.data);
        setMeta({
          total: Number(data.totalItems || data.data.length),
          totalPages: Math.max(1, Number(data.totalPages || 1)),
        });
      } 
      // 2. Nếu Backend trả về object kiểu cũ { orders: [], total, totalPages }
      else if (data && typeof data === 'object' && !Array.isArray(data) && data.orders) {
        setOrders(data.orders);
        setMeta({
          total: Number(data.total || 0),
          totalPages: Math.max(1, Number(data.totalPages || 1)),
        });
      } 
      // 3. FALLBACK: Frontend tự cắt mảng nếu Backend chỉ trả về 1 mảng khổng lồ
      else {
        const allOrders = Array.isArray(data) ? data : [];
        
        // Lọc Frontend
        const filtered = allOrders.filter(order => {
          const term = searchTerm.toLowerCase().trim();
          if (!term) return true;
          const orderId = String((order as any)._id || order.id || '').toLowerCase();
          const tableName = String(order.tableName || '').toLowerCase();
          const tableId = String(order.tableId || '').toLowerCase();
          const cashierName = String(order.completedByName || '').toLowerCase();
          return orderId.includes(term) || tableName.includes(term) || tableId.includes(term) || cashierName.includes(term);
        });

        // Tính toán Pagination Frontend
        const total = filtered.length;
        setMeta({ total, totalPages: Math.ceil(total / limit) || 1 });
        
        // Slice mảng
        const startIndex = (currentPage - 1) * limit;
        setOrders(filtered.slice(startIndex, startIndex + limit));
      }
    } catch (err) {
      console.error('Failed to fetch order history:', err);
      setOrders([]);
      setMeta({ total: 0, totalPages: 1 });
    } finally {
      setLoading(false);
    }
  };

  // --- HÀM FETCH THANH TOÁN (Hỗ trợ phân trang Fallback) ---
  const fetchPayments = async (currentPage: number) => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/api/payments', {
        params: {
          page: currentPage,
          limit,
          search: paymentSearch || undefined
        }
      });
      const data = res.data;

      // 1. Nếu Backend hỗ trợ Pagination
      if (data && data.data) {
        setPayments(data.data);
        setMeta({
          total: Number(data.totalItems || data.data.length),
          totalPages: Math.max(1, Number(data.totalPages || 1)),
        });
      } 
      // 2. FALLBACK: Frontend tự cắt mảng
      else {
        const allPayments = Array.isArray(data) ? data.reverse() : [];
        
        // Lọc Frontend
        const filtered = allPayments.filter(p => {
          const term = paymentSearch.toLowerCase().trim();
          if (!term) return true;
          const orderIdStr = String(typeof p.orderId === 'string' ? p.orderId : p.orderId?._id || p.orderId?.id || '').toLowerCase();
          const pIdStr = String((p as any)._id || p.id || '').toLowerCase();
          return orderIdStr.includes(term) || pIdStr.includes(term);
        });

        // Tính toán Pagination Frontend
        const total = filtered.length;
        setMeta({ total, totalPages: Math.ceil(total / limit) || 1 });
        
        // Slice mảng
        const startIndex = (currentPage - 1) * limit;
        setPayments(filtered.slice(startIndex, startIndex + limit));
      }
    } catch (err) {
      console.error('Failed to fetch payments:', err);
      setPayments([]);
      setMeta({ total: 0, totalPages: 1 });
    } finally {
      setLoading(false);
    }
  };

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

  const getOrderLabel = (payment: Payment) => {
    if (typeof payment.orderId === 'string') return payment.orderId;
    return payment.orderId?._id || payment.orderId?.id || '';
  };

  return (
    <div className="space-y-10 pb-12">
      {/* --- HEADER --- */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-gray-900 tracking-tight">Lịch sử {activeTab === 'orders' ? 'Đơn hàng' : 'Giao dịch'}</h2>
          <p className="text-gray-500 font-medium mt-1">Xem lại các {activeTab === 'orders' ? 'đơn đã hoàn thành hoặc đã huỷ' : 'khoản thanh toán đã thu'}</p>
        </div>
        <div className="flex flex-col gap-4 items-end ">
          <div className="flex items-center gap-2 bg-gray-100/50 p-1 rounded-2xl w-fit border border-gray-100">
            <button
              onClick={() => setActiveTab('orders')}
              className={cn(
                "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer hover:bg-amber-500",
                activeTab === 'orders' ? "bg-white text-slate-900 shadow border border-gray-200" : "text-gray-500 hover:text-slate-700 "
              )}
            >
              Đơn Hàng
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={cn(
                "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer hover:bg-amber-500",
                activeTab === 'payments' ? "bg-white text-slate-900 shadow border border-gray-200" : "text-gray-500 hover:text-slate-700"
              )}
            >
              Thanh Toán
            </button>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <div className="px-4 py-3 rounded-2xl bg-white border border-gray-100 shadow-sm text-xs font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
              {activeTab === 'orders' ? <History className="w-4 h-4 text-brand" /> : <ReceiptText className="w-4 h-4 text-amber-500" />}
              <span>{meta.total} {activeTab === 'orders' ? 'đơn' : 'giao dịch'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* --- BỘ LỌC (FILTERS) --- */}
      {activeTab === 'orders' ? (
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
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-white border border-gray-100 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-brand/20 shadow-sm transition-all"
            />
          </div>

          <div className="relative">
            <CalendarRange className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-white border border-gray-100 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-brand/20 shadow-sm transition-all"
            />
          </div>
        </div>
      ) : (
        <div className="relative w-full lg:max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm theo mã đơn hoặc mã giao dịch..."
            value={paymentSearch}
            onChange={(e) => setPaymentSearch(e.target.value)}
            className="w-full bg-white border border-gray-100 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-sm transition-all"
          />
        </div>
      )}

      {/* --- CỌC SỐ DÒNG --- */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-black uppercase tracking-widest text-gray-400">Số dòng / trang</span>
        {[10, 20, 50].map((value) => (
          <button
            key={value}
            onClick={() => setLimit(value)}
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

      {/* --- TABLE DỮ LIỆU --- */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                {activeTab === 'orders' ? (
                  <>
                    <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-gray-400">Mã đơn</th>
                    <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-gray-400">Bàn</th>
                    <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-gray-400">Tổng tiền</th>
                    <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-gray-400">Thanh toán</th>
                    <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-gray-400">Số món</th>
                    <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-gray-400">Thời gian chốt</th>
                    <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-gray-400">Trạng thái</th>
                  </>
                ) : (
                  <>
                    <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-gray-400">Mã giao dịch</th>
                    <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-gray-400">Mã đơn</th>
                    <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-gray-400">Hình thức</th>
                    <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-gray-400">Bàn</th>
                    <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-gray-400">Số tiền</th>
                    <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-gray-400">Phương thức</th>
                    <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-gray-400">Thu ngân</th>
                    <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-gray-400">Thời gian</th>
                    <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-gray-400">Trạng thái</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-8 py-20 text-center text-gray-400 font-bold">
                      Đang tải dữ liệu...
                    </td>
                  </tr>
                ) : activeTab === 'orders' ? (
                  orders.length > 0 ? orders.map((order, index) => {
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
                          <p className="text-sm font-bold text-gray-800">{order.tableName || 'Chưa xác định'}</p>
                        </td>
                        <td className="px-8 py-6">
                          <span className="text-lg font-black text-brand">{Number(order.total || 0).toLocaleString()}đ</span>
                        </td>
                        <td className="px-8 py-6">
                          <span className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-gray-50 text-gray-600 border border-gray-100 whitespace-nowrap">
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
                          <span className={cn("inline-flex items-center justify-center px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border whitespace-nowrap", statusColor(order.status))}>
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
                          <h3 className="text-2xl font-black text-gray-900 mb-2">Không có đơn nào</h3>
                          <p className="text-gray-400 font-medium">Thử đổi khoảng ngày hoặc từ khóa tìm kiếm</p>
                        </div>
                      </td>
                    </tr>
                  )
                ) : (
                  payments.length > 0 ? payments.map((payment, index) => {
                    const pIdStr = String(payment.id || (payment as any)._id || '').toUpperCase();
                    const orderIdLabel = String(getOrderLabel(payment) || '');
                    
                    const getPStatusColor = (s: string) => {
                      if (s === 'success') return 'bg-emerald-50 text-emerald-600 border-emerald-100';
                      if (s === 'failed') return 'bg-rose-50 text-rose-600 border-rose-100';
                      return 'bg-amber-50 text-amber-600 border-amber-100';
                    };
                    const getPStatusLabel = (s: string) => {
                      if (s === 'success') return 'Thành công';
                      if (s === 'failed') return 'Thất bại';
                      return 'Đang xử lý';
                    };

                    return (
                      <motion.tr
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.04 }}
                        key={pIdStr}
                        className="border-b border-gray-50 hover:bg-gray-50/50 transition-all font-medium"
                      >
                        <td className="px-8 py-6">
                          <span className="text-sm font-bold text-gray-900">#{pIdStr.slice(-8)}</span>
                        </td>
                        <td className="px-8 py-6">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            #{orderIdLabel.slice(-8).toUpperCase()}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <span className={cn(
                            "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border",
                            payment.orderTypeSnapshot === 'takeaway' ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-slate-100 shadow-sm"
                          )}>
                            {payment.orderTypeSnapshot === 'takeaway' ? 'Mang đi' : 'Tại chỗ'}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <p className="text-sm font-bold text-gray-800">{payment.tableName || (payment.orderTypeSnapshot === 'takeaway' ? 'N/A' : 'Chưa rõ')}</p>
                        </td>
                        <td className="px-8 py-6">
                          <span className="text-lg font-black text-slate-900">{Number(payment.amount || 0).toLocaleString()}đ</span>
                        </td>
                        <td className="px-8 py-6">
                          <span className="text-sm font-bold text-gray-600 whitespace-nowrap">{payment.method}</span>
                        </td>
                        <td className="px-8 py-6">
                          <p className="text-xs font-black uppercase tracking-widest text-gray-400">{payment.cashierName || 'Hệ thống'}</p>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-2 text-gray-400 whitespace-nowrap">
                            <Clock3 className="w-4 h-4" />
                            <span className="text-xs font-bold">{new Date(payment.createdAt).toLocaleString('vi-VN')}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <span className={cn("inline-flex items-center justify-center px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border whitespace-nowrap", getPStatusColor(payment.status))}>
                            {getPStatusLabel(payment.status)}
                          </span>
                        </td>
                      </motion.tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={9} className="px-8 py-20">
                        <div className="flex flex-col items-center justify-center text-center">
                          <div className="w-20 h-20 bg-gray-50 rounded-[2.5rem] flex items-center justify-center mb-6">
                            <ReceiptText className="w-10 h-10 text-gray-200" />
                          </div>
                          <h3 className="text-2xl font-black text-gray-900  mb-2">Không có giao dịch</h3>
                          <p className="text-gray-400 font-medium">Bạn chưa có lịch sử thanh toán nào gần đây</p>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* --- PHÂN TRANG CHUNG (CHO CẢ 2 TAB) --- */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between gap-4 flex-wrap bg-white px-6 py-4 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 font-medium">
            Trang {page} / {meta.totalPages} - Tổng {meta.total} bản ghi
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              className="h-11 w-11 shrink-0 rounded-2xl border-0 bg-gray-50 text-slate-700 shadow-sm transition-all hover:bg-orange-50 hover:text-orange-600 disabled:opacity-40 flex items-center justify-center p-0"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>

            {Array.from({ length: meta.totalPages }, (_, index) => {
              const pageNumber = index + 1;
              return (
                <Button
                  key={pageNumber}
                  type="button"
                  onClick={() => setPage(pageNumber)}
                  variant="outline"
                  className={cn(
                    "h-11 min-w-[44px] shrink-0 px-3 rounded-2xl border-0 font-bold text-sm transition-all flex items-center justify-center",
                    page === pageNumber
                      ? "bg-orange-500 text-white shadow-lg shadow-orange-200"
                      : "bg-white text-slate-700 hover:bg-orange-50 hover:text-orange-600"
                  )}
                >
                  {pageNumber}
                </Button>
              );
            })}

            <Button
              type="button"
              variant="outline"
              disabled={page >= meta.totalPages}
              onClick={() => setPage(prev => Math.min(meta.totalPages, prev + 1))}
              className="h-11 w-11 shrink-0 rounded-2xl border-0 bg-gray-50 text-slate-700 shadow-sm transition-all hover:bg-orange-50 hover:text-orange-600 disabled:opacity-40 flex items-center justify-center p-0"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};