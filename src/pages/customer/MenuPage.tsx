import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Minus, X, Trash2, Search, Heart,
  ShoppingBag, ChevronRight, Facebook, Twitter, Instagram, MapPin, Mail, Phone
} from 'lucide-react';
import axios from 'axios';
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
  const [activeWeeklyMenu, setActiveWeeklyMenu] = useState<any | null>(null);
  const { cart, addToCart, removeFromCart, updateQuantity, totalPrice, totalItems, clearCart } = useCart();
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [isCartOpen, setIsCartOpen] = useState(false);
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
    axios.get('/api/menu').then(res => setMenu(extractList<MenuItem>(res.data)));
    axios.get('/api/weekly-menu/active')
      .then(res => setActiveWeeklyMenu(res.data || null))
      .catch(() => setActiveWeeklyMenu(null));
    fetchActiveSession();

    socket.on('order-updated', (updatedOrder: Order) => {
      // Dùng hàm slugify giống tracking để chắc chắn match
      const slugify = (str?: string) => str ? String(str).toLowerCase().trim().replace(/[\s\W-]+/g, '-') : '';
      if (tableId && (updatedOrder.tableId === tableId || updatedOrder.tableId === slugify(tableId))) {
        setActiveSession(updatedOrder.status === 'active' ? updatedOrder : null);
      }
    });

    socket.on('new-order', (newOrder: Order) => {
      const slugify = (str?: string) => str ? String(str).toLowerCase().trim().replace(/[\s\W-]+/g, '-') : '';
      if (tableId && (newOrder.tableId === tableId || newOrder.tableId === slugify(tableId))) {
        setActiveSession(newOrder);
      }
    });

    return () => {
      socket.off('order-updated');
      socket.off('new-order');
    };
  }, [status, tableId]);

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center bg-[#fcf9f4]"><div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (status === 'invalid') {
    return <InvalidTable tableId={tableId} />;
  }

  const activeWeeklyMenuItems = extractList<MenuItem>(activeWeeklyMenu?.menuItems || []);
  const activeWeeklyMenuIds = new Set(activeWeeklyMenuItems.map(item => getMenuItemId(item)));
  const visibleMenu = activeWeeklyMenuItems.length > 0
    ? menu.filter(item => activeWeeklyMenuIds.has(getMenuItemId(item)))
    : [];

  const categories = ['Tất cả', ...new Set(visibleMenu.map(item => getMenuItemCategoryName(item)))];
  const filteredMenu = selectedCategory === 'Tất cả'
    ? visibleMenu
    : visibleMenu.filter(item => getMenuItemCategoryName(item) === selectedCategory);

  // Helper: lấy URL ảnh từ mảng images (GridFS)
  const getItemImageUrl = (item: MenuItem): string => getMenuItemImageUrl(item);

  const handleAddToCart = async (item: MenuItem) => {
    if (tableId) {
      // Shared Cart cho Dine-in
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
          fetchActiveSession(); // gọi lại để lấy data mới nhất or socket tự cập nhật
        }
        setToastItem({ name: item.name, image: getItemImageUrl(item) });
        setTimeout(() => setToastItem(null), 3000);
      } catch (err) {
        console.error("Failed to add to shared cart", err);
        const apiMessage =
          axios.isAxiosError(err)
            ? err.response?.data?.error?.message || err.response?.data?.message
            : null;
        alert(apiMessage || "Lỗi khi thêm món vào giỏ bàn. Vui lòng thử lại!");
      }
    } else {
      // Local Cart cho Delivery
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

  return (
    <div className="bg-[#fcf9f4] min-h-screen text-[#1a1a1a]" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>

      <CustomerHeader
        tableId={tableId}
        totalItems={displayTotalItems}
        onCartClick={() => setIsCartOpen(true)}
      />
      {/* PHẦN ĐẦU TRANG (HERO) - ĐÃ FIX LINK ẢNH */}
      <section className="relative h-[300px] md:h-[400px] bg-[#111] flex flex-col items-center justify-center overflow-hidden">

        {/* 1. Ảnh nền chính (Mờ và tối) */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?q=80&w=2071&auto=format&fit=crop"
            className="w-full h-full object-cover opacity-50"
            alt="Background"
          />
          {/* Lớp phủ mờ dần (Gradient) */}
          <div className="absolute inset-0  via-transparent to-black/70" />
        </div>

        {/* 2. Các ảnh trang trí bay (Có xử lý lỗi onError) */}
        {/* Lá bay */}
        <motion.img
          animate={{ y: [0, -20, 0], rotate: [0, 15, 0] }}
          transition={{ duration: 5, repeat: Infinity }}
          onError={(e) => (e.currentTarget.style.display = 'none')}
          src="https://images.unsplash.com/photo-1543325061-f06059c15431?q=80&w=200&auto=format&fit=crop"
          className="absolute left-[5%] top-10 w-16 md:w-24 opacity-80 z-10 hidden sm:block rounded-full object-cover aspect-square"
          alt="leaf"
        />

        {/* Cà chua bay */}
        <motion.img
          animate={{ y: [0, 25, 0], rotate: [0, -10, 0] }}
          transition={{ duration: 6, repeat: Infinity }}
          onError={(e) => (e.currentTarget.style.display = 'none')}
          src="https://images.unsplash.com/photo-1592924357228-91a4daadcfea?q=80&w=200&auto=format&fit=crop"
          className="absolute right-[8%] bottom-10 w-20 md:w-32 opacity-80 z-10 hidden sm:block rounded-full object-cover aspect-square"
          alt="tomato"
        />

        {/* Ớt/Gia vị bay */}
        <motion.img
          animate={{ x: [0, 15, 0], y: [0, 10, 0] }}
          transition={{ duration: 4, repeat: Infinity }}
          onError={(e) => (e.currentTarget.style.display = 'none')}
          src="https://images.unsplash.com/photo-1563502310703-1ffe473ad66d?q=80&w=200&auto=format&fit=crop"
          className="absolute left-[15%] bottom-5 w-12 md:w-20 opacity-60 z-10 hidden sm:block rounded-full object-cover aspect-square"
          alt="pepper"
        />

        {/* 3. Chữ trung tâm - Căn chỉnh lại font cho chuẩn ảnh mẫu */}
        <div className="relative z-20 text-center px-4">
          <h2
            className="text-5xl md:text-7xl font-black text-white mb-4 tracking-tight uppercase italic drop-shadow-[0_5px_15px_rgba(0,0,0,0.5)]"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Sản Phẩm
          </h2>
          <div className="flex items-center justify-center gap-3 text-sm md:text-base font-bold uppercase tracking-[0.2em]">
            <span className="text-gray-200 hover:text-red-600 transition-colors cursor-pointer" onClick={() => navigate('/')}>Trang chủ</span>
            <span className="text-red-600 text-xl font-black">»</span>
            <span className="text-red-600">Thực đơn {tableId ? `(Bàn ${tableId})` : '(Giao hàng)'}</span>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12">
        <div className="rounded-[2rem] border border-red-100 bg-white/80 backdrop-blur-xl shadow-xl p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6 justify-between">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-red-600 text-white flex items-center justify-center shrink-0">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-600 mb-1">Thực đơn đang bán</p>
              <h3 className="text-xl sm:text-2xl font-black italic" style={{ fontFamily: "'Playfair Display', serif" }}>
                {activeWeeklyMenu?.title || 'Chưa có thực đơn tuần active'}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {activeWeeklyMenu
                  ? `Đang mở bán từ ${new Date(activeWeeklyMenu.startDate).toLocaleDateString('vi-VN')} đến ${new Date(activeWeeklyMenu.endDate).toLocaleDateString('vi-VN')}`
                  : 'Quán chưa cấu hình thực đơn tuần, món sẽ không hiển thị để tránh đặt sai.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-3 rounded-2xl bg-gray-50 border border-gray-100 text-center">
              <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Món hiển thị</div>
              <div className="text-2xl font-black text-red-600 mt-1">{filteredMenu.length}</div>
            </div>
            <div className="px-4 py-3 rounded-2xl bg-gray-50 border border-gray-100 text-center">
              <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Tổng menu</div>
              <div className="text-2xl font-black text-gray-900 mt-1">{visibleMenu.length}</div>
            </div>
          </div>
        </div>
      </section>

      {/* COMBO SECTION */}
      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-16 flex flex-col lg:grid lg:grid-cols-12 gap-8 lg:gap-10">

        {/* SIDEBAR */}
        <aside className="w-full lg:col-span-3 space-y-8 lg:space-y-10">
          <div>
            <h3 className="text-xl font-bold border-b-2 border-red-600 pb-2 mb-6 uppercase italic" style={{ fontFamily: "serif" }}>
              Danh mục món
            </h3>
            <ul className="space-y-4">
              {activeWeeklyMenu && categories.map(cat => (
                <li
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "flex justify-between items-center cursor-pointer font-bold transition-colors group",
                    selectedCategory === cat ? "text-red-600" : "text-gray-600 hover:text-red-600"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <ChevronRight className={cn("w-4 h-4 opacity-0 group-hover:opacity-100", selectedCategory === cat && "opacity-100")} />
                    {cat}
                  </span>
                  <span className="text-xs text-gray-400">({visibleMenu.filter(i => cat === 'Tất cả' || getMenuItemCategoryName(i) === cat).length})</span>
                </li>
              ))}
              {!activeWeeklyMenu && (
                <li className="text-sm text-gray-400 italic py-3">Chưa có thực đơn tuần active</li>
              )}
            </ul>
          </div>

          <div className="relative rounded-3xl overflow-hidden group cursor-pointer shadow-xl">
            <img src="https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400" className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-700" alt="" />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <h4 className="text-white text-2xl font-bold italic uppercase text-center px-4" style={{ fontFamily: "'Playfair Display', serif" }}>
                Bộ sưu tập món ngon
              </h4>
            </div>
          </div>
        </aside>

        {/* PRODUCT GRID */}
        <div className="w-full lg:col-span-9">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 sm:mb-10 text-xs sm:text-sm font-bold text-gray-500 uppercase tracking-widest">
            <p>Hiển thị 1–{filteredMenu.length} trong tổng số {visibleMenu.length} món</p>
            <select className="bg-transparent border-none focus:ring-0 cursor-pointer font-bold w-full sm:w-auto p-0 pb-2 sm:pb-0 border-b sm:border-none border-gray-200">
              <option>Sắp xếp mặc định</option>
              <option>Giá: Thấp đến Cao</option>
              <option>Giá: Cao đến Thấp</option>
            </select>
          </div>

          {activeWeeklyMenu ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-6 lg:gap-8">
              {filteredMenu.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                className="bg-white group rounded-4xl overflow-hidden border border-gray-100 hover:shadow-2xl transition-all duration-500 text-center flex flex-col items-center p-3 sm:p-6 relative"
              >
                <div className="absolute top-2 left-2 sm:top-4 sm:left-4 bg-red-600 text-white text-[8px] sm:text-[10px] font-black w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-col leading-none z-10">
                  <span>GIẢM</span>
                  <span>10%</span>
                </div>

                <div className="absolute top-2 right-2 sm:top-4 sm:right-4 flex flex-col gap-2 translate-x-10 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300">
                  <button className="p-1.5 sm:p-2 bg-white shadow-md rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50"><Heart className="w-3 h-3 sm:w-4 sm:h-4" /></button>
                  <button className="p-1.5 sm:p-2 bg-white shadow-md rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleAddToCart(item)}><ShoppingBag className="w-3 h-3 sm:w-4 sm:h-4" /></button>
                </div>

                <div
                  className="w-full aspect-4/3 rounded-2xl sm:rounded-3xl overflow-hidden mb-3 sm:mb-6 group-hover:shadow-lg transition-all duration-500 cursor-pointer"
                  onClick={() => navigate(tableId ? `/table/${tableId}/menu/${item.id}` : `/menu/${item.id}`)}
                >
                  <img src={getItemImageUrl(item)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={item.name} />
                </div>

                <h3
                  className="text-base sm:text-xl font-bold text-gray-900 group-hover:text-red-600 transition-colors mb-1 sm:mb-2 italic cursor-pointer line-clamp-1"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                  onClick={() => navigate(tableId ? `/table/${tableId}/menu/${item.id}` : `/menu/${item.id}`)}
                >
                  {item.name}
                </h3>
                <p className="text-[10px] sm:text-xs text-gray-400 font-medium mb-2 sm:mb-4 line-clamp-1 sm:line-clamp-2 px-1 uppercase tracking-tighter italic">
                  Hương vị Ý đặc trưng
                </p>
                <div className="text-sm sm:text-lg font-bold text-red-600 mb-3 sm:mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {item.price.toLocaleString()}đ
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddToCart(item);
                  }}
                  className="w-full mt-auto bg-red-600 text-white py-2 sm:py-2.5 rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-widest transition-all hover:shadow-lg flex items-center justify-center gap-2 border border-gray-200 hover:border-red-600 group/btn"
                >
                  <ShoppingBag className="w-3 h-3 sm:w-4 sm:h-4 group-hover/btn:scale-110 transition-transform" />
                  Đặt món
                </button>
              </motion.div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-[2rem] border border-dashed border-gray-200 p-10 sm:p-16 text-center">
              <div className="w-16 h-16 mx-auto rounded-[1.5rem] bg-red-50 text-red-600 flex items-center justify-center mb-4">
                <ShoppingBag className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-black italic mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                Chưa có thực đơn tuần active
              </h3>
              <p className="text-gray-500 max-w-xl mx-auto">
                Hệ thống đang chưa mở bán theo lịch tuần, nên menu tạm thời bị ẩn để tránh đặt món sai.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* FOOTER */}
      {/* <footer className="bg-[#111] text-white pt-16 sm:pt-20 pb-8 sm:pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12 mb-16 sm:mb-20">
          <div className="space-y-6">
            <h1 className="text-3xl font-black italic tracking-tighter text-red-600" style={{ fontFamily: "'Playfair Display', serif" }}>PIZZAN</h1>
            <p className="text-gray-400 text-sm leading-relaxed">
              Nhà hàng mang đến không gian ấm cúng, dịch vụ thân thiện và thực đơn hấp dẫn với nguyên liệu tươi ngon mỗi ngày.
            </p>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center hover:bg-red-600 transition-colors cursor-pointer"><Facebook className="w-4 h-4" /></div>
              <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center hover:bg-red-600 transition-colors cursor-pointer"><Twitter className="w-4 h-4" /></div>
              <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center hover:bg-red-600 transition-colors cursor-pointer"><Instagram className="w-4 h-4" /></div>
            </div>
          </div>
          <div>
            <h4 className="text-lg font-bold italic mb-6 uppercase border-b border-gray-800 pb-2" style={{ fontFamily: "'Playfair Display', serif" }}>Món ngon nhất</h4>
            <ul className="text-gray-400 text-sm space-y-4 font-bold">
              <li className="hover:text-red-600 cursor-pointer">» Pizza Gà Phô Mai</li>
              <li className="hover:text-red-600 cursor-pointer">» Burger Bò Đặc Biệt</li>
              <li className="hover:text-red-600 cursor-pointer">» Salad Rau Củ Tươi</li>
            </ul>
          </div>
          <div>
            <h4 className="text-lg font-bold italic mb-6 uppercase border-b border-gray-800 pb-2" style={{ fontFamily: "'Playfair Display', serif" }}>Liên hệ</h4>
            <ul className="text-gray-400 text-sm space-y-4 font-bold">
              <li className="flex items-start gap-3"><MapPin className="w-5 h-5 text-red-600" /> Đường số 10, TP. Hồ Chí Minh</li>
              <li className="flex items-start gap-3"><Mail className="w-5 h-5 text-red-600" /> lienhe@pizzan.vn</li>
              <li className="flex items-start gap-3"><Phone className="w-5 h-5 text-red-600" /> 1900 1234 56</li>
            </ul>
          </div>
          <div>
            <h4 className="text-lg font-bold italic mb-6 uppercase border-b border-gray-800 pb-2" style={{ fontFamily: "'Playfair Display', serif" }}>Nhận thông tin</h4>
            <div className="relative">
              <input type="text" placeholder="Địa chỉ Email" className="w-full bg-gray-900 border-none rounded p-4 text-sm focus:ring-1 focus:ring-red-600" />
              <button className="bg-red-600 w-full mt-4 py-3 rounded font-bold text-sm uppercase italic">Đăng ký ngay</button>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-800 pt-8 text-center text-xs text-gray-500 font-bold uppercase tracking-widest">
          Bản quyền © 2023 Thuộc về Nhà hàng Pizzan
        </div>
      </footer> */}

      {/* GIỎ HÀNG */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCartOpen(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]" />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} className="fixed top-0 right-0 bottom-0 w-full sm:max-w-md bg-white z-[201] flex flex-col shadow-2xl">
              <div className="p-6 sm:p-8 bg-[#111] text-white flex justify-between items-center">
                <h2 className="text-2xl font-bold italic uppercase" style={{ fontFamily: "'Playfair Display', serif" }}>Giỏ hàng của bạn</h2>
                <X className="w-6 h-6 cursor-pointer" onClick={() => setIsCartOpen(false)} />
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {displayCart.length === 0 ? (
                  <div className="text-center py-20 text-gray-400 font-bold uppercase italic">Giỏ hàng trống</div>
                ) : (
                  displayCart.map((item, idx) => (
                    <div key={item.menuItemId + idx} className="flex gap-4 border-b border-gray-100 pb-6">
                      <img src={item.image ?? ''} className="w-20 h-20 rounded-2xl object-cover" alt="" />
                      <div className="flex-1">
                        <h4 className="font-bold italic text-lg" style={{ fontFamily: "'Playfair Display', serif" }}>{item.name}</h4>
                        <p className="text-red-600 font-bold">
                          {(item.totalPrice / item.quantity).toLocaleString()}đ
                          {item.quantity > 1 && <span className="text-gray-400 text-xs ml-1 font-medium">x {item.quantity}</span>}
                        </p>
                        
                        {/* Display Options & Addons */}
                        {(item.selectedOption || (item.selectedAddons && item.selectedAddons.length > 0)) && (
                          <div className="mt-1 space-y-0.5">
                            {item.selectedOption && (
                              <p className="text-[10px] text-gray-500 italic">
                                • {item.selectedOption.name}
                              </p>
                            )}
                            {item.selectedAddons?.map((addon, i) => (
                              <p key={i} className="text-[10px] text-gray-500 italic">
                                • {addon.name}
                              </p>
                            ))}
                          </div>
                        )}

                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">
                          {item.status === 'in_cart'
                            ? 'Trong giỏ'
                            : item.status === 'pending_approval'
                              ? 'Chờ duyệt'
                              : item.status === 'cooking'
                                ? 'Đang nấu'
                                : item.status === 'served'
                                  ? 'Đã phục vụ'
                                  : 'Đã huỷ'}
                        </p>
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex items-center border border-gray-200 rounded-lg">
                            {!tableId && <button className="px-3 py-1 hover:bg-gray-100 font-bold" onClick={() => updateQuantity(item.menuItemId, -1)}>-</button>}
                            {tableId && activeSession && ['in_cart', 'pending_approval'].includes(item.status) && (
                              <button
                                className="px-3 py-1 hover:bg-gray-100 font-bold"
                                onClick={() => handleUpdateTableCartItemQuantity(item._id || item.menuItemId, -1)}
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                            )}
                            <span className="px-4 font-bold">{item.quantity}</span>
                            {!tableId && <button className="px-3 py-1 hover:bg-gray-100 font-bold" onClick={() => updateQuantity(item.menuItemId, 1)}>+</button>}
                            {tableId && activeSession && ['in_cart', 'pending_approval'].includes(item.status) && (
                              <button
                                className="px-3 py-1 hover:bg-gray-100 font-bold"
                                onClick={() => handleUpdateTableCartItemQuantity(item._id || item.menuItemId, 1)}
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          {!tableId && (
                            <Trash2
                              className="w-4 h-4 text-gray-300 cursor-pointer hover:text-red-600"
                              onClick={() => removeFromCart(item.menuItemId)}
                            />
                          )}
                          {tableId && activeSession && ['in_cart', 'pending_approval'].includes(item.status) && (
                            <Trash2
                              className="w-4 h-4 text-gray-300 cursor-pointer hover:text-red-600"
                              onClick={() => handleRemoveTableCartItem(item._id || item.menuItemId)}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="p-8 bg-gray-50 space-y-4">
                <div className="flex justify-between text-xl font-bold italic uppercase" style={{ fontFamily: "'Playfair Display', serif" }}>
                  <span>Tổng tiền:</span>
                  <span className="text-red-600">{displayTotalPrice.toLocaleString()}đ</span>
                </div>
                <button
                  disabled={!canCheckout}
                  onClick={async () => {
                    if (tableId) {
                      try {
                        if (!hasTableCartItems || !activeSession) {
                          alert('Giỏ bàn không còn món nào đang ở trạng thái chờ gửi.');
                          return;
                        }
                        if (activeSession) {
                          await axios.post(`/api/orders/${activeSession.id || activeSession._id}/checkout`);
                        }
                        setIsCartOpen(false);
                        navigate(`/table/${tableId}/tracking`);
                      } catch (error) {
                        console.error("Lỗi đặt món:", error);
                        alert("Không thể gửi món xuống bếp. Vui lòng thử lại!");
                      }
                    } else {
                      setIsCartOpen(false);
                      navigate('/checkout');
                    }
                  }}
                  className="w-full bg-[#111] hover:bg-red-600 disabled:bg-gray-400 text-white py-4 font-bold italic uppercase transition-all shadow-xl"
                >
                  {tableId ? (hasTableCartItems ? 'Xác nhận đặt món' : 'Đã gửi bếp') : 'Thanh toán hoá đơn'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toastItem && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            className="fixed bottom-10 left-1/2 bg-gray-900 text-white p-2 pr-6 rounded-full shadow-2xl z-300 font-medium text-sm flex items-center gap-3 border border-gray-800"
          >
            <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border-2 border-green-500 bg-white shadow-inner">
              <img src={toastItem.image} alt={toastItem.name} className="w-full h-full object-cover" />
            </div>
            <span>
              Đã thêm <strong className="text-green-400">{toastItem.name}</strong> vào giỏ hàng
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
