import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Minus, X, Trash2, Search, Heart,
  ShoppingBag, ChevronRight, Facebook, Twitter, Instagram, MapPin, Mail, Phone
} from 'lucide-react';
import axiosLib from 'axios';
import axios from '@/src/lib/axiosClient';
import { io } from 'socket.io-client';
import { MenuItem, OrderItem, Order } from '../../types';
import { cn } from '../../lib/cn';
import { Button } from '../../components/Button';
import { CustomerHeader } from '../../components/CustomerHeader';
import { InvalidTable } from '../../components/InvalidTable';
import { useTableValidation } from '../../hooks/useTableValidation';
import { useCart } from '../../contexts/CartContext';
import { getMenuItemCategoryName, getMenuItemId, getMenuItemImageUrl } from '../../lib/menuHelpers';

const socket = io();

export const MenuPage = () => {
  const { tableId } = useParams();
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const { cart, addToCart, removeFromCart, updateQuantity, totalPrice, totalItems, clearCart } = useCart();
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [toastItem, setToastItem] = useState<{ name: string, image: string } | null>(null);
  const navigate = useNavigate();
  const { status } = useTableValidation(tableId);

  const [activeSession, setActiveSession] = useState<Order | null>(null);

  const extractList = <T,>(payload: any): T[] => {
    if (Array.isArray(payload)) return payload as T[];
    if (Array.isArray(payload?.data)) return payload.data as T[];
    if (Array.isArray(payload?.results)) return payload.results as T[];
    if (Array.isArray(payload?.items)) return payload.items as T[];
    if (Array.isArray(payload?.menuItems)) return payload.menuItems as T[];
    return [];
  };

  const fetchActiveSession = async () => {
    if (!tableId) return;
    try {
      const res = await axios.get(`/api/orders/table/${tableId}/active-session`);
      setActiveSession(res.data);
    } catch (error: any) {
      if (error.response?.status === 404) {
        setActiveSession(null);
      }
    }
  };

  useEffect(() => {
    if (status !== 'valid') return;
    axios.get('/api/weekly-menu/active')
      .then(res => {
        if (!res.data) {
          setMenu([]);
          return;
        }
        setMenu(extractList<MenuItem>(res.data.menuItems || res.data));
      })
      .catch(err => {
        console.error("Failed to fetch menu:", err);
        setMenu([]);
    });
    fetchActiveSession();

    const handleOrderUpdate = (updatedOrder: Order) => {
      const slugify = (str?: string) => str ? String(str).toLowerCase().trim().replace(/[\s\W-]+/g, '-') : '';
      if (tableId && (updatedOrder.tableId === tableId || updatedOrder.tableId === slugify(tableId))) {
        setActiveSession(updatedOrder.status === 'active' ? updatedOrder : null);
      }
    };

    socket.on('order-updated', handleOrderUpdate);
    socket.on('new-order', handleOrderUpdate);

    return () => {
      socket.off('order-updated', handleOrderUpdate);
      socket.off('new-order', handleOrderUpdate);
    };
  }, [status, tableId]);

  useEffect(() => {
    const updateViewport = () => setIsMobile(window.innerWidth < 768);
    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center bg-[#fcf9f4]"><div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (status === 'invalid') {
    return <InvalidTable tableId={tableId} />;
  }

  const visibleMenu = menu;
  const categories = ['Tất cả', ...new Set(visibleMenu.map(item => getMenuItemCategoryName(item)))];
  const filteredMenu = selectedCategory === 'Tất cả'
    ? visibleMenu
    : visibleMenu.filter(item => getMenuItemCategoryName(item) === selectedCategory);

  const getItemImageUrl = (item: MenuItem): string => getMenuItemImageUrl(item);

  const handleAddToCart = async (item: MenuItem) => {
    if (tableId) {
      try {
        const response = await axios.post('/api/orders', {
          tableId,
          items: [{
            menuItemId: getMenuItemId(item),
            name: item.name,
            basePrice: item.price,
            quantity: 1,
            image: getItemImageUrl(item),
            category: getMenuItemCategoryName(item),
          }]
        });
        if (response.data) {
          setActiveSession(response.data);
        } else {
          fetchActiveSession();
        }
        setToastItem({ name: item.name, image: getItemImageUrl(item) });
        setTimeout(() => setToastItem(null), 3000);
      } catch (err) {
        console.error("Failed to add to shared cart", err);
        const apiMessage = axiosLib.isAxiosError(err) ? err.response?.data?.error?.message || err.response?.data?.message : null;
        alert(apiMessage || "Lỗi khi thêm món vào giỏ bàn. Vui lòng thử lại!");
      }
    } else {
      addToCart({
        menuItemId: getMenuItemId(item),
        name: item.name,
        basePrice: item.price,
        quantity: 1,
        totalPrice: item.price,
        status: 'in_cart',
        image: getItemImageUrl(item),
        category: getMenuItemCategoryName(item),
      });
      setToastItem({ name: item.name, image: getItemImageUrl(item) });
      setTimeout(() => setToastItem(null), 3000);
    }
  };

  const handleRemoveTableCartItem = async (itemId: string) => {
    if (!tableId || !activeSession) return;
    try {
      await axios.delete(`/api/orders/${activeSession.id || activeSession._id}/item/${itemId}`);
      await fetchActiveSession();
    } catch (err) {
      console.error("Failed to remove item from table cart:", err);
      alert("Không thể xoá món khỏi giỏ bàn. Vui lòng thử lại!");
    }
  };

  const handleUpdateTableCartItemQuantity = async (itemId: string, delta: number) => {
    if (!tableId || !activeSession) return;
    try {
      await axios.patch(`/api/orders/${activeSession.id || activeSession._id}/item/${itemId}/quantity`, {
        delta,
      });
      await fetchActiveSession();
    } catch (err) {
      console.error("Failed to update table cart item quantity:", err);
      alert("Không thể cập nhật số lượng món trong giỏ bàn. Vui lòng thử lại!");
    }
  };

  const serverCartItems = activeSession ? activeSession.items : [];
  const displayCart = tableId ? serverCartItems : cart;
  const displayTotalItems = tableId ? displayCart.reduce((sum, item) => sum + item.quantity, 0) : totalItems;
  const displayTotalPrice = tableId ? (activeSession?.total ?? displayCart.reduce((sum, item) => sum + (item.quantity * item.basePrice), 0)) : totalPrice;
  const hasTableCartItems = tableId ? displayCart.some(item => item.status === 'in_cart') : false;
  const canCheckout = tableId ? hasTableCartItems : displayCart.length > 0;

  const getItemQuantity = (id: string) => {
    return displayCart
      .filter(i => i.menuItemId === id)
      .reduce((sum, i) => sum + i.quantity, 0);
  };

  const newItems = displayCart.filter(i => i.status === 'in_cart');
  const orderedItems = displayCart.filter(i => i.status !== 'in_cart');

  const cartDrawerTransition = isMobile
    ? { type: 'tween' as const, ease: [0.22, 1, 0.36, 1], duration: 0.24 }
    : { type: 'spring' as const, damping: 30, stiffness: 300 };

  return (
    <div className="bg-[#fcf9f4] min-h-screen text-[#1a1a1a]" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>

      <CustomerHeader
        tableId={tableId}
        totalItems={displayTotalItems}
        onCartClick={() => setIsCartOpen(true)}
      />

      <section className="relative h-[300px] md:h-[400px] bg-[#111] flex flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src="https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?q=80&w=2071&auto=format&fit=crop" className="w-full h-full object-cover opacity-50" alt="Background" />
          <div className="absolute inset-0 via-transparent to-black/70" />
        </div>
        <div className="relative z-20 text-center px-4">
          <h2 className="text-5xl md:text-7xl font-black text-white mb-4 tracking-tight uppercase italic" style={{ fontFamily: "'Playfair Display', serif" }}>Sản Phẩm</h2>
          <div className="flex items-center justify-center gap-3 text-sm md:text-base font-bold uppercase tracking-[0.2em]">
            <span className="text-gray-200 hover:text-red-600 transition-colors cursor-pointer" onClick={() => navigate('/')}>Trang chủ</span>
            <span className="text-red-600 text-xl font-black">»</span>
            <span className="text-red-600">Thực đơn {tableId ? `(Bàn ${tableId})` : '(Giao hàng)'}</span>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-16 flex flex-col lg:grid lg:grid-cols-12 gap-8 lg:gap-10">
        <aside className="w-full lg:col-span-3 space-y-8 lg:space-y-10">
          <div>
            <h3 className="text-xl font-bold border-b-2 border-red-600 pb-2 mb-6 uppercase italic" style={{ fontFamily: "serif" }}>Danh mục món</h3>
            <ul className="space-y-4">
              {menu.length > 0 && categories.map(cat => (
                <li
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn("flex justify-between items-center cursor-pointer font-bold transition-colors group", selectedCategory === cat ? "text-red-600" : "text-gray-600 hover:text-red-600")}
                >
                  <span className="flex items-center gap-2">
                    <ChevronRight className={cn("w-4 h-4 opacity-0 group-hover:opacity-100", selectedCategory === cat && "opacity-100")} />
                    {cat}
                  </span>
                  <span className="text-xs text-gray-400">({visibleMenu.filter(i => cat === 'Tất cả' || getMenuItemCategoryName(i) === cat).length})</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <div className="w-full lg:col-span-9">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 sm:mb-10 text-xs sm:text-sm font-bold text-gray-500 uppercase tracking-widest">
            <p>Hiển thị 1–{filteredMenu.length} trong tổng số {visibleMenu.length} món</p>
          </div>

          {menu.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-6 lg:gap-8">
              {filteredMenu.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  className="bg-white group rounded-4xl overflow-hidden border border-gray-100 hover:shadow-2xl transition-all duration-500 text-center flex flex-col items-center p-3 sm:p-6 relative"
                >
                  <div className="absolute top-2 right-2 sm:top-4 sm:right-4 flex flex-col gap-2 translate-x-10 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300">
                    <button className="p-1.5 sm:p-2 bg-white shadow-md rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50"><Heart className="w-3 h-3 sm:w-4 sm:h-4" /></button>
                    <button className="p-1.5 sm:p-2 bg-white shadow-md rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleAddToCart(item)}><ShoppingBag className="w-3 h-3 sm:w-4 sm:h-4" /></button>
                  </div>

                  <div className="w-full aspect-4/3 rounded-2xl sm:rounded-3xl overflow-hidden mb-3 sm:mb-6 group-hover:shadow-lg transition-all duration-500 cursor-pointer relative" onClick={() => navigate(tableId ? `/table/${tableId}/menu/${item.id}` : `/menu/${item.id}`)}>
                    <img src={getItemImageUrl(item)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={item.name} />
                  </div>

                  <h3 className="text-base sm:text-xl font-bold text-gray-900 group-hover:text-red-600 transition-colors mb-1 sm:mb-2 italic cursor-pointer line-clamp-1" style={{ fontFamily: "'Playfair Display', serif" }} onClick={() => navigate(tableId ? `/table/${tableId}/menu/${item.id}` : `/menu/${item.id}`)}>
                    {item.name}
                  </h3>
                  <div className="text-sm sm:text-lg font-bold text-red-600 mb-3 sm:mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
                    {item.price.toLocaleString()}đ
                  </div>

                  <button onClick={(e) => { e.stopPropagation(); handleAddToCart(item); }} className="w-full mt-auto bg-red-600 text-white py-2 sm:py-2.5 rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-widest transition-all hover:shadow-lg flex items-center justify-center gap-2 border border-gray-200 hover:border-red-600 group/btn">
                    <ShoppingBag className="w-3 h-3 sm:w-4 sm:h-4 group-hover/btn:scale-110 transition-transform" />
                    Đặt món
                  </button>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-[2rem] border border-dashed border-gray-200 p-10 sm:p-16 text-center">
              <h3 className="text-2xl font-black italic mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>Chưa có món ăn được xuất bản</h3>
            </div>
          )}
        </div>
      </main>

      {/* CART OVERLAY */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setIsCartOpen(false)}
              className={cn(
                "fixed inset-0 z-[200]",
                isMobile ? "bg-black/45" : "bg-black/60 backdrop-blur-sm"
              )}
            />
            <motion.div
              initial={isMobile ? { y: "100%", opacity: 0.98 } : { x: "100%" }}
              animate={isMobile ? { y: 0, opacity: 1 } : { x: 0, opacity: 1 }}
              exit={isMobile ? { y: "100%", opacity: 0.98 } : { x: "100%" }}
              transition={cartDrawerTransition}
              style={{ willChange: 'transform' }}
              className={cn(
                "fixed right-0 bottom-0 w-full sm:max-w-md bg-white z-[201] flex flex-col",
                isMobile ? "top-auto h-[92dvh] rounded-t-[2rem] shadow-[0_-16px_40px_rgba(0,0,0,0.22)]" : "top-0 shadow-2xl"
              )}
            >
              <div className="p-6 sm:p-8 bg-[#111] text-white flex justify-between items-center shrink-0">
                <h2 className="text-2xl font-bold italic uppercase" style={{ fontFamily: "'Playfair Display', serif" }}>Giỏ hàng của bạn</h2>
                <X className="w-6 h-6 cursor-pointer" onClick={() => setIsCartOpen(false)} />
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-8 overscroll-contain">
                {displayCart.length === 0 ? (
                  <div className="text-center py-20 text-gray-400 font-bold uppercase italic border-2 border-dashed border-gray-100 rounded-3xl">Giỏ hàng trống</div>
                ) : (
                  <div className="space-y-10">
                    {newItems.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="h-0.5 flex-1 bg-red-100" />
                          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-red-600">Món mới chọn</h3>
                          <div className="h-0.5 flex-1 bg-red-100" />
                        </div>
                        {newItems.map((item, idx) => (
                          <div key={item.menuItemId + idx} className="flex gap-4 border-b border-gray-100 pb-6 group">
                            <img src={item.image ?? ''} className="w-20 h-20 rounded-2xl object-cover" alt="" />
                            <div className="flex-1">
                              <h4 className="font-bold italic text-lg" style={{ fontFamily: "'Playfair Display', serif" }}>{item.name}</h4>
                              <p className="text-red-600 font-bold">{(item.totalPrice / item.quantity).toLocaleString()}đ</p>
                              <div className="flex items-center gap-4 mt-2">
                                <div className="flex items-center border border-gray-200 rounded-lg bg-white overflow-hidden">
                                  {tableId ? (
                                    <>
                                      <button className="px-3 py-1 hover:bg-red-50 hover:text-red-600 font-bold" onClick={() => handleUpdateTableCartItemQuantity(item._id || item.menuItemId, -1)}><Minus className="w-3 h-3" /></button>
                                      <span className="px-4 font-bold">{item.quantity}</span>
                                      <button className="px-3 py-1 hover:bg-red-50 hover:text-red-600 font-bold" onClick={() => handleUpdateTableCartItemQuantity(item._id || item.menuItemId, 1)}><Plus className="w-3 h-3" /></button>
                                    </>
                                  ) : (
                                    <>
                                      <button className="px-3 py-1 hover:bg-red-50 hover:text-red-600 font-bold" onClick={() => updateQuantity(item.menuItemId, -1)}>-</button>
                                      <span className="px-4 font-bold">{item.quantity}</span>
                                      <button className="px-3 py-1 hover:bg-red-50 hover:text-red-600 font-bold" onClick={() => updateQuantity(item.menuItemId, 1)}>+</button>
                                    </>
                                  )}
                                </div>
                                <Trash2 className="w-4 h-4 text-gray-300 cursor-pointer hover:text-red-600" onClick={() => tableId ? handleRemoveTableCartItem(item._id || item.menuItemId) : removeFromCart(item.menuItemId)} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {orderedItems.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="h-0.5 flex-1 bg-gray-100" />
                          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Món đang phục vụ (Đã gửi bếp)</h3>
                          <div className="h-0.5 flex-1 bg-gray-100" />
                        </div>
                        {orderedItems.map((item, idx) => (
                          <div key={item.menuItemId + idx} className="flex gap-4 border-b border-gray-100 pb-6 opacity-80 grayscale-[0.3]">
                            <img src={item.image ?? ''} className="w-16 h-16 rounded-2xl object-cover" alt="" />
                            <div className="flex-1">
                              <h4 className="font-bold italic text-base" style={{ fontFamily: "'Playfair Display', serif" }}>{item.name}</h4>
                              <div className="flex justify-between items-center mt-1">
                                <p className="text-gray-500 font-medium text-xs">SL: <span className="font-bold text-[#111]">{item.quantity}</span></p>
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[8px] font-black uppercase tracking-widest">{item.status}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className={cn(
                "space-y-4 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] border-t border-gray-100",
                isMobile ? "p-5 bg-white/95 backdrop-blur-md" : "p-8 bg-gray-50"
              )}>
                <div className="flex justify-between items-center px-1">
                  <span className="text-gray-400 font-bold uppercase text-[10px] tracking-widest italic">Tổng cộng</span>
                  <span className="text-2xl font-black text-red-600 italic" style={{ fontFamily: "'Playfair Display', serif" }}>
                    {displayTotalPrice.toLocaleString()}đ
                  </span>
                </div>

                {orderedItems.length > 0 && (
                  <button
                    onClick={() => { setIsCartOpen(false); navigate(`/table/${tableId}/tracking`); }}
                    className="w-full py-3 bg-blue-50 text-blue-600 rounded-2xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-100 transition-colors border border-blue-100 animate-pulse"
                  >
                    🔍 Theo dõi trạng thái món đã đặt
                  </button>
                )}

                <div className={cn("gap-3 pt-1", isMobile ? "grid grid-cols-1" : "grid grid-cols-2")}>
                  <button
                    disabled={!canCheckout}
                    onClick={async () => {
                      if (tableId) {
                        try {
                          if (!hasTableCartItems || !activeSession) return;
                          await axios.post(`/api/orders/${activeSession.id || activeSession._id}/checkout`);
                          setIsCartOpen(false);
                          navigate(`/table/${tableId}/tracking`);
                        } catch (error) {
                          alert("Không thể gửi món xuống bếp. Vui lòng thử lại!");
                        }
                      } else {
                        setIsCartOpen(false);
                        navigate('/checkout');
                      }
                    }}
                    className={cn(
                      "w-full py-4 rounded-2xl font-black italic uppercase transition-all shadow-xl text-xs flex items-center justify-center gap-2",
                      canCheckout ? "bg-[#111] text-white hover:bg-red-600 active:scale-95" : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    )}
                  >
                    {tableId ? (hasTableCartItems ? 'Xác nhận đặt' : 'Đã gửi bếp') : 'Thanh toán'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {displayTotalItems > 0 && (
          <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} onClick={() => setIsCartOpen(true)} className="fixed bottom-8 right-8 z-[150] w-16 h-16 bg-red-600 text-white rounded-full shadow-2xl border-4 border-white flex items-center justify-center group">
            <ShoppingBag className="w-7 h-7 group-hover:rotate-12 transition-transform" />
            <div className="absolute -top-1 -right-1 bg-[#111] text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-white">{displayTotalItems}</div>
            <div className="absolute inset-0 rounded-full bg-red-600 animate-ping opacity-20 -z-10" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toastItem && (
          <motion.div initial={{ opacity: 0, y: 50, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: 50, x: '-50%' }} className="fixed bottom-10 left-1/2 bg-gray-900 text-white p-2 pr-6 rounded-full shadow-2xl z-300 flex items-center gap-3 border border-gray-800">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-green-500 bg-white">
              <img src={toastItem.image} alt={toastItem.name} className="w-full h-full object-cover" />
            </div>
            <span className="text-sm font-medium">Đã thêm <strong className="text-green-400">{toastItem.name}</strong> vào giỏ</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
