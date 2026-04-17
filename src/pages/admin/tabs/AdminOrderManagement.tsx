import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Search, Filter, Clock, CheckCircle2, XCircle, MoreVertical, CreditCard, Receipt, ChevronRight } from 'lucide-react';
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
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    variant: 'warning'
  });

  useEffect(() => {
    fetchOrders();
    fetchTables();
    socket.on('new-order', (newOrder) => {
      setOrders(prev => [newOrder, ...prev]);
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
      .then(res => setOrders(res.data.reverse()))
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
                className="premium-card p-0 flex flex-col overflow-hidden relative"
              >
                {/* Visual Status Indicator */}
                <div className={cn("h-2 w-full", normalizeStatus(order.status) === 'active' ? 'bg-brand' : normalizeStatus(order.status) === 'completed' ? 'bg-emerald-500' : 'bg-rose-500')} />

                <div className="p-8 space-y-8 flex-1">
                  {/* Card Main Header */}
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
                        <h4 className="text-xl font-bold font-serif text-gray-900">
                          {order.orderType === 'delivery' ? 'Đơn Giao Hàng' : order.orderType === 'takeaway' ? 'Đơn Mang Về' : (tableNameMap[order.tableId] || order.tableId).startsWith('Bàn') ? (tableNameMap[order.tableId] || order.tableId) : `Bàn ${tableNameMap[order.tableId] || order.tableId}`}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={cn(
                            "inline-flex items-center justify-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.15em] border whitespace-nowrap",
                            getStatusColor(order.status)
                          )}>
                            {getStatusLabel(order.status)}
                          </span>
                          <span className={cn(
                            "inline-flex items-center justify-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                            order.paymentMethod === 'transfer' ? "bg-purple-100 text-purple-600 border-purple-200" : "bg-blue-100 text-blue-600 border-blue-200"
                          )}>
                             {order.paymentMethod === 'transfer' ? 'Chuyển khoản' : 'Tiền mặt'}
                          </span>
                          <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">#{orderId.slice(-6).toUpperCase()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center justify-end gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(order.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-2xl font-black text-slate-900 tracking-tight">{Number(order.total || 0).toLocaleString()}đ</p>
                    </div>
                  </div>

                  {/* Items Display */}
                  <div className="bg-bg/50 rounded-[1.5rem] p-6 border border-gray-50">
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-4">Chi tiết món ăn</p>
                    <div className="space-y-4 max-h-[200px] overflow-y-auto no-scrollbar pr-2">
                      {(() => {
                        // Grouping Logic
                        const groupedItems = order.items.reduce((acc: any[], item) => {
                          const addonKey = (item.selectedAddons || [])
                            .map((a: any) => a.name)
                            .sort()
                            .join(',');
                          const optionKey = item.selectedOption?.name || '';
                          const key = `${item.name}-${optionKey}-${addonKey}`;

                          const existing = acc.find(i => i.groupKey === key);
                          if (existing) {
                            existing.quantity += (item.quantity || 1);
                            existing.totalPrice += (item.totalPrice ?? item.basePrice ?? item.price ?? 0);
                          } else {
                            acc.push({ 
                              ...item, 
                              groupKey: key,
                              quantity: item.quantity || 1,
                              totalPrice: item.totalPrice ?? item.basePrice ?? item.price ?? 0
                            });
                          }
                          return acc;
                        }, []);

                        return groupedItems.map((item, idx) => (
                          <div key={idx} className="bg-white rounded-2xl p-3 border border-gray-100 flex gap-4 group hover:border-brand/30 transition-all duration-300">
                            {/* Item Image */}
                            <div className="w-16 h-16 shrink-0 rounded-xl overflow-hidden shadow-sm">
                               <img 
                                 src={item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1760&auto=format&fit=crop'} 
                                 className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                                 alt={item.name} 
                               />
                            </div>

                            <div className="flex-1 flex flex-col justify-between py-0.5">
                              <div>
                                <div className="flex justify-between items-start gap-2">
                                  <p className="font-bold text-gray-800 text-sm leading-tight">{item.name}</p>
                                  <span className="text-[10px] font-black text-gray-400 whitespace-nowrap">x{item.quantity}</span>
                                </div>
                                
                                {/* Options & Addons display */}
                                {(item.selectedOption || (item.selectedAddons && item.selectedAddons.length > 0)) && (
                                  <div className="mt-1.5 flex flex-wrap gap-1">
                                    {item.selectedOption && (
                                      <span className="text-[8px] font-black bg-slate-50 text-slate-500 px-1.5 py-0.5 rounded border border-slate-100 uppercase">
                                        {item.selectedOption.name}
                                      </span>
                                    )}
                                    {item.selectedAddons?.map((addon: any, aIdx: number) => (
                                      <span key={aIdx} className="text-[8px] font-black bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded border border-amber-100 uppercase">
                                        + {addon.name}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center justify-between mt-1">
                                <span className="text-xs font-black text-brand italic">
                                  {Number(item.totalPrice).toLocaleString()}đ
                                </span>
                                <div className="h-1 w-1 bg-brand rounded-full opacity-30" />
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
                      <button
                        onClick={() => approveAll(orderId)}
                        className="px-5 bg-white border border-gray-100 text-gray-600 rounded-2xl hover:bg-gray-50 transition-all flex items-center justify-center h-[52px] font-black text-[10px] uppercase tracking-widest"
                      >
                        Duyệt tất cả
                      </button>
                    )}

                    {order.status === 'active' && (
                      <button
                        onClick={() => handlePayment(order)}
                        className="flex-1 bg-brand text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-brand/20 flex items-center justify-center gap-2"
                      >
                        <CreditCard className="w-4 h-4" />
                        {order.paymentStatus === 'paid' ? 'Hoàn thành & Chốt đơn' : 'Thu tiền & Đóng bàn'}
                      </button>
                    )}

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
        onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        variant={confirmConfig.variant}
      />
    </div>
  );
};
