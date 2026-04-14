import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChefHat, Clock, CheckCircle2, Play, ArrowLeft, LogOut, 
  ShoppingCart, Utensils, AlertCircle, Timer, Coffee,
  Sun, Moon // Thêm icon cho mode
} from 'lucide-react';
import axiosInstance from '@/src/lib/axiosClient';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import { Order, OrderItem } from '../../types';
import { useAuth } from '../../AuthContext';
import { Button } from '../../components/Button';
import { cn } from '../../lib/cn';

import { useSocket } from '../../contexts/SocketContext';

export const KitchenDisplay = () => {
  const { socket } = useSocket();
  const [orders, setOrders] = useState<Order[]>([]);
  const [tableNameMap, setTableNameMap] = useState<Record<string, string>>({});
  const [isDark, setIsDark] = useState(true); // State quản lý mode
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // --- GIỮ NGUYÊN LOGIC NGHIỆP VỤ ---
  const handleAuthFailure = () => {
    logout();
    navigate('/auth/login', { replace: true });
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
          const relevant = updatedOrder.items.some(i => i.status === 'cooking');
          if (relevant) return [updatedOrder, ...prev];
          return prev;
        }
        return prev.map(o => ((o as any)._id === updatedId || o.id === updatedId) ? updatedOrder : o);
      });
    });

    socket.on('notification:kitchen', () => {
      // Khi có thông báo mới (đơn mới được duyệt), tự động load lại danh sách
      fetchOrders();
    });

    socket.on('notification:staff', () => {
      // Khi có bàn chốt đơn (pending_approval), tự động load để bếp thấy đơn mới
      fetchOrders();
    });
 
    return () => {
      socket.off('new-order');
      socket.off('order-updated');
      socket.off('notification:kitchen');
    };
  }, []);

  const fetchTables = () => {
    axiosInstance.get('/api/tables')
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
    axiosInstance.get('/api/orders')
      .then(res => {
        const activeOrders = (res.data || []).filter((o: Order) => {
          if (o.status !== 'active') return false;
          // Hiển thị cả món đang chờ duyệt và món đang nấu
          return o.items.some(i => i.status === 'cooking' || i.status === 'pending_approval');
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


  const updateItemStatus = async (orderId: string, itemId: string, status: OrderItem['status']) => {
    try {
      await axiosInstance.put(`/api/orders/${orderId}/item/${itemId}/status`, { status });
      fetchOrders();
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        handleAuthFailure();
        return;
      }
    }
  };
  // --- KẾT THÚC LOGIC ---

  return (
    <div className={cn(
      "min-h-screen transition-colors duration-500 flex flex-col selection:bg-brand/30",
      isDark ? "bg-[#020617] text-slate-200" : "bg-slate-50 text-slate-900"
    )}>
      {/* Header */}
      <header className={cn(
        "h-24 px-8 flex items-center justify-between border-b sticky top-0 z-50 backdrop-blur-2xl transition-colors duration-500",
        isDark ? "bg-slate-950/50 border-white/5" : "bg-white/70 border-slate-200"
      )}>
        <div className="flex items-center gap-5">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-brand to-orange-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
            <div className={cn(
              "relative w-14 h-14 rounded-2xl flex items-center justify-center border transition-colors",
              isDark ? "bg-slate-900 border-white/10" : "bg-white border-slate-200 shadow-sm"
            )}>
              <ChefHat className="w-8 h-8 text-brand" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className={cn("text-2xl font-bold uppercase italic font-serif", isDark ? "text-white" : "text-slate-900")}>KDS Terminal</h1>
              <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-bold rounded-md animate-pulse">
                LIVE
              </span>
            </div>
            <p className="text-slate-500 text-xs font-medium tracking-widest mt-0.5 uppercase">
               {orders.length} đơn hàng đang chuẩn bị
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Mode Toggle Button */}
          <button
            onClick={() => setIsDark(!isDark)}
            className={cn(
              "h-12 w-12 flex items-center justify-center rounded-xl transition-all duration-300 border",
              isDark ? "bg-slate-900 border-white/10 text-yellow-400 hover:bg-slate-800" : "bg-white border-slate-200 text-indigo-600 hover:bg-slate-50 shadow-sm"
            )}
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <div className={cn("w-px h-8 mx-2", isDark ? "bg-white/10" : "bg-slate-200")} />

          {user?.role === 'admin' && (
            <>
              <Button
                variant="ghost"
                onClick={() => navigate('/pos')}
                className={cn(
                  "rounded-xl h-12 px-5 transition-all",
                  isDark ? "text-slate-400 hover:text-white hover:bg-white/5" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                )}
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Sơ đồ bàn
              </Button>
              
              <Button
                variant="ghost"
                onClick={() => navigate('/admin')}
                className={cn(
                  "rounded-xl h-12 px-5 transition-all",
                  isDark ? "text-slate-400 hover:text-white hover:bg-white/5" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                )}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Admin
              </Button>
            </>
          )}

          <div className={cn("w-px h-8 mx-2", isDark ? "bg-white/10" : "bg-slate-200")} />

          <button
            onClick={() => { logout(); navigate('/auth/login'); }}
            className="h-12 w-12 flex items-center justify-center rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all duration-300"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <main className="p-8 flex-1 overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          <AnimatePresence mode="popLayout">
            {orders.map((order, i) => {
              const orderId = (order as any)._id || order.id;
              const kitchenItems = order.items.filter(i => i.status === 'cooking' || i.status === 'pending_approval');
              if (kitchenItems.length === 0) return null;

              const isAnyCooking = kitchenItems.some(i => i.status === 'cooking');

              return (
                <motion.div
                  key={orderId}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={cn(
                    "flex flex-col rounded-[2rem] overflow-hidden border transition-all duration-500",
                    isDark 
                      ? (isAnyCooking ? "bg-slate-900/40 border-brand/30 shadow-[0_20px_50px_rgba(217,119,6,0.1)]" : "bg-slate-900/40 border-white/5 shadow-2xl")
                      : (isAnyCooking ? "bg-white border-brand/40 shadow-[0_20px_40px_rgba(217,119,6,0.1)]" : "bg-white border-slate-200 shadow-sm")
                  )}
                >
                  {/* Ticket Header */}
                  <div className={cn(
                    "p-6 relative",
                    isDark ? (isAnyCooking ? "bg-brand/5" : "bg-white/[0.02]") : (isAnyCooking ? "bg-brand/5" : "bg-slate-50")
                  )}>
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">BÀN</span>
                        <h2 className={cn("text-4xl font-serif italic font-black leading-tight", isDark ? "text-white" : "text-slate-900")}>
                          {tableNameMap[order.tableName] || order.tableName}
                        </h2>
                      </div>
                      <div className="text-right">
                        <div className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-full border mb-2",
                          isDark ? "bg-black/40 border-white/5" : "bg-white border-slate-200"
                        )}>
                          <Timer className={cn("w-3.5 h-3.5", isAnyCooking ? "text-brand animate-pulse" : "text-slate-400")} />
                          <span className={cn("text-xs font-mono font-bold", isDark ? "text-white" : "text-slate-700")}>
                            {new Date(order.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="p-5 flex-1 flex flex-col gap-4">

                    <div className="space-y-3">
                      {kitchenItems.map((item, idx) => {
                        const itemId = (item as any)._id || idx.toString();
                        const isCooking = item.status === 'cooking';
                        const isPending = item.status === 'pending_approval';

                        return (
                          <div key={itemId} className={cn(
                            "p-4 rounded-3xl border transition-all duration-300",
                            isDark 
                              ? (isCooking ? "bg-slate-800/50 border-brand/20" : isPending ? "bg-amber-500/10 border-amber-500/30" : "bg-black/20 border-white/5 opacity-70")
                              : (isCooking ? "bg-orange-50/50 border-brand/20 shadow-sm" : isPending ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-100")
                          )}>
                            <div className="flex justify-between gap-4">
                              <div className="flex-1">
                                <h4 className={cn("font-bold text-base leading-snug", isDark ? "text-white" : "text-slate-900")}>
                                  {item.name}
                                </h4>
                                {item.note && (
                                  <div className="mt-2 flex items-start gap-2 text-orange-500 bg-orange-500/5 p-2 rounded-xl border border-orange-500/10">
                                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                    <p className="text-[11px] leading-tight font-medium italic">{item.note}</p>
                                  </div>
                                )}
                              </div>
                              <div className="text-2xl font-black font-mono text-brand">
                                <span className="text-xs text-slate-400 mr-1 italic font-sans">x</span>
                                {item.quantity}
                              </div>
                            </div>

                            <div className="mt-4 flex gap-2">
                                  <button
                                    onClick={() => updateItemStatus(orderId, itemId, 'served')}
                                    className="flex-1 h-11 bg-emerald-500 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-emerald-600 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                                  >
                                    <CheckCircle2 className="w-4 h-4" /> Hoàn tất
                                  </button>
                                  {isPending && (
                                    <div className="flex-1 h-11 bg-amber-500/10 text-amber-600 rounded-xl font-bold text-[8px] uppercase tracking-tighter flex items-center justify-center border border-amber-500/20">
                                      Chờ duyệt
                                    </div>
                                  )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Empty State */}
        {orders.length === 0 && (
          <div className="h-[60vh] flex flex-col items-center justify-center text-center">
            <div className={cn(
              "w-32 h-32 rounded-[3rem] flex items-center justify-center shadow-2xl mb-8 border transition-colors",
              isDark ? "bg-slate-900 border-white/10" : "bg-white border-slate-200"
            )}>
              <Coffee className={cn("w-12 h-12", isDark ? "text-slate-700" : "text-slate-300")} />
            </div>
            <h2 className={cn("text-3xl font-serif italic font-black mb-3", isDark ? "text-white" : "text-slate-900")}>Tạm hết đơn hàng</h2>
            <p className="text-slate-500 max-w-xs font-medium italic">Bếp của bạn đã hoàn thành mọi thứ!</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className={cn(
        "h-14 px-8 border-t flex items-center justify-between text-[10px] font-bold uppercase tracking-widest transition-colors",
        isDark ? "bg-slate-950/80 border-white/5 text-slate-500" : "bg-white border-slate-200 text-slate-400"
      )}>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            Connected
          </div>
          <div>Kitchen: <span className={isDark ? "text-slate-300" : "text-slate-600"}>{user?.name}</span></div>
        </div>
        <div className="flex items-center gap-2 italic">
          <Utensils className="w-3 h-3" />
          v2.2.0 • {isDark ? 'Dark Mode' : 'Light Mode'}
        </div>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { 
          background: ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}; 
          border-radius: 10px; 
        }
      `}</style>
    </div>
  );
};