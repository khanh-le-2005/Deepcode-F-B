import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Search, Filter, Clock, CheckCircle2, XCircle, MoreVertical, CreditCard, Receipt, ChevronRight, User, MapPin, RefreshCw } from 'lucide-react';
import axios from '@/src/lib/axiosClient';
import { toast } from 'react-toastify';
import { io } from 'socket.io-client';
import { Order } from '../../../types';
import { Button } from '../../../components/Button';
import { ConfirmModal } from '../../../components/modals/ConfirmModal';
import { cn } from '../../../lib/cn';

const socket = io();

export const AdminOrderManagement = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [tableNameMap, setTableNameMap] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<Order | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: (val?: any) => void;
    variant: 'danger' | 'warning' | 'info';
    inputConfig?: {
      type: 'number' | 'text';
      min?: number;
      max?: number;
      defaultValue?: number | string;
    };
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    variant: 'warning'
  });

  // Tự động cập nhật selectedOrderDetails khi orders thay đổi (để Modal không bị cũ)
  useEffect(() => {
    if (selectedOrderDetails) {
      const updatedOrder = orders.find(o => ((o as any)._id || (o as any).id) === ((selectedOrderDetails as any)._id || (selectedOrderDetails as any).id));
      if (updatedOrder) {
        setSelectedOrderDetails(updatedOrder);
      } else {
        setSelectedOrderDetails(null);
      }
    }
  }, [orders]);

  useEffect(() => {
    fetchOrders();
    fetchTables();
    socket.on('new-order', (newOrder) => {
      setOrders(prev => {
        const orderId = (newOrder as any)._id || newOrder.id;
        if (prev.some(o => ((o as any)._id || o.id) === orderId)) {
          return prev.map(o => ((o as any)._id || o.id) === orderId ? newOrder : o);
        }
        return [newOrder, ...prev];
      });
    });
    socket.on('order-updated', (updatedOrder) => {
      const updated_id = updatedOrder._id || updatedOrder.id;
      setOrders(prev => prev.map(o => ((o as any)._id || o.id) === updated_id ? updatedOrder : o));
    });
    return () => {
      socket.off('new-order');
      socket.off('order-updated');
    };
  }, []);

  const fetchOrders = () => {
    axios.get('/api/orders')
      .then(res => setOrders(res.data))
      .catch(err => console.error("Failed to fetch orders:", err));
  };

  const fetchTables = () => {
    axios.get('/api/tables')
      .then(res => {
        const map: Record<string, string> = {};
        (res.data || []).forEach((t: any) => {
          const id = t._id || t.id || t.slug;
          if (id) map[id] = t.name;
        });
        setTableNameMap(map);
      })
      .catch(err => console.error("Failed to fetch tables:", err));
  };

  const updateStatus = async (id: string, status: string) => {
    if (status === 'cancelled') {
      setConfirmConfig({
        isOpen: true,
        title: 'Hủy đơn hàng?',
        message: 'Bạn có chắc chắn muốn hủy đơn hàng này? Thao tác này không thể hoàn tác.',
        variant: 'danger',
        onConfirm: async () => {
          try {
            await axios.put(`/api/orders/${id}`, { status });
            fetchOrders();
            toast.success(`Đã hủy đơn hàng!`);
          } catch (err) {
            console.error('Failed to cancel order:', err);
            toast.error('Lỗi khi hủy đơn hàng!');
          }
        }
      });
      return;
    }

    try {
      await axios.put(`/api/orders/${id}`, { status });
      fetchOrders();
      toast.success(`Đã cập nhật trạng thái đơn hàng: ${getStatusLabel(status)}`);
    } catch (err) {
      console.error('Failed to update order status:', err);
      toast.error('Lỗi khi cập nhật trạng thái đơn hàng!');
    }
  };

  const approveAll = async (id: string) => {
    try {
      await axios.put(`/api/orders/${id}/approve-all`);
      fetchOrders();
      toast.success('Đã duyệt toàn bộ món chờ duyệt!');
    } catch (err) {
      console.error('Failed to approve all items:', err);
      toast.error('Không thể duyệt tất cả món.');
    }
  };

  const normalizeStatus = (status: string) => {
    if (status === 'paid') return 'completed';
    return status;
  };

  const handlePayment = async (order: Order) => {
    const orderId = (order as any)._id || order.id;
    const orderTotal = Number(order.total || 0);
    
    setConfirmConfig({
      isOpen: true,
      title: 'Xác nhận hoàn tất',
      message: `Xác nhận hoàn tất đơn hàng ${orderTotal.toLocaleString()}đ và giải phóng bàn?`,
      variant: 'info',
      onConfirm: async () => {
        try {
          // API v3.0: Use dedicated complete endpoint which handles status + table reset
          await axios.post(`/api/orders/${orderId}/complete`);
          fetchOrders();
          toast.success('Đơn hàng đã hoàn tất, bàn đã sẵn sàng!');
        } catch (err) {
          console.error('Completion failed:', err);
          toast.error('Lỗi khi chốt đơn hàng!');
        }
      }
    });
  };

  const filteredOrders = orders.filter(o => {
    const normalizedStatus = normalizeStatus(o.status);
    const matchesFilter = filter === 'all' || normalizedStatus === filter;
    const tableName = tableNameMap[o.tableId] || '';
    const matchesSearch = o.tableId.includes(searchTerm)
      || (o.id || (o as any)._id || '').includes(searchTerm)
      || tableName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (normalizeStatus(status)) {
      case 'active': return 'bg-amber-100 text-brand border-brand/20';
      case 'completed': return 'bg-emerald-100 text-emerald-600 border-emerald-200';
      case 'cancelled': return 'bg-rose-100 text-rose-600 border-rose-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (normalizeStatus(status)) {
      case 'active': return 'Đang phục vụ';
      case 'completed': return 'Đã thanh toán';
      case 'cancelled': return 'Đã huỷ';
      default: return status;
    }
  };

  return (
    <div className="space-y-10 pb-12">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-gray-900 tracking-tight font-serif">Đơn Hàng</h2>
          <p className="text-gray-500 font-medium mt-1">Theo dõi và xử lý các đơn hàng theo thời gian thực</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative group min-w-[300px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-brand transition-colors" />
            <input
              type="text"
              placeholder="Tìm mã đơn hoặc số bàn..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-gray-100 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-brand/20 shadow-card transition-all"
            />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
        {['all', 'active', 'completed', 'cancelled'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn(
              "px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border shrink-0",
              filter === s
                ? "bg-slate-900 text-white border-slate-900 shadow-xl shadow-slate-900/10"
                : "bg-white text-gray-500 border-gray-100 hover:border-brand/40 hover:text-brand shadow-card"
            )}
          >
            {s === 'all' ? 'Tất cả đơn' : getStatusLabel(s)}
          </button>
        ))}
      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <AnimatePresence mode="popLayout">
          {filteredOrders.map((order, i) => {
            const orderId = (order as any)._id || order.id || '';
            return (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05 }}
                key={orderId}
                className="premium-card p-0 flex flex-col relative"
              >
                {/* Visual Status Indicator */}
                <div className={cn("h-2 w-full rounded-t-[2rem]", normalizeStatus(order.status) === 'active' ? 'bg-brand' : normalizeStatus(order.status) === 'completed' ? 'bg-emerald-500' : 'bg-rose-500')} />

                <div className="p-8 space-y-8 flex-1">
                  {/* Header Row with Total */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-5">
                      <div className={cn(
                        "w-16 h-16 rounded-[2rem] flex items-center justify-center text-white shadow-xl border-4 border-white",
                        order.orderType === 'delivery' ? "bg-red-600" : order.orderType === 'takeaway' ? "bg-amber-500" : "bg-slate-900"
                      )}>
                        <span className="text-xl font-serif font-black">
                          {order.orderType === 'delivery' ? 'D' : order.orderType === 'takeaway' ? 'T' : (tableNameMap[order.tableId] || order.tableId).replace('Bàn ', '')}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-xl font-bold font-serif text-gray-900 leading-tight">
                          {order.orderType === 'delivery' ? 'Đơn Giao Hàng' : order.orderType === 'takeaway' ? 'Đơn Mang Về' : (tableNameMap[order.tableId] || order.tableId).startsWith('Bàn') ? (tableNameMap[order.tableId] || order.tableId) : `Bàn ${tableNameMap[order.tableId] || order.tableId}`}
                        </h4>
                        
                        {order.customerInfo && (order.orderType === 'delivery' || order.orderType === 'takeaway') && (
                          <div className="mt-3 bg-gray-50/80 p-3 rounded-xl border border-gray-100 space-y-1">
                            <h5 className="text-[10px] font-black uppercase tracking-[0.1em] text-gray-400 flex items-center gap-1.5">
                              <User className="w-3 h-3" /> Thông tin khách hàng
                            </h5>
                            <p className="text-xs font-bold text-gray-900">
                              {order.customerInfo.name || 'Khách Kiosk'} - {order.customerInfo.phone}
                            </p>
                          </div>
                        )}

                        <div className="flex items-center gap-2 mt-2">
                          <span className={cn(
                            "inline-flex items-center justify-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.15em] border whitespace-nowrap",
                            getStatusColor(order.status)
                          )}>
                            {getStatusLabel(order.status)}
                          </span>
                          <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">#{orderId.slice(-6).toUpperCase()}</span>
                          
                          {/* Sync PayOS Button */}
                          {normalizeStatus(order.status) === 'active' && order.orderCode && (
                            <button 
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  toast.loading('Đang kiểm tra PayOS...');
                                  const res = await axios.get(`/api/payments/verify/${order.orderCode}`);
                                  toast.dismiss();
                                  if (res.data.success) {
                                    toast.success('Đã cập nhật thanh toán từ PayOS!');
                                    fetchOrders();
                                  } else {
                                    toast.info('Chưa có thông tin thanh toán mới.');
                                  }
                                } catch (err) {
                                  toast.dismiss();
                                  toast.error('Lỗi khi kiểm tra PayOS');
                                }
                              }}
                              className="ml-2 p-1.5 bg-slate-50 border border-slate-200 text-slate-400 hover:text-brand hover:border-brand/40 rounded-lg transition-all"
                              title="Kiểm tra trạng thái PayOS"
                            >
                              <RefreshCw className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Pre-calculate and display Total of ORDERED items */}
                    {(() => {
                      const relevantItems = order.items.filter(item => item.status !== 'in_cart' && item.status !== 'cancelled');
                      const currentTotal = relevantItems.reduce((sum, item) => sum + (item.totalPrice ?? 0), 0);
                      const unpaidAmount = relevantItems
                        .filter(item => !item.isPaid)
                        .reduce((sum, item) => sum + (item.totalPrice ?? 0), 0);
                      const isFullyPaid = unpaidAmount <= 0 && relevantItems.length > 0;

                      return (
                        <div className="text-right flex flex-col items-end">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center justify-end gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            {new Date(order.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          {isFullyPaid && (
                            <div className="mb-2 px-3 py-1 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center gap-1.5 shadow-lg shadow-emerald-200 animate-bounce-subtle">
                              <CheckCircle2 className="w-3 h-3" /> Đã trả hết
                            </div>
                          )}
                          <p className="text-2xl font-black text-slate-900 tracking-tight">{currentTotal.toLocaleString()}đ</p>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Items Display */}
                  <div className="bg-bg/50 rounded-[1.5rem] p-6 border border-gray-50">
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-4">Chi tiết món ăn</p>
                    <div className="space-y-4 max-h-[200px] overflow-y-auto no-scrollbar pr-2">
                      {(() => {
                        const activeItems = order.items.filter(item => item.status !== 'in_cart' && item.status !== 'cancelled');

                        if (activeItems.length === 0) {
                          return <p className="text-xs italic text-gray-400 py-4 text-center">Chưa có món nào được đặt...</p>;
                        }

                        const groupedCardItems = activeItems.reduce((acc: any[], item) => {
                          const addonKey = (item.selectedAddons || []).map((a: any) => a.name).sort().join(',');
                          const optionKey = item.selectedOption?.name || '';
                          const key = `${item.name}-${optionKey}-${addonKey}-${item.isPaid}`;
                          const existing = acc.find(i => i.groupKey === key);
                          if (existing) {
                            existing.quantity += (item.quantity || 1);
                            existing.totalPrice += (item.totalPrice ?? item.basePrice ?? item.price ?? 0);
                            existing.rawItems.push({ id: item._id, isPaid: item.isPaid });
                          } else {
                            acc.push({ 
                              ...item, 
                              groupKey: key, 
                              quantity: item.quantity || 1, 
                              totalPrice: item.totalPrice ?? item.basePrice ?? item.price ?? 0, 
                              rawItems: [{ id: item._id, isPaid: item.isPaid }] 
                            });
                          }
                          return acc;
                        }, []);

                        return groupedCardItems.map((item, idx) => (
                          <div key={idx} className="bg-white rounded-2xl p-3 border border-gray-100 flex gap-4 group hover:border-brand/30 transition-all duration-300">
                            <div className="w-16 h-16 shrink-0 rounded-xl overflow-hidden shadow-sm relative mt-0.5">
                               <img src={item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1760&auto=format&fit=crop'} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={item.name} />
                               <div className="absolute inset-0 bg-black/5 rounded-xl"></div>
                            </div>
                            <div className="flex-1 flex flex-col justify-between py-0.5">
                              <div>
                                <div className="flex justify-between items-start gap-2">
                                  <div className="flex items-center gap-2">
                                    <p className="font-bold text-gray-800 text-sm leading-tight">
                                      {item.name}
                                      {item.isPaid && (
                                        <span className="ml-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[8px] font-black uppercase border border-emerald-100 shadow-sm">
                                          <CheckCircle2 className="w-2.5 h-2.5" /> Đã trả
                                        </span>
                                      )}
                                    </p>
                                  </div>
                                  <div className="bg-gray-50 px-2 py-0.5 rounded-md border border-gray-200">
                                    <span className="text-[11px] font-black text-gray-600 whitespace-nowrap">x{item.quantity}</span>
                                  </div>
                                </div>
                                {(item.selectedOption || (item.selectedAddons && item.selectedAddons.length > 0)) && (
                                  <div className="mt-1.5 flex flex-wrap gap-1">
                                    {item.selectedOption && (
                                      <span className="text-[9px] font-black bg-slate-50 text-slate-500 px-1.5 py-0.5 rounded border border-slate-100 uppercase">
                                        {item.selectedOption.name}
                                      </span>
                                    )}
                                    {item.selectedAddons?.map((addon: any, aIdx: number) => (
                                      <span key={aIdx} className="text-[9px] font-black bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded border border-amber-100 uppercase">
                                        + {addon.name}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {item.note && <p className="text-[9px] text-orange-500 italic mt-1 bg-orange-50 w-fit px-1.5 py-0.5 rounded">Ghi chú: {item.note}</p>}
                              </div>
                              <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                                <span className="text-sm font-black text-brand tracking-tight">{Number(item.totalPrice).toLocaleString()}đ</span>
                                {!item.isPaid && (
                                  <button
                                    onClick={() => {
                                      const unpaidItems = item.rawItems.filter(i => !i.isPaid);
                                      if (unpaidItems.length === 0) return;
                                      
                                      const sessionId = (order as any)._id || order.id;
                                      setConfirmConfig({
                                        isOpen: true,
                                        title: 'Hủy bớt món',
                                        message: `Nhập số lượng ${item.name} cần hủy:`,
                                        variant: 'danger',
                                        inputConfig: {
                                          type: 'number',
                                          min: 1,
                                          max: unpaidItems.length,
                                          defaultValue: 1
                                        },
                                        onConfirm: async (cancelAmount?: number) => {
                                          try {
                                            const amount = Math.min(Math.max(1, cancelAmount || 1), unpaidItems.length);
                                            const itemsToCancel = unpaidItems.slice(-amount);
                                            
                                            await Promise.all(itemsToCancel.map(targetItem => 
                                              axios.put(`/api/orders/${sessionId}/item/${targetItem.id}/status`, { status: 'cancelled' })
                                            ));
                                            fetchOrders();
                                            toast.success(`Đã hủy ${amount} suất ${item.name}`);
                                          } catch (err) {
                                            console.error('Cancel item failed:', err);
                                            toast.error('Lỗi khi hủy món');
                                          }
                                        }
                                      });
                                    }}
                                    className="text-[10px] bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-500 hover:text-rose-600 px-2.5 py-1 rounded-[6px] font-bold uppercase transition-colors flex items-center gap-1 opacity-0 group-hover:opacity-100 shadow-sm"
                                  >
                                    <XCircle className="w-3 h-3" /> Hủy bớt
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>

                  {/* Actions Area */}
                  <div className="flex items-center gap-4 pt-4 border-t border-gray-50">
                    {order.items.some(item => item.status === 'pending_approval') && (
                      <button onClick={() => approveAll(orderId)} className="px-5 bg-white border border-gray-100 text-gray-600 rounded-2xl hover:bg-gray-50 transition-all flex items-center justify-center h-[52px] font-black text-[10px] uppercase tracking-widest">
                        Duyệt tất cả
                      </button>
                    )}

                    {order.status === 'active' && (() => {
                      const relevantItems = order.items.filter(item => item.status !== 'in_cart' && item.status !== 'cancelled');
                      const unpaidAmount = relevantItems
                        .filter(item => !item.isPaid)
                        .reduce((sum, item) => sum + (item.totalPrice ?? 0), 0);
                      const isFullyPaid = unpaidAmount <= 0 && relevantItems.length > 0;
                      const hasNoItems = relevantItems.length === 0;

                      return (
                        <button
                          onClick={() => {
                            const orderId = (order as any)._id || order.id;
                            
                            // Nếu chưa gọi món gì (chỉ có in_cart), cho phép Hủy/Đóng bàn luôn
                            if (hasNoItems) {
                              setConfirmConfig({
                                isOpen: true,
                                title: 'Xác nhận Đóng bàn',
                                message: 'Khách chưa đặt món nào. Xác nhận đóng bàn và giải phóng bàn?',
                                variant: 'info',
                                onConfirm: async () => {
                                  try {
                                    // Hủy luôn đơn hàng vì chưa có món
                                    await axios.put(`/api/orders/${orderId}`, { status: 'cancelled' });
                                    fetchOrders();
                                    toast.success('Đã giải phóng bàn!');
                                  } catch (err) {
                                    console.error('Cancellation failed:', err);
                                    toast.error('Lỗi khi đóng bàn!');
                                  }
                                }
                              });
                              return;
                            }

                            setConfirmConfig({
                              isOpen: true,
                              title: isFullyPaid ? 'Xác nhận Đóng bàn' : 'Xác nhận Thu tiền',
                              message: isFullyPaid 
                                ? `Đơn hàng đã được thanh toán hết. Xác nhận hoàn tất và giải phóng bàn?`
                                : `Đơn hàng còn thiếu ${unpaidAmount.toLocaleString()}đ (tiền mặt). Xác nhận thu và đóng bàn?`,
                              variant: isFullyPaid ? 'info' : 'warning',
                              onConfirm: async () => {
                                try {
                                  await axios.post(`/api/orders/${orderId}/complete`);
                                  fetchOrders();
                                  toast.success('Đơn hàng đã hoàn tất, bàn đã sẵn sàng!');
                                } catch (err) {
                                  console.error('Completion failed:', err);
                                  toast.error('Lỗi khi chốt đơn hàng!');
                                }
                              }
                            });
                          }}
                          className={cn(
                            "flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2",
                            hasNoItems
                              ? "bg-gray-100 text-gray-500 hover:bg-gray-200 shadow-none border border-gray-200"
                              : isFullyPaid ? "bg-emerald-600 text-white shadow-emerald-200 hover:bg-emerald-700" : "bg-brand text-white shadow-brand/20 hover:brightness-110"
                          )}
                        >
                          {hasNoItems 
                            ? <><XCircle className="w-4 h-4" /> Đóng bàn (Chưa đặt món)</>
                            : <><CreditCard className="w-4 h-4" /> {isFullyPaid ? 'Hoàn tất & Đóng bàn' : 'Thu tiền & Đóng bàn'}</>
                          }
                        </button>
                      );
                    })()}

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setSelectedOrderDetails(order)}
                        className="px-5 bg-white border border-gray-100 text-brand font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-brand/5 hover:border-brand/20 transition-all flex items-center justify-center h-[52px]"
                      >
                        Chi tiết
                      </button>
                      <div className="relative group/actions">
                        <button className="h-full px-5 bg-white border border-gray-100 text-gray-400 rounded-2xl hover:bg-gray-50 transition-all flex items-center justify-center h-[52px]">
                          <MoreVertical className="w-5 h-5" />
                        </button>
                      <div className="absolute right-0 bottom-full mb-3 w-56 bg-white rounded-[2rem] shadow-premium border border-gray-100 opacity-0 invisible group-hover/actions:opacity-100 group-hover/actions:visible transition-all z-10 p-2 overflow-hidden backdrop-blur-xl">
                        {['active', 'completed', 'cancelled'].map(s => (
                          <button
                            key={s}
                            onClick={() => updateStatus(orderId, s)}
                            className="w-full text-left px-5 py-4 text-xs font-black uppercase tracking-widest text-gray-600 hover:bg-bg rounded-2xl transition-all flex items-center justify-between group/item"
                          >
                            <span>{getStatusLabel(s)}</span>
                            {order.status === s ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <ChevronRight className="w-4 h-4 text-gray-200 group-hover/item:text-brand" />}
                          </button>
                        ))}
                      </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {filteredOrders.length === 0 && (
        <div className="premium-card py-32 flex flex-col items-center justify-center text-center">
          <div className="w-24 h-24 bg-gray-50 rounded-[3rem] flex items-center justify-center mb-6">
            <Receipt className="w-10 h-10 text-gray-200" />
          </div>
          <h3 className="text-2xl font-black text-gray-900 font-serif mb-2">Không tìm thấy đơn hàng</h3>
          <p className="text-gray-400 font-medium">Hãy thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false, inputConfig: undefined })}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        variant={confirmConfig.variant}
        inputConfig={confirmConfig.inputConfig}
      />

      {/* Order Details Modal */}
      {selectedOrderDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
          >
            <div className="w-full flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50">
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
                    {selectedOrderDetails.orderType === 'delivery' ? 'Giao hàng' : selectedOrderDetails.orderType === 'takeaway' ? 'Mang về' : 'Tại bàn'}
                    {' - '}
                    {(tableNameMap[selectedOrderDetails.tableId] || selectedOrderDetails.tableId).replace('Bàn ', 'Bàn ')}
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
                    <Receipt className="w-4 h-4" /> THÔNG TIN KHÁCH HÀNG (SHIPPER CHÚ Ý)
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
                    {selectedOrderDetails.orderType === 'delivery' && selectedOrderDetails.customerInfo.deliveryAddress && (
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-medium text-gray-600">Địa chỉ giao:</span>
                        <span className="text-sm font-bold text-gray-900 text-right max-w-[250px]">{selectedOrderDetails.customerInfo.deliveryAddress}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Danh sách món ({selectedOrderDetails.items.filter(i => i.status !== 'cancelled').reduce((acc, i) => acc + (i.quantity || 1), 0)} món)</p>
                <div className="space-y-3">
                  {(() => {
                    const groupedModalItems = (selectedOrderDetails.items || []).filter(i => i.status !== 'cancelled').reduce((acc: any[], item) => {
                      const addonKey = (item.selectedAddons || []).map((a: any) => a.name).sort().join(',');
                      const optionKey = item.selectedOption?.name || '';
                      // Phân tách riêng món đã trả và chưa trả
                      const key = `${item.name}-${optionKey}-${addonKey}-${item.isPaid}`;
                      const existing = acc.find(i => i.groupKey === key);
                      if (existing) {
                        existing.quantity += (item.quantity || 1);
                        existing.totalPrice += (item.totalPrice ?? item.basePrice ?? item.price ?? 0);
                        existing.rawItems.push({ id: item._id, isPaid: item.isPaid, quantity: item.quantity || 1 });
                      } else {
                        acc.push({ 
                          ...item, 
                          groupKey: key, 
                          quantity: item.quantity || 1, 
                          totalPrice: item.totalPrice ?? item.basePrice ?? item.price ?? 0, 
                          rawItems: [{ id: item._id, isPaid: item.isPaid, quantity: item.quantity || 1 }] 
                        });
                      }
                      return acc;
                    }, []);

                    return groupedModalItems.map((item, idx) => (
                      <div key={idx} className="flex gap-4 p-4 border border-gray-100 rounded-xl items-start bg-gray-50/50">
                        <div className="w-12 h-12 rounded-lg bg-gray-200 overflow-hidden shrink-0 mt-1">
                          <img 
                            src={item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1760&auto=format&fit=crop'} 
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-gray-900 text-sm flex items-center gap-2">
                            {item.name}
                            {item.isPaid && (
                              <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[8px] font-black uppercase border border-emerald-100 shadow-sm">
                                <CheckCircle2 className="w-2.5 h-2.5" /> Đã trả
                              </span>
                            )}
                          </p>
                          {item.selectedOption && <p className="text-[10px] font-bold text-gray-500">Kích cỡ: {item.selectedOption.name}</p>}
                          {item.selectedAddons && item.selectedAddons.length > 0 && (
                            <p className="text-[10px] font-bold text-gray-500 line-clamp-1">
                              Thêm: {item.selectedAddons.map(a => a.name).join(', ')}
                            </p>
                          )}
                          {item.note && <p className="text-[10px] text-orange-500 italic mt-0.5 bg-orange-50 w-fit px-1.5 py-0.5 rounded">Ghi chú: {item.note}</p>}
                        </div>
                        <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                          <div className="bg-white px-2 py-0.5 rounded-md border border-gray-200 shadow-sm shadow-gray-100">
                             <p className="text-xs font-black text-gray-600">x{item.quantity}</p>
                          </div>
                          <p className="text-sm font-black text-brand">{(item.totalPrice).toLocaleString()}đ</p>
                          
                          {/* Nút Hủy giảm */}
                          {!item.isPaid && (
                            <button
                               onClick={() => {
                                 // Tìm một phần ăn chưa thanh toán từ mảng gốc để hủy bớt
                                 const unpaidItems = item.rawItems.filter(i => !i.isPaid);
                                 if (unpaidItems.length === 0) return;
                                 
                                 const sessionId = (selectedOrderDetails as any)._id || selectedOrderDetails.id;
                                 setConfirmConfig({
                                   isOpen: true,
                                   title: 'Hủy bớt món',
                                   message: `Nhập số lượng ${item.name} cần hủy:`,
                                   variant: 'danger',
                                   inputConfig: {
                                     type: 'number',
                                     min: 1,
                                     max: unpaidItems.length,
                                     defaultValue: 1
                                   },
                                   onConfirm: async (cancelAmount?: number) => {
                                     try {
                                       const amount = Math.min(Math.max(1, cancelAmount || 1), unpaidItems.length);
                                       const itemsToCancel = unpaidItems.slice(-amount);
                                       
                                       await Promise.all(itemsToCancel.map(targetItem => 
                                         axios.put(`/api/orders/${sessionId}/item/${targetItem.id}/status`, { status: 'cancelled' })
                                       ));
                                       fetchOrders(); // Reload orders in background. useEffect sẽ tự động update selectedOrderDetails nên không cần đóng modal.
                                       toast.success(`Đã hủy ${amount} suất ${item.name}`);
                                     } catch (err) {
                                       console.error('Cancel item failed:', err);
                                       toast.error('Lỗi khi hủy món');
                                     }
                                   }
                                 });
                               }}
                               className="mt-1 px-2 py-1 bg-white border border-rose-100 text-rose-500 rounded-md text-[10px] font-black uppercase flex items-center gap-1 hover:bg-rose-50 hover:border-rose-200 transition-colors shadow-sm"
                            >
                              <XCircle className="w-3 h-3" /> Hủy bớt
                            </button>
                          )}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-100 bg-white flex justify-between items-center">
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
