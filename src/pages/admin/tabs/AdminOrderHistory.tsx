import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, CalendarRange, ChevronLeft, ChevronRight, History, ReceiptText, Clock3, CheckCircle2, XCircle, MapPin } from 'lucide-react';
import axios from '@/src/lib/axiosClient';
import { Order, Payment } from '../../../types';
import { Button } from '../../../components/Button';
import { cn } from '../../../lib/cn';
import axiosClient from '@/src/lib/axiosClient';
import { io } from 'socket.io-client';

const socket = io();

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
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<Order | null>(null);

  // Payment tab states
  const [activeTab, setActiveTab] = useState<'orders' | 'payments'>('orders');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentSearch, setPaymentSearch] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'orders') fetchHistory();
  }, [page, limit, startDate, endDate, activeTab]);

  useEffect(() => {
    if (activeTab === 'payments') fetchPayments();
    
    // Live update when a new payment via Kiosk/Transfer completes
    const handleOrderPaid = () => {
      if (activeTab === 'payments') {
        fetchPayments();
      }
      if (activeTab === 'orders') {
        fetchHistory(); // Re-fetch partially or fully to update the 'UNPAID' badge to 'PAID'
      }
    };
    
    socket.on('order-paid', handleOrderPaid);
    
    return () => {
      socket.off('order-paid', handleOrderPaid);
    };
  }, [activeTab, page, limit, startDate, endDate]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page,
        limit,
      };

      if (startDate) params.start = formatDateParam(startDate);
      if (endDate) params.end = formatDateParam(endDate, true);

      const res = await axiosClient.get('/api/orders/history/all', { params });
      const data = res.data;

      if (Array.isArray(data)) {
        setOrders(data);
        setMeta({ total: data.length, totalPages: 1 });
      } else if (data && typeof data === 'object') {
        setOrders(Array.isArray(data.orders) ? data.orders : []);
        setMeta({
          total: Number(data.total || 0),
          totalPages: Math.max(1, Number(data.totalPages || 1)),
        });
      } else {
        setOrders([]);
        setMeta({ total: 0, totalPages: 1 });
      }
    } catch (err) {
      console.error('Failed to fetch order history:', err);
      setOrders([]);
      setMeta({ total: 0, totalPages: 1 });
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    setPaymentLoading(true);
    try {
      const res = await axiosClient.get('/api/payments');
      setPayments(res.data.reverse());
    } catch (err) {
      console.error('Failed to fetch payments:', err);
    } finally {
      setPaymentLoading(false);
    }
  };
  console.log(payments);

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

  const filteredPayments = useMemo(() => {
    const term = paymentSearch.toLowerCase().trim();
    if (!term) return payments;
    return payments.filter(p => {
      const orderIdStr = String(typeof p.orderId === 'string' ? p.orderId : p.orderId?._id || p.orderId?.id || '').toLowerCase();
      const pIdStr = String((p as any)._id || p.id || '').toLowerCase();
      return orderIdStr.includes(term) || pIdStr.includes(term);
    });
  }, [payments, paymentSearch]);

  const statusLabel = (status: string) => {
    if (status === 'completed') return 'ĐÃ CHỐT ĐƠN';
    if (status === 'cancelled') return 'ĐÃ HUỶ';
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
          <h2 className="text-4xl font-black text-gray-900 tracking-tight font-serif">Lịch sử {activeTab === 'orders' ? 'Đơn hàng' : 'Giao dịch'}</h2>
          <p className="text-gray-500 font-medium mt-1">Xem lại các {activeTab === 'orders' ? 'đơn đã hoàn thành hoặc đã huỷ' : 'khoản thanh toán đã thu'}</p>
        </div>
        <div className="flex flex-col gap-4 items-end">
          <div className="flex items-center gap-2 bg-gray-100/50 p-1 rounded-2xl w-fit border border-gray-100">
             <button
                onClick={() => setActiveTab('orders')}
                 className={cn(
                  "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                  activeTab === 'orders' ? "bg-white text-slate-900 shadow border border-gray-200" : "text-gray-500 hover:text-slate-700"
                )}
             >
                Đơn Hàng
             </button>
             <button
                 onClick={() => setActiveTab('payments')}
                 className={cn(
                  "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                  activeTab === 'payments' ? "bg-white text-slate-900 shadow border border-gray-200" : "text-gray-500 hover:text-slate-700"
                )}
             >
                Thanh Toán
             </button>
          </div>

          {activeTab === 'orders' && (
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
          )}
        </div>
      </div>

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

      {activeTab === 'orders' && (
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
      )}

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
                    <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-gray-400 text-right">Thao tác</th>
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
                {activeTab === 'orders' ? (
                  loading ? (
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
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="space-y-1">
                            <p className="text-sm font-bold text-gray-800">
                              {order.orderType === 'delivery' ? 'Giao hàng' : order.orderType === 'takeaway' ? 'Mang về' : 'Tại bàn'}
                              {' - '}
                              {String(order.tableName || order.tableId || 'Không rõ').replace('Bàn ', 'Bàn ')}
                            </p>
                            {order.customerInfo && (order.orderType === 'delivery' || order.orderType === 'takeaway') && (
                               <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 line-clamp-2 max-w-[200px]">
                                  {order.customerInfo.phone} {order.customerInfo.deliveryAddress && `- ${order.customerInfo.deliveryAddress}`}
                               </p>
                            )}
                          </div>
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
                        <td className="px-8 py-6 text-right">
                          <button onClick={() => setSelectedOrderDetails(order)} className="px-5 py-2.5 bg-brand/10 text-brand hover:bg-brand hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap">Chi tiết</button>
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
                  )
                ) : (
                  paymentLoading ? (
                    <tr>
                      <td colSpan={7} className="px-8 py-20 text-center text-gray-400 font-bold">
                        Đang tải lịch sử thanh toán...
                      </td>
                    </tr>
                  ) : filteredPayments.length > 0 ? filteredPayments.map((payment, index) => {
                     const pIdStr = String(payment.id || (payment as any)._id || '').toUpperCase();
                     const orderIdObj = payment.orderId as any;
                     const orderIdLabel = typeof payment.orderId === 'string' ? payment.orderId : (orderIdObj?._id || orderIdObj?.id || '');
                     
                     // Xác định badge trạng thái thanh toán
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
                          <div className="space-y-1 max-w-[200px]">
                            <p className="text-xs font-bold text-slate-700 truncate">{payment.bankNameSnapshot || payment.method}</p>
                            {payment.bankAccountId && (
                              <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                                <p className="text-[9px] font-black uppercase text-brand tracking-widest">Xác thực qua API</p>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-8 py-6">
                           <p className="text-xs font-black uppercase tracking-widest text-gray-400">{payment.cashierName || 'Hệ thống'}</p>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-2 text-gray-400">
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
                      <td colSpan={7} className="px-8 py-20">
                        <div className="flex flex-col items-center justify-center text-center">
                          <div className="w-20 h-20 bg-gray-50 rounded-[2.5rem] flex items-center justify-center mb-6">
                            <ReceiptText className="w-10 h-10 text-gray-200" />
                          </div>
                          <h3 className="text-2xl font-black text-gray-900 font-serif mb-2">Không có giao dịch</h3>
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

      {activeTab === 'orders' && (
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
      )}

      {/* Order Details Modal */}
      {selectedOrderDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
          >
            <div className="w-full flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50 shrink-0">
              <h3 className="text-xl font-black text-gray-900 font-serif">
                Chi tiết Đơn hàng #{((selectedOrderDetails as any)._id || selectedOrderDetails.id)?.slice(-8).toUpperCase()}
              </h3>
              <button onClick={() => setSelectedOrderDetails(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Loại đơn & Bàn</p>
                  <p className="font-bold text-gray-900 text-base">
                    {selectedOrderDetails.orderType === 'delivery' ? '🚗 Giao hàng' : selectedOrderDetails.orderType === 'takeaway' ? '🥡 Mang về' : '🍽️ Tại bàn'}
                    {' - '}
                    {(() => {
                      const name = String(selectedOrderDetails.tableName || selectedOrderDetails.tableId || 'Không rõ');
                      // Nếu tên đã bắt đầu bằng "Mang về" hoặc "Giao hàng", hãy làm đẹp nó
                      if (name.includes(' - ')) {
                        return name.split(' - ').slice(1).join(' - '); // Chỉ lấy phần phone/address sau dấu gạch
                      }
                      return name.replace('Bàn ', '');
                    })()}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Thời gian tạo</p>
                  <p className="font-bold text-gray-900 text-base">
                    {new Date(selectedOrderDetails.createdAt).toLocaleString('vi-VN')}
                  </p>
                </div>
              </div>

              {selectedOrderDetails.customerInfo && (selectedOrderDetails.orderType === 'delivery' || selectedOrderDetails.orderType === 'takeaway') && (
                <div className="bg-brand/5 border border-brand/20 rounded-2xl p-5 mb-8">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-brand mb-4 flex items-center gap-2">
                    <ReceiptText className="w-4 h-4" /> THÔNG TIN KHÁCH HÀNG (SHIPPER CHÚ Ý)
                  </h4>
                  <div className="space-y-3">
                    {selectedOrderDetails.customerInfo.name && (
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-medium text-gray-600">Tên khách:</span>
                        <span className="text-sm font-bold text-gray-900 text-right">{selectedOrderDetails.customerInfo.name}</span>
                      </div>
                    )}
                    {selectedOrderDetails.customerInfo.phone && (
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-medium text-gray-600">Điện thoại:</span>
                        <span className="text-sm font-bold text-brand bg-white px-2 py-0.5 border rounded-md shadow-sm">{selectedOrderDetails.customerInfo.phone}</span>
                      </div>
                    )}
                    {selectedOrderDetails.customerInfo.deliveryAddress && (
                      <div className="flex flex-col gap-1 mt-2 p-4 bg-white rounded-xl border-2 border-brand/20 shadow-sm animate-pulse-slow">
                        <span className="text-[10px] font-black uppercase tracking-widest text-brand flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> ĐỊA CHỈ GIAO HÀNG TẬN TAY:
                        </span>
                        <span className="text-base font-black text-gray-900">{selectedOrderDetails.customerInfo.deliveryAddress}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Danh sách món ({selectedOrderDetails.items.filter(i => i.status !== 'cancelled').reduce((acc, i) => acc + (i.quantity || 1), 0)} món)</p>
                <div className="space-y-3">
                  {selectedOrderDetails.items.filter(i => i.status !== 'cancelled').map((item, idx) => (
                    <div key={idx} className="flex gap-4 p-4 border border-gray-100 rounded-xl items-center bg-gray-50/50">
                      <div className="w-12 h-12 rounded-lg bg-gray-200 overflow-hidden shrink-0">
                        <img 
                          src={item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1760&auto=format&fit=crop'} 
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-gray-900 text-sm">{item.name}</p>
                        {item.selectedOption && <p className="text-[10px] font-bold text-gray-500">Kích cỡ: {item.selectedOption.name}</p>}
                        {item.selectedAddons && item.selectedAddons.length > 0 && (
                          <p className="text-[10px] font-bold text-gray-500 line-clamp-1">
                            Thêm: {item.selectedAddons.map(a => a.name).join(', ')}
                          </p>
                        )}
                        {item.note && <p className="text-[10px] text-orange-500 italic mt-0.5 bg-orange-50 w-fit px-1.5 py-0.5 rounded">Ghi chú: {item.note}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-black text-gray-400 mb-1">x{item.quantity}</p>
                        <p className="text-sm font-black text-brand">{(item.totalPrice ?? item.basePrice ?? item.price ?? 0).toLocaleString()}đ</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-100 bg-white flex justify-between items-center shrink-0">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Tổng cộng hóa đơn</p>
                <p className="text-2xl font-black text-brand tracking-tight">{Number(selectedOrderDetails.total || 0).toLocaleString()}đ</p>
              </div>
              <button 
                onClick={() => setSelectedOrderDetails(null)}
                className="px-6 py-3 bg-gray-100 text-gray-600 font-black text-xs uppercase tracking-widest hover:bg-gray-200 active:scale-95 transition-all rounded-xl"
              >
                Đóng lại
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
