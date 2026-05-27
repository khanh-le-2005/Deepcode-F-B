import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Minus, X, Trash2, Search, Heart,
  ShoppingBag, ChevronRight, Facebook, Twitter, Instagram, MapPin, Mail, Phone
} from 'lucide-react';
import axiosLib from 'axios';
import { io } from 'socket.io-client';
import { MenuItem, OrderItem, Order } from '../../types';
import { cn } from '../../api/cn';
import { Button } from '../../components/Button';
import { CustomerHeader } from '../../components/CustomerHeader';
import { InvalidTable } from '../../components/InvalidTable';
import { useTableValidation } from '../../hooks/useTableValidation';
import { useCart } from '../../contexts/CartContext';
import { getMenuItemCategoryName, getMenuItemId, getMenuItemImageUrl } from '../../api/menuHelpers';

import { useSocket } from '../../contexts/SocketContext';
import { toast } from 'react-toastify';
import axiosClient from '@/src/api/axiosClient';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, EffectFade } from 'swiper/modules';

import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';

export const MenuPage = () => {
  const { socket } = useSocket();
  const { tableId } = useParams();
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [combos, setCombos] = useState<any[]>([]);
  const [selectedComboForDetail, setSelectedComboForDetail] = useState<any | null>(null);
  const [detailQuantity, setDetailQuantity] = useState(1);
  const [itemNote, setItemNote] = useState('');
  const { cart, addToCart, removeFromCart, updateQuantity, getUniqueCartKey, totalPrice, totalItems, clearCart } = useCart();
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [toastItem, setToastItem] = useState<{ name: string, image: string } | null>(null);
  const [selectedOptionsMap, setSelectedOptionsMap] = useState<Record<string, any>>({});
  const navigate = useNavigate();
  const { status, table } = useTableValidation(tableId);

  const [activeSession, setActiveSession] = useState<Order | null>(null);
  const [flyingItems, setFlyingItems] = useState<{ id: number, image: string, start: { x: number, y: number } }[]>([]);
  const cartRef = useRef<HTMLButtonElement>(null);

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
      const res = await axiosClient.get(`/api/orders/table/${tableId}/active-session`);
      // Nếu đơn đã thanh toán hoặc hoàn tất thì coi như không còn session đặt món active
      const isStillActive = res.data && res.data.status === 'active' && res.data.paymentStatus !== 'paid';
      setActiveSession(isStillActive ? res.data : null);
    } catch (error: any) {
      if (error.response?.status === 404) {
        setActiveSession(null);
      }
    }
  };

  useEffect(() => {
    if (selectedComboForDetail) {
      setDetailQuantity(1);
      setItemNote('');
    }
  }, [selectedComboForDetail]);

  useEffect(() => {
    if (status !== 'valid') return;
    Promise.all([
      axiosClient.get('/api/weekly-menu/active'),
      axiosClient.get('/api/combos')
    ])
      .then(([menuRes, combosRes]) => {
        if (menuRes.data) {
          const fetchedMenu = extractList<MenuItem>(menuRes.data.menuItems || menuRes.data);
          setMenu(fetchedMenu);

          // Tự động chọn size đầu tiên cho tất cả món
          const defaultOptions: Record<string, any> = {};
          fetchedMenu.forEach((item: MenuItem) => {
            if (item.options && item.options.length > 0) {
              defaultOptions[getMenuItemId(item)] = item.options[0];
            }
          });
          setSelectedOptionsMap(defaultOptions);
        } else {
          setMenu([]);
        }

        if (combosRes.data) {
          setCombos((combosRes.data || []).filter((c: any) => c.status !== 'unavailable'));
        }
      })
      .catch(err => {
        console.error("Failed to fetch data:", err);
        setMenu([]);
        setCombos([]);
      });
    fetchActiveSession();

    const handleOrderUpdate = (updatedOrder: Order) => {
      const slugify = (str?: string) => str ? String(str).toLowerCase().trim().replace(/[\s\W-]+/g, '-') : '';
      if (tableId && (updatedOrder.tableId === tableId || updatedOrder.tableId === slugify(tableId))) {
        const isStillActive = updatedOrder.status === 'active' && updatedOrder.paymentStatus !== 'paid';
        setActiveSession(isStillActive ? updatedOrder : null);
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

  const filteredCombos = React.useMemo(() => {
    if (selectedCategory !== 'Combo ưu đãi' && selectedCategory !== 'Tất cả') return [];
    return combos.filter(combo => combo.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [combos, selectedCategory, searchTerm]);

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center bg-[#fcf9f4]"><div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (status === 'invalid') {
    return <InvalidTable tableId={tableId} />;
  }

  const visibleMenu = menu;
  const categories = [
    'Tất cả',
    ...(combos.length > 0 ? ['Combo ưu đãi'] : []),
    ...new Set(visibleMenu.map(item => getMenuItemCategoryName(item)))
  ];
  const filteredMenu = visibleMenu.filter(item => {
    if (selectedCategory === 'Combo ưu đãi') return false;
    const matchesCategory = selectedCategory === 'Tất cả' || getMenuItemCategoryName(item) === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getItemImageUrl = (item: MenuItem): string => getMenuItemImageUrl(item);

  const triggerFlyAnimation = (e: React.MouseEvent, image: string) => {
    const startX = e.clientX;
    const startY = e.clientY;
    const id = Date.now();
    setFlyingItems(prev => [...prev, { id, image, start: { x: startX, y: startY } }]);
    setTimeout(() => {
      setFlyingItems(prev => prev.filter(item => item.id !== id));
    }, 800);
  };

  const handleQuickAdd = async (e: React.MouseEvent, item: MenuItem) => {
    e.stopPropagation();

    const itemId = getMenuItemId(item);
    const selectedOption = selectedOptionsMap[itemId];

    if (item.options && item.options.length > 0 && !selectedOption) {
      toast.warning("Vui lòng chọn Size cho món ăn!");
      return;
    }

    triggerFlyAnimation(e, getItemImageUrl(item));

    if (tableId) {
      try {
        const response = await axiosClient.post('/api/orders', {
          tableId,
          frontendUrl: window.location.origin, // ĐÃ THÊM
          items: [{
            menuItemId: itemId,
            name: item.name,
            basePrice: item.price,
            quantity: 1,
            selectedOption,
            selectedAddons: [],
            image: getItemImageUrl(item),
            category: getMenuItemCategoryName(item),
          }]
        });
        if (response.data) {
          setActiveSession(response.data);
        } else {
          await fetchActiveSession();
        }
        setToastItem({ name: item.name, image: getItemImageUrl(item) });
        setTimeout(() => setToastItem(null), 3000);
      } catch (err) {
        console.error("Failed to add to shared cart", err);
        const apiMessage = axiosLib.isAxiosError(err) ? err.response?.data?.error?.message || err.response?.data?.message : null;
        alert(apiMessage || "Lỗi khi thêm món vào giỏ bàn. Vui lòng thử lại!");
      }
    } else {
      const unitPrice = Number(item.price) + Number(selectedOption?.priceExtra || 0);
      addToCart({
        menuItemId: itemId,
        name: item.name,
        basePrice: item.price,
        quantity: 1,
        selectedOption,
        selectedAddons: [],
        totalPrice: unitPrice,
        status: 'in_cart',
        image: getItemImageUrl(item),
        category: getMenuItemCategoryName(item),
      } as any);
      setToastItem({ name: item.name, image: getItemImageUrl(item) });
      setTimeout(() => setToastItem(null), 3000);
    }
  };

  const handleAddToCart = async (e: React.MouseEvent, item: MenuItem) => {
    e.stopPropagation();
    // Nếu món có options hoặc addons, bắt buộc qua trang detail để chọn
    if (item.options?.length > 0 || item.addons?.length > 0) {
      navigate(tableId ? `/table/${tableId}/menu/${item.id}` : `/menu/${item.id}`);
      return;
    }

    triggerFlyAnimation(e, getItemImageUrl(item));

    if (tableId) {
      try {
        const response = await axiosClient.post('/api/orders', {
          tableId,
          frontendUrl: window.location.origin, // ĐÃ THÊM
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

  const handleAddComboToCart = async (e: React.MouseEvent, combo: any, quantity: number = 1, note: string = '') => {
    e.stopPropagation();
    const comboImageUrl = combo.image
      ? `${axiosClient.defaults.baseURL}/api/images/${combo.image}`
      : (combo.menuItemIds?.[0]?.images?.length > 0 ? `${axiosClient.defaults.baseURL}/api/images/${combo.menuItemIds[0].images[0]}` : 'https://placehold.co/400');

    triggerFlyAnimation(e, comboImageUrl);

    if (tableId) {
      try {
        const response = await axiosClient.post('/api/orders', {
          tableId,
          frontendUrl: window.location.origin,
          items: [{
            menuItemId: combo._id || combo.id,
            name: combo.name,
            basePrice: combo.price,
            quantity: quantity,
            isCombo: true,
            image: comboImageUrl,
            category: 'Combo ưu đãi',
            note: note
          }]
        });
        if (response.data) {
          setActiveSession(response.data);
        } else {
          await fetchActiveSession();
        }
        setToastItem({ name: combo.name, image: comboImageUrl });
        setTimeout(() => setToastItem(null), 3000);
      } catch (err) {
        console.error("Failed to add combo to shared cart", err);
        const apiMessage = axiosLib.isAxiosError(err) ? err.response?.data?.error?.message || err.response?.data?.message : null;
        alert(apiMessage || "Lỗi khi thêm combo vào giỏ bàn. Vui lòng thử lại!");
      }
    } else {
      addToCart({
        menuItemId: combo._id || combo.id,
        name: combo.name,
        basePrice: combo.price,
        quantity: quantity,
        totalPrice: combo.price * quantity,
        status: 'in_cart',
        image: comboImageUrl,
        category: 'Combo ưu đãi',
        isCombo: true,
        note: note
      } as any);
      setToastItem({ name: combo.name, image: comboImageUrl });
      setTimeout(() => setToastItem(null), 3000);
    }
  };

  const toggleCardOption = (menuItemId: string, option: any) => {
    setSelectedOptionsMap(prev => ({
      ...prev,
      [menuItemId]: prev[menuItemId]?.name === option.name ? null : option
    }));
  };

  const handleRemoveTableCartItem = async (itemId: string) => {
    if (!tableId || !activeSession) return;
    try {
      await axiosClient.delete(`/api/orders/${activeSession.id || activeSession._id}/item/${itemId}`);
      await fetchActiveSession();
    } catch (err) {
      console.error("Failed to remove item from table cart:", err);
      alert("Không thể xoá món khỏi giỏ bàn. Vui lòng thử lại!");
    }
  };

  const handleUpdateTableCartItemQuantity = async (itemId: string, delta: number) => {
    if (!tableId || !activeSession) return;
    try {
      await axiosClient.patch(`/api/orders/${activeSession.id || activeSession._id}/item/${itemId}/quantity`, {
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
        tableName={table?.name}
        totalItems={displayTotalItems}
        onCartClick={() => setIsCartOpen(true)}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        categories={categories}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
      />

      {/* FLYING ITEMS ANIMATION CONTAINER */}
      <div className="fixed inset-0 pointer-events-none z-[999]">
        <AnimatePresence>
          {flyingItems.map(item => (
            <motion.div
              key={item.id}
              initial={{
                x: item.start.x - 25,
                y: item.start.y - 25,
                scale: 1,
                opacity: 1
              }}
              animate={{
                x: window.innerWidth - 80, // Target near floating cart button
                y: window.innerHeight - 80,
                scale: 0.2,
                opacity: 0.5
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 0.8,
                ease: [0.42, 0, 0.58, 1] // Ease-in-out
              }}
              className="fixed w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-lg bg-white"
            >
              <img src={item.image} className="w-full h-full object-cover" alt="" />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <section className="relative h-[300px] md:h-[400px] overflow-hidden">
        <Swiper
          modules={[Autoplay, Pagination, EffectFade]}
          slidesPerView={1}
          loop
          effect="fade"
          autoplay={{
            delay: 4000,
            disableOnInteraction: false,
          }}
          pagination={{ clickable: true }}
          className="h-full"
        >
          {[
            "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?q=80&w=2071&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=2070&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=2074&auto=format&fit=crop",
          ].map((image, index) => (
            <SwiperSlide key={index}>
              <div className="relative h-[300px] md:h-[400px]">
                {/* Background */}
                <div className="absolute inset-0">
                  <img
                    src={image}
                    className="w-full h-full object-cover"
                    alt="Banner"
                  />

                  {/* Overlay */}
                  {/* <div className="absolute inset-0 bg-black/55" /> */}

                  {/* Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30" />
                </div>

                {/* Content */}
                <div className="relative z-20 h-full flex flex-col items-center justify-center text-center px-4">
                  <h2 className="text-5xl md:text-7xl font-black text-white mb-4 tracking-tight uppercase drop-shadow-lg">
                    Sản Phẩm
                  </h2>

                  <div className="flex items-center justify-center gap-3 text-sm md:text-base font-bold uppercase tracking-[0.2em]">
                    <span className="text-red-600 text-xl font-black">»</span>

                    <span className="text-red-500">
                      Thực đơn {tableId ? `(Bàn ${tableId})` : '(Giao hàng)'}
                    </span>
                  </div>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-16">
        <div className="w-full">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 sm:mb-10 text-xs sm:text-sm font-bold text-gray-500 uppercase tracking-widest">
            <p>Hiển thị 1–{filteredMenu.length + filteredCombos.length} trong tổng số {visibleMenu.length + combos.length} món</p>
          </div>

          {menu.length > 0 || combos.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-6 lg:gap-8">
              {/* Render Combos */}
              {(selectedCategory === 'Tất cả' || selectedCategory === 'Combo ưu đãi') && filteredCombos.map((combo) => (
                <motion.div
                  key={`combo-${combo._id}`}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  className="bg-white group rounded-4xl overflow-hidden border border-gray-100 hover:shadow-2xl transition-all duration-500 text-center flex flex-col items-center p-3 sm:p-6 relative animate-in fade-in duration-300"
                >
                  <div className="absolute top-2 right-2 sm:top-4 sm:right-4 flex flex-col gap-2 translate-x-10 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300">
                    <button className="p-1.5 sm:p-2 bg-white shadow-md rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50" onClick={(e) => handleAddComboToCart(e, combo)}><ShoppingBag className="w-3 h-3 sm:w-4 sm:h-4" /></button>
                  </div>

                  <div className="w-full aspect-4/3 rounded-sm sm:rounded-3xl overflow-hidden mb-3 sm:mb-6 group-hover:shadow-lg transition-all duration-500 cursor-pointer relative" onClick={() => setSelectedComboForDetail(combo)}>
                    <img src={combo.image ? `${axiosClient.defaults.baseURL}/api/images/${combo.image}` : (combo.menuItemIds?.[0]?.images?.length > 0 ? `${axiosClient.defaults.baseURL}/api/images/${combo.menuItemIds[0].images[0]}` : 'https://placehold.co/400')} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={combo.name} />
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-gray-900 group-hover:text-red-600 transition-colors mb-0.5 sm:mb-1 cursor-pointer line-clamp-1" onClick={() => setSelectedComboForDetail(combo)}>
                    {combo.name}
                  </h3>

                  <p className="text-gray-500 text-[10px] sm:text-xs mb-3 sm:mb-4 line-clamp-2">
                    {combo.description || (combo.menuItemIds?.map((m: any) => m.name).join(' + ') || '')}
                  </p>

                  <div className="flex flex-col items-center gap-2 mb-3 sm:mb-4 mt-auto">
                    <div className="text-sm sm:text-base font-black text-red-650">
                      {combo.price.toLocaleString()}đ
                    </div>
                  </div>

                  <div className="w-full mt-auto space-y-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleAddComboToCart(e, combo); }}
                      className="w-full py-2 sm:py-2.5 rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-widest transition-all hover:shadow-lg flex items-center justify-center gap-2 bg-red-600 text-white border border-transparent group/btn"
                    >
                      <ShoppingBag className="w-3 h-3 sm:w-4 sm:h-4 group-hover/btn:scale-110 transition-transform" />
                      Đặt combo
                    </button>
                  </div>
                </motion.div>
              ))}

              {/* Render Món thường */}
              {selectedCategory !== 'Combo ưu đãi' && filteredMenu.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  className="bg-white group rounded-4xl overflow-hidden border border-gray-100 hover:shadow-2xl transition-all duration-500 text-center flex flex-col items-center p-3 sm:p-6 relative"
                >
                  <div className="absolute top-2 right-2 sm:top-4 sm:right-4 flex flex-col gap-2 translate-x-10 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300">
                    <button className="p-1.5 sm:p-2 bg-white shadow-md rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50"><Heart className="w-3 h-3 sm:w-4 sm:h-4" /></button>
                    <button className="p-1.5 sm:p-2 bg-white shadow-md rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50" onClick={(e) => handleAddToCart(e, item)}><ShoppingBag className="w-3 h-3 sm:w-4 sm:h-4" /></button>
                  </div>

                  <div className="w-full aspect-4/3 rounded-sm sm:rounded-3xl overflow-hidden mb-3 sm:mb-6 group-hover:shadow-lg transition-all duration-500 cursor-pointer relative" onClick={() => navigate(tableId ? `/table/${tableId}/menu/${item.id}` : `/menu/${item.id}`)}>
                    <img src={getItemImageUrl(item)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={item.name} />
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-gray-900 group-hover:text-red-600 transition-colors mb-0.5 sm:mb-1 cursor-pointer line-clamp-1" onClick={() => navigate(tableId ? `/table/${tableId}/menu/${item.id}` : `/menu/${item.id}`)}>
                    {item.name} {selectedOptionsMap[getMenuItemId(item)]?.name}
                  </h3>

                  <div className="flex flex-col items-center gap-2 mb-3 sm:mb-4">
                    <div className="text-sm sm:text-base font-black text-red-600">
                      {(item.price + Number(selectedOptionsMap[getMenuItemId(item)]?.priceExtra || 0)).toLocaleString()}đ
                    </div>

                    {/* Size Selection Pill Buttons */}
                    {item.options && item.options.length > 0 && (
                      <div className="flex flex-wrap justify-center gap-1.5 mt-1 w-full">
                        {item.options.map((opt: any) => {
                          const isSelected = selectedOptionsMap[getMenuItemId(item)]?.name === opt.name;
                          return (
                            <React.Fragment key={opt.name}>
                              {/* --- GIAO DIỆN MOBILE --- */}
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleCardOption(getMenuItemId(item), opt); }}
                                className={cn(
                                  "sm:hidden px-2.5 py-1.5 rounded-xl border-2 transition-all flex flex-col items-center justify-center min-w-[3.5rem]",
                                  isSelected
                                    ? "bg-red-50 border-red-500 text-red-600 shadow-sm"
                                    : "bg-white border-gray-100 text-gray-500 hover:border-red-200"
                                )}
                              >
                                <span className="text-[11px] font-black uppercase leading-none">{opt.name.replace(/size\s*/i, '')}</span>
                                {opt.priceExtra > 0 && <span className="text-[9px] font-bold mt-1 leading-none opacity-80">+{(opt.priceExtra / 1000)}k</span>}
                              </button>

                              {/* --- GIAO DIỆN MÁY TÍNH (Như cũ) --- */}
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleCardOption(getMenuItemId(item), opt); }}
                                className={cn(
                                  "hidden sm:flex px-2.5 py-1 rounded-full text-[12px] font-black uppercase tracking-tighter border transition-all whitespace-nowrap",
                                  isSelected
                                    ? "bg-red-600 text-white border-red-600 shadow-sm"
                                    : "bg-gray-50 text-gray-400 border-gray-100 hover:border-gray-300 hover:text-red-500"
                                )}
                              >
                                {opt.name} {opt.priceExtra > 0 && `(+${opt.priceExtra.toLocaleString()}đ)`}
                              </button>
                            </React.Fragment>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="w-full mt-auto space-y-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleQuickAdd(e, item); }}
                      className="w-full py-2 sm:py-2.5 rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-widest transition-all hover:shadow-lg flex items-center justify-center gap-2 bg-red-600 text-white border border-transparent group/btn"
                    >
                      <ShoppingBag className="w-3 h-3 sm:w-4 sm:h-4 group-hover/btn:scale-110 transition-transform" />
                      {(item.options?.length > 0 || item.addons?.length > 0) ? "Đặt nhanh" : "Đặt món"}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-[2rem] border border-dashed border-gray-200 p-10 sm:p-16 text-center">
              <h3 className="text-2xl font-black mb-2">Chưa có món ăn được xuất bản</h3>
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
              transition={{ type: "tween", ease: "circOut", duration: 0.35 }}
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

                              {(item.selectedOption || (item.selectedAddons && item.selectedAddons.length > 0)) && (
                                <div className="mt-1 space-y-0.5">
                                  {item.selectedOption && <p className="text-[15px] text-gray-500 italic">• {item.selectedOption.name}</p>}
                                  {item.selectedAddons?.map((addon: any, addonIdx: number) => (
                                    <p key={addonIdx} className="text-[15px] text-gray-500 italic">• {addon.name}</p>
                                  ))}
                                </div>
                              )}

                              <p className="text-red-600 font-bold mt-1 text-base">{(item.totalPrice / item.quantity).toLocaleString()}đ</p>
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
                                      <button className="px-3 py-1 hover:bg-red-50 hover:text-red-600 font-bold" onClick={() => updateQuantity(getUniqueCartKey(item), -1)}>-</button>
                                      <span className="px-4 font-bold">{item.quantity}</span>
                                      <button className="px-3 py-1 hover:bg-red-50 hover:text-red-600 font-bold" onClick={() => updateQuantity(getUniqueCartKey(item), 1)}>+</button>
                                    </>
                                  )}
                                </div>
                                <Trash2 className="w-4 h-4 text-gray-300 cursor-pointer hover:text-red-600" onClick={() => tableId ? handleRemoveTableCartItem(item._id || item.menuItemId) : removeFromCart(getUniqueCartKey(item))} />
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

                              {(item.selectedOption || (item.selectedAddons && item.selectedAddons.length > 0)) && (
                                <div className="mt-0.5 space-y-0.5 mb-1">
                                  {item.selectedOption && <p className="text-[9px] text-gray-400 italic">• {item.selectedOption.name}</p>}
                                  {item.selectedAddons?.map((addon: any, addonIdx: number) => (
                                    <p key={addonIdx} className="text-[9px] text-gray-400 italic">• {addon.name}</p>
                                  ))}
                                </div>
                              )}

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
                isMobile ? "p-5 bg-white" : "p-8 bg-gray-50"
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
                          await axiosClient.post(`/api/orders/${activeSession.id || activeSession._id}/checkout`);
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
          <motion.button
            ref={cartRef}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            whileTap={{ scale: 1.2 }}
            exit={{ scale: 0 }}
            onClick={() => setIsCartOpen(true)}
            className="fixed bottom-8 right-8 z-[150] w-16 h-16 bg-black text-white rounded-full shadow-2xl border-4 border-white flex items-center justify-center group"
          >
            <ShoppingBag className="w-7 h-7 group-hover:rotate-12 transition-transform" />
            <div className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-white">{displayTotalItems}</div>
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

      {/* MODAL CHI TIẾT COMBO */}
      <AnimatePresence>
        {selectedComboForDetail && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-end md:items-center justify-center p-0 md:p-6"
          >
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setSelectedComboForDetail(null)}></div>

            <motion.div
              initial={{ y: "100%", opacity: 0.5 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-2xl bg-white rounded-t-[2rem] md:rounded-[2rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh] md:max-h-[85vh] z-10 mt-20"
            >
              <button
                onClick={() => setSelectedComboForDetail(null)}
                className="absolute top-4 right-4 z-50 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition-all active:scale-90"
              >
                <X size={18} strokeWidth={2.5} />
              </button>

              {/* HÌNH ẢNH COMBO */}
              <div className="w-full aspect-[16/10] relative bg-gray-100 overflow-hidden">
                <img
                  src={selectedComboForDetail.image ? `${axiosClient.defaults.baseURL}/api/images/${selectedComboForDetail.image}` : (selectedComboForDetail.menuItemIds?.[0]?.images?.length > 0 ? `${axiosClient.defaults.baseURL}/api/images/${selectedComboForDetail.menuItemIds[0].images[0]}` : 'https://placehold.co/800x800')}
                  className="absolute inset-0 w-full h-full object-cover filter blur-2xl scale-110 opacity-30 select-none pointer-events-none"
                  alt=""
                />
                <img
                  src={selectedComboForDetail.image ? `${axiosClient.defaults.baseURL}/api/images/${selectedComboForDetail.image}` : (selectedComboForDetail.menuItemIds?.[0]?.images?.length > 0 ? `${axiosClient.defaults.baseURL}/api/images/${selectedComboForDetail.menuItemIds[0].images[0]}` : 'https://placehold.co/800x800')}
                  className="absolute inset-0 w-full h-full object-contain relative z-10"
                  alt={selectedComboForDetail.name}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-20" />
              </div>

              {/* NỘI DUNG CHI TIẾT */}
              <div className="flex-1 flex flex-col bg-white relative z-20 -mt-6 rounded-t-[2rem] min-h-0">
                <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mt-3 mb-1" />

                <div className="flex-1 overflow-y-auto px-6 pt-4 pb-6 custom-scrollbar">
                  <span className="bg-red-100 text-red-600 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md inline-block mb-2">
                    Combo ưu đãi cực hời
                  </span>

                  <h3 className="text-xl font-bold text-gray-900 mb-2 leading-tight">
                    {selectedComboForDetail.name}
                  </h3>

                  <p className="text-gray-500 text-xs md:text-sm mb-6 leading-relaxed">
                    {selectedComboForDetail.description || 'Gói combo tiết kiệm tiện lợi được chuẩn bị đặc biệt từ các nguyên liệu tươi mới trong ngày.'}
                  </p>

                  {/* DANH SÁCH MÓN */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
                      <h4 className="font-bold text-[11px] text-gray-800 uppercase tracking-wider">Các món trong combo</h4>
                      <span className="text-[10px] font-black text-red-500">{selectedComboForDetail.menuItemIds?.length || 0} MÓN ĂN</span>
                    </div>

                    <div className="flex flex-col gap-2">
                      {selectedComboForDetail.menuItemIds?.map((m: any, idx: number) => (
                        <div key={m._id || idx} className="flex items-center gap-3 bg-red-50/50 p-2.5 rounded-xl border border-red-100/50">
                          <img
                            src={m.images?.length > 0 ? `${axiosClient.defaults.baseURL}/api/images/${m.images[0]}` : 'https://placehold.co/100'}
                            className="w-10 h-10 rounded-lg object-cover border border-red-200"
                            alt={m.name}
                          />
                          <div className="flex-1">
                            <h5 className="font-bold text-xs text-gray-850">{m.name}</h5>
                            <p className="text-[10px] text-gray-400 line-clamp-1">{m.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* GHI CHÚ COMBO */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-3 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
                      <h4 className="font-bold text-[11px] text-gray-800 uppercase tracking-wider">Ghi chú thêm</h4>
                      <span className="text-[9px] font-black text-gray-400">KHÔNG BẮT BUỘC</span>
                    </div>
                    <textarea
                      value={itemNote}
                      onChange={(e) => setItemNote(e.target.value)}
                      placeholder="Ghi chú (Ví dụ: ít đá, nhiều đường...)"
                      className="w-full bg-white border border-gray-200 rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                      rows={2}
                    />
                  </div>
                </div>

                {/* THANH TOÁN DÍNH ĐÁY COMBO */}
                {(() => {
                  const displayPrice = selectedComboForDetail.price * detailQuantity;

                  return (
                    <div className="shrink-0 p-4 bg-white border-t border-gray-100 shadow-[0_-10px_20px_rgba(0,0,0,0.03)] z-30">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between bg-gray-50 p-2 rounded-xl border border-gray-100">
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Số lượng</span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setDetailQuantity(Math.max(1, detailQuantity - 1))}
                                className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all active:scale-90"
                              >
                                <Minus size={14} />
                              </button>
                              <div className="w-8 text-center font-bold text-sm text-gray-800">
                                {detailQuantity}
                              </div>
                              <button
                                onClick={() => setDetailQuantity(detailQuantity + 1)}
                                className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all active:scale-90"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                          </div>
                          <div className="flex flex-col items-end mr-1">
                            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Tạm tính</span>
                            <span className="text-base font-black text-red-650">
                              {displayPrice.toLocaleString()}đ
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            handleAddComboToCart(e, selectedComboForDetail, detailQuantity, itemNote);
                            setSelectedComboForDetail(null);
                          }}
                          className="w-full py-3 bg-red-600 text-white font-bold rounded-xl shadow-lg hover:bg-red-700 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider active:scale-95"
                        >
                          <ShoppingBag size={14} />
                          Thêm {detailQuantity} Combo Vào Giỏ
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MenuPage;
