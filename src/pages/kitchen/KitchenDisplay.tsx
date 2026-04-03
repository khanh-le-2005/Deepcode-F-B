import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat, Clock, CheckCircle2, Play, ArrowLeft, LogOut, ShoppingCart, Utensils, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import { Order, OrderItem } from '../../types';
import { useAuth } from '../../AuthContext';
import { Button } from '../../components/Button';
import { cn } from '../../lib/cn';

const socket = io();

export const KitchenDisplay = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [tableNameMap, setTableNameMap] = useState<Record<string, string>>({});
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleAuthFailure = () => {
    logout();
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    fetchOrders();
    fetchTables();
    
    socket.on('new-order', (newOrder: Order) => {
      setOrders(prev => {
        const orderId = (newOrder as any)._id || newOrder.id;
        if (!prev.find(o => ((o as any)._id === orderId || o.id === orderId))) {
          return [...prev, newOrder];
        }
        return prev;
      });
    });

    socket.on('order-updated', (updatedOrder: Order) => {
      setOrders(prev => {
        const updatedId = (updatedOrder as any)._id || updatedOrder.id;
        const exists = prev.some(o => ((o as any)._id === updatedId || o.id === updatedId));
        
        if (!exists) {
          const relevant = updatedOrder.items.some(i => i.status === 'pending_approval' || i.status === 'cooking');
          if (relevant) return [updatedOrder, ...prev];
          return prev;
        }
        
        return prev.map(o => ((o as any)._id === updatedId || o.id === updatedId) ? updatedOrder : o);
      });
    });

    return () => {
      socket.off('new-order');
      socket.off('order-updated');
    };
  }, []);

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

  const fetchOrders = () => {
    axios.get('/api/orders')
      .then(res => {
        const activeOrders = (res.data || []).filter((o: Order) => {
          if (o.status !== 'active') return false;
          return o.items.some(i => i.status === 'pending_approval' || i.status === 'cooking');
        });
        setOrders(activeOrders);
      })
      .catch(err => {
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          handleAuthFailure();
          return;
        }
        console.error("Failed to fetch orders:", err);
      });
  };

  const approveAllItems = async (orderId: string) => {
    try {
      await axios.put(`/api/orders/${orderId}/approve-all`);
      fetchOrders();
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        handleAuthFailure();
        return;
      }
      console.error("Failed to approve all items:", err);
    }
  };

  const updateItemStatus = async (orderId: string, itemId: string, status: OrderItem['status']) => {
    try {
      await axios.put(`/api/orders/${orderId}/item/${itemId}/status`, { status });
      fetchOrders();
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        handleAuthFailure();
        return;
      }
      console.error("Failed to update item status:", err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col overflow-x-hidden">
      {/* Premium Kitchen Header */}
      <header className="bg-slate-900/40 backdrop-blur-3xl border-b border-white/5 px-6 lg:px-12 py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-brand rounded-4xl flex items-center justify-center shadow-2xl shadow-brand/20 group-hover:rotate-12 transition-transform duration-500">
            <ChefHat className="w-9 h-9 text-white" />
          </div>
          <div>
            <h1 className="text-3xl lg:text-4xl font-black tracking-tight font-serif italic text-white leading-none">NHÀ BẾP</h1>
            <div className="flex items-center gap-3 mt-3">
              <span className="flex items-center gap-2 text-[10px] font-black uppercase text-emerald-500 tracking-[0.2em] bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                Đang trực tuyến
              </span>
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">• {orders.length} ĐƠN ĐANG CHỜ</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="flex-1 md:flex-none flex items-center gap-3">
            <Button
              variant="outline"
              className="flex-1 md:flex-none border-white/10 hover:text-white h-14 px-6 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
              onClick={() => navigate('/pos')}
            >
              <ShoppingCart className="w-4 h-4 mr-2" /> BÀN TRỐNG
            </Button>
            {user?.role === 'admin' && (
              <Button
                variant="ghost"
                className="text-slate-400 hover:text-white hover:bg-white/5 h-14 rounded-2xl px-6 font-black text-xs uppercase tracking-widest transition-all hidden lg:flex"
                onClick={() => navigate('/admin')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> ADMIN
              </Button>
            )}
          </div>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="h-14 w-14 bg-rose-500/10 text-rose-500 rounded-2xl hover:bg-rose-500 transition-all hover:text-white flex items-center justify-center shadow-lg shadow-rose-500/10"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Orders Grid - Responsive Layout */}
      <main className="flex-1 p-6 lg:p-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 content-start">
          <AnimatePresence mode="popLayout">
            {orders.map((order, i) => {
              const orderId = (order as any)._id || order.id;
              const kitchenItems = order.items.filter(i => i.status === 'pending_approval' || i.status === 'cooking');

              if (kitchenItems.length === 0) return null;

              const isAnyCooking = kitchenItems.some(i => i.status === 'cooking');

              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.95, y: 30 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  transition={{ delay: i * 0.05 }}
                  key={orderId}
                  className={cn(
                    "bg-slate-900 rounded-[3rem] border flex flex-col overflow-hidden shadow-premium transition-all duration-500 relative group",
                    isAnyCooking ? "border-brand/40 bg-slate-900/60 ring-1 ring-brand/20" : "border-white/5"
                  )}
                >
                  {/* Glowing Indicator for Cooking orders */}
                  {isAnyCooking && <div className="absolute top-0 left-12 right-12 h-[2px] bg-brand shadow-[0_0_20px_rgba(217,119,6,0.8)]" />}

                  {/* Ticket Header */}
                  <div className={cn(
                    "p-8 flex items-center justify-between",
                    isAnyCooking ? "bg-brand/10" : "bg-white/[0.02]"
                  )}>
                    <div>
                      <h3 className="text-3xl font-serif italic font-black text-white leading-none">BÀN {tableNameMap[order.tableId] || order.tableId}</h3>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mt-3 group-hover:text-brand transition-colors">#{orderId.slice(-6).toUpperCase()}</p>
                    </div>
                    <div className="bg-slate-950/80 px-4 py-3 rounded-2xl border border-white/5 flex items-center gap-3">
                      <Clock className={cn("w-4 h-4", isAnyCooking ? "text-brand animate-pulse" : "text-slate-500")} />
                      <span className="text-sm font-black text-white">{new Date(order.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>

                  {kitchenItems.some(item => item.status === 'pending_approval') && (
                    <div className="px-6">
                      <button
                        onClick={() => approveAllItems(orderId)}
                        className="w-full h-12 rounded-2xl border border-white/10 bg-white/5 text-white font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all"
                      >
                        Duyệt tất cả món chờ duyệt
                      </button>
                    </div>
                  )}

                  {/* Items Section */}
                  <div className="flex-1 p-6 space-y-4">
                    {kitchenItems.map((item, idx) => {
                      const itemId = (item as any)._id || idx.toString();
                      return (
                        <div key={itemId} className={cn(
                          "p-6 rounded-4xl border relative overflow-hidden transition-all duration-300",
                          item.status === 'cooking' ? "bg-white/[0.03] border-brand/20 shadow-inner" : "bg-white/[0.01] border-white/5"
                        )}>
                          <div className="flex items-start justify-between gap-4 mb-6">
                            <div className="flex-1">
                              <p className="text-lg font-black text-white leading-tight font-sans tracking-tight">{item.name}</p>
                              {item.note && (
                                <div className="flex items-start gap-2 mt-2 text-brand">
                                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                  <p className="text-xs font-bold leading-tight line-clamp-2 italic">{item.note}</p>
                                </div>
                              )}
                            </div>
                            <span className="w-12 h-12 shrink-0 bg-slate-950 rounded-2xl flex items-center justify-center font-black text-xl text-brand border border-brand/20 shadow-lg">
                              x{item.quantity}
                            </span>
                          </div>

                          {/* Item Action Buttons */}
                          <div className="flex gap-2 w-full pt-2">
                            {item.status === 'pending_approval' ? (
                              <button
                                onClick={() => updateItemStatus(orderId, itemId, 'cooking')}
                                className="flex-1 h-14 bg-brand text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-brand/20 flex items-center justify-center gap-2"
                              >
                                <Play className="w-4 h-4 fill-current" /> BẮT ĐẦU NẤU
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => updateItemStatus(orderId, itemId, 'pending_approval')}
                                  className="h-14 px-5 bg-white/5 text-slate-500 rounded-2xl hover:text-white transition-all active:scale-95 border border-white/5"
                                >
                                  DỪNG
                                </button>
                                <button
                                  onClick={() => updateItemStatus(orderId, itemId, 'served')}
                                  className="flex-1 h-14 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500 active:scale-95 transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2"
                                >
                                  <CheckCircle2 className="w-4 h-4" /> XONG MÓN
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Empty State */}
        {orders.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[60vh]">
            <div className="w-40 h-40 bg-slate-900 rounded-[4rem] flex items-center justify-center mb-10 border border-white/5 relative group">
              <ChefHat className="w-20 h-20 text-slate-700 transition-transform group-hover:scale-125 duration-700" />
              <div className="absolute inset-0 bg-brand/5 rounded-[4rem] animate-pulse" />
            </div>
            <h2 className="text-4xl font-serif italic font-black text-white mb-4">Mọi thứ đã sẵn sàng!</h2>
            <p className="text-slate-500 max-w-sm mx-auto text-lg leading-relaxed font-medium">Hiện chưa có đơn hàng nào cần chuẩn bị. Hãy thư giãn một chút nhé!</p>
          </div>
        )}
      </main>

      {/* Modern Sidebar/Floating Indicator for Desktop - Optional but looks premium */}
      <div className="fixed bottom-10 right-10 hidden xl:flex flex-col gap-4">
        <div className="bg-slate-900 px-6 py-4 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-xl flex items-center gap-4">
          <Utensils className="w-6 h-6 text-brand" />
          <div>
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Hiệu suất bếp</p>
            <p className="text-sm font-black text-white uppercase">Cực kỳ tốt</p>
          </div>
        </div>
      </div>
    </div>
  );
};
