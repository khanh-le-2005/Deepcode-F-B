import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '@/src/lib/axiosClient';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import { ChevronLeft, ShoppingBag, Heart, Star, X, Minus, Plus, Trash2 } from 'lucide-react';
import { MenuItem } from '../../types';
import { CustomerHeader } from '../../components/CustomerHeader';
import { InvalidTable } from '../../components/InvalidTable';
import { useTableValidation } from '../../hooks/useTableValidation';
import { useCart } from '../../contexts/CartContext';
import { getMenuItemCategoryName, getMenuItemId, getMenuItemImageUrl } from '../../lib/menuHelpers';

export const MenuItemDetailPage = () => {
  const { tableId, itemId } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<MenuItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const { status } = useTableValidation(tableId);
  const { cart, addToCart, removeFromCart, updateQuantity, totalItems, totalPrice } = useCart();
  const [selectedOption, setSelectedOption] = useState<any>(null);
  const [selectedAddons, setSelectedAddons] = useState<any[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeSession, setActiveSession] = useState<any>(null);

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
    axios.get('/api/menu').then(res => {
      const foundItem = res.data.find((i: MenuItem) => getMenuItemId(i) === itemId);
      setItem(foundItem || null);
      // Removed auto-selection of first option
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
    fetchActiveSession();
  }, [itemId, status, tableId]);

  const handleToggleAddon = (addon: any) => {
    setSelectedAddons(prev => 
      prev.find(a => a.name === addon.name)
        ? prev.filter(a => a.name !== addon.name)
        : [...prev, addon]
    );
  };

  const displayCart = tableId ? (activeSession?.items || []) : cart;
  const displayTotalItems = tableId
    ? displayCart.reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0)
    : totalItems;
  const displayTotalPrice = tableId
    ? (activeSession?.total ?? displayCart.reduce((sum: number, item: any) => sum + Number(item.quantity || 0) * Number(item.basePrice || 0), 0))
    : totalPrice;
  const newItems = displayCart.filter((i: any) => i.status === 'in_cart');
  const orderedItems = displayCart.filter((i: any) => i.status !== 'in_cart');
  const hasTableCartItems = tableId ? newItems.length > 0 : false;
  const canCheckout = tableId ? hasTableCartItems : displayCart.length > 0;

  const handleAddToCart = async () => {
    if (!item) return;
    
    const itemsToAdd = [{
      menuItemId: getMenuItemId(item),
      name: item.name,
      basePrice: item.price,
      quantity: quantity,
      ...(selectedOption ? { selectedOption } : {}),
      selectedAddons: selectedAddons || [],
      image: getMenuItemImageUrl(item),
      category: getMenuItemCategoryName(item),
    }];

    if (tableId) {
      // Shared Cart cho Dine-in
      try {
        await axios.post('/api/orders', {
          tableId,
          items: itemsToAdd
        });
        toast.success(`Đã thêm ${quantity} ${item.name} vào giỏ bàn ${tableId}!`);
        await fetchActiveSession();
        navigate(`/table/${tableId}/menu`);
      } catch (err: any) {
        console.error("Failed to add to shared cart", err);
        const apiMessage = err.response?.data?.error?.message || err.response?.data?.message;
        toast.error(apiMessage || "Lỗi khi thêm món vào giỏ bàn. Vui lòng thử lại!");
      }
    } else {
      // Local Cart cho Delivery
      const unitPrice = Number(item.price) + 
                        Number(selectedOption?.priceExtra || 0) + 
                        selectedAddons.reduce((sum, addon) => sum + Number(addon.priceExtra || 0), 0);
      
      addToCart({
        ...itemsToAdd[0],
        totalPrice: unitPrice * quantity,
        status: 'in_cart',
      } as any);
      toast.success(`Đã thêm ${quantity} ${item.name} vào giỏ hàng!`);
      navigate('/menu');
    }
  };

  const handleRemoveTableCartItem = async (itemId: string) => {
    if (!tableId || !activeSession) return;
    await axios.delete(`/api/orders/${activeSession.id || activeSession._id}/item/${itemId}`);
    await fetchActiveSession();
  };

  const handleUpdateTableCartItemQuantity = async (itemId: string, delta: number) => {
    if (!tableId || !activeSession) return;
    await axios.patch(`/api/orders/${activeSession.id || activeSession._id}/item/${itemId}/quantity`, { delta });
    await fetchActiveSession();
  };

  if (status === 'loading') {
     return <div className="min-h-screen flex items-center justify-center bg-[#fcf9f4]"><div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (status === 'invalid') {
     return <InvalidTable tableId={tableId} />;
  }

  if (loading) {
     return <div className="min-h-screen flex items-center justify-center bg-[#fcf9f4]"><div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (!item) {
     return (
       <div className="min-h-screen flex flex-col items-center justify-center bg-[#fcf9f4]">
         <h1 className="text-3xl font-bold italic mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>Không tìm thấy món!</h1>
         <button onClick={() => navigate(tableId ? `/table/${tableId}/menu` : `/menu`)} className="bg-red-600 text-white px-6 py-3 rounded uppercase font-bold text-sm">Quay lại thực đơn</button>
       </div>
     );
  }

  return (
    
    <div className="bg-[#fcf9f4] min-h-screen text-[#1a1a1a]" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      <CustomerHeader 
        tableId={tableId}
        showBackButton={true}
        totalItems={displayTotalItems}
        onCartClick={() => setIsCartOpen(true)}
      />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-16">
        <div className="bg-white rounded-2xl p-6 sm:p-10 md:p-16 shadow-2xl flex flex-col lg:flex-row gap-8 lg:gap-16 relative overflow-hidden text-center lg:text-left border border-gray-100">
          <div className="absolute top-0 right-0 w-64 h-64 bg-red-50 rounded-full -translate-y-1/2 translate-x-1/2 mix-blend-multiply opacity-50 blur-3xl"></div>
          
          <div className="w-full lg:w-1/2 flex items-center justify-center relative z-10">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="w-full max-w-sm md:max-w-md rounded-none overflow-hidden bg-white/50"
            >
              <img
                src={item.images?.[0] ? `/api/images/${item.images[0]}` : ''}
                alt={item.name}
                className="w-full h-auto object-contain hover:scale-105 transition-transform duration-700"
              />
            </motion.div>
          </div>

          <div className="w-full lg:w-1/2 flex flex-col justify-center relative z-10">
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
              <div className="flex items-center gap-2 mb-4 justify-center lg:justify-start">
                <span className="bg-red-100 text-red-600 text-[10px] font-black uppercase px-3 py-1 rounded-md">{getMenuItemCategoryName(item)}</span>
                <span className="flex text-yellow-500"><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /></span>
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 mb-6 italic" style={{ fontFamily: "'Playfair Display', serif" }}>
                {item.name}
              </h1>
              
              <p className="text-gray-500 leading-relaxed mb-8 text-lg">
                {item.description || "Hương vị tuyệt hảo được chế biến từ những nguyên liệu tươi ngon nhất, mang đến trải nghiệm ẩm thực khó quên dành cho bạn."}
              </p>

              <div className="text-4xl md:text-5xl font-black text-red-600 mb-8" style={{ fontFamily: "'Playfair Display', serif" }}>
                {(
                  Number(item.price || 0) + 
                  Number(selectedOption?.priceExtra || 0) + 
                  selectedAddons.reduce((sum, a) => sum + Number(a.priceExtra || 0), 0)
                ).toLocaleString()}đ
              </div>

              {/* Options Selection */}
              {item.options && item.options.length > 0 && (
                <div className="mb-8 text-left">
                  <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-4">Lựa chọn (Chọn 1)</h3>
                  <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
                    {item.options.map((opt) => (
                      <button
                        key={opt.name}
                        onClick={() => setSelectedOption(selectedOption?.name === opt.name ? null : opt)}
                        className={`px-5 py-3 rounded-xl font-bold border-2 transition-all ${
                          selectedOption?.name === opt.name
                            ? 'border-red-600 bg-red-600 text-white shadow-lg shadow-red-200'
                            : 'border-gray-100 bg-white text-gray-600 hover:border-gray-200'
                        }`}
                      >
                        {opt.name} {opt.priceExtra > 0 && `(+${opt.priceExtra.toLocaleString()}đ)`}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Addons Selection */}
              {item.addons && item.addons.length > 0 && (
                <div className="mb-10 text-left">
                  <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-4">Thêm món (Chọn nhiều)</h3>
                  <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
                    {item.addons.map((addon) => {
                      const isSelected = selectedAddons.find(a => a.name === addon.name);
                      return (
                        <button
                          key={addon.name}
                          onClick={() => handleToggleAddon(addon)}
                          className={`px-5 py-3 rounded-xl font-bold border-2 transition-all ${
                            isSelected
                              ? 'border-gray-900 bg-gray-900 text-white shadow-lg'
                              : 'border-gray-100 bg-white text-gray-600 hover:border-gray-200'
                          }`}
                        >
                          {addon.name} {addon.priceExtra > 0 && `(+${addon.priceExtra.toLocaleString()}đ)`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-6 items-center">
                <div className="flex items-center border-2 border-gray-200 rounded-xl h-14 bg-white hover:border-red-200 transition-colors">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="px-6 h-full flex items-center hover:text-red-600 font-black text-xl transition-colors">-</button>
                  <span className="px-4 font-black text-xl w-12 text-center text-gray-900">{quantity}</span>
                  <button onClick={() => setQuantity(quantity + 1)} className="px-6 h-full flex items-center hover:text-red-600 font-black text-xl transition-colors">+</button>
                </div>
                
                <button 
                  onClick={handleAddToCart}
                  className="bg-[#111] hover:bg-red-600 text-white px-8 h-14 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors shadow-[0_10px_40px_-10px_rgba(220,38,38,0.5)] flex-1 sm:flex-none min-w-[180px] whitespace-nowrap"
                >
                  <ShoppingBag className="w-5 h-5 shrink-0" />
                  Thêm vào giỏ
                </button>

                <button className="h-14 w-14 flex items-center justify-center rounded-xl border-2 border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-600 hover:bg-red-50 transition-all bg-white shrink-0">
                  <Heart className="w-6 h-6" />
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-black/45 sm:bg-black/55 backdrop-blur-[2px] sm:backdrop-blur-sm z-[200]"
            />
            <motion.div
              initial={{ y: "100%", opacity: 0.98 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0.98 }}
              transition={{ type: "spring", damping: 28, stiffness: 260, mass: 0.9 }}
              style={{ willChange: 'transform' }}
              className="fixed right-0 bottom-0 w-full sm:max-w-md bg-white z-[201] flex flex-col shadow-[0_-16px_40px_rgba(0,0,0,0.18)] rounded-t-2xl overflow-hidden"
            >
              <div className="pt-3 pb-2 px-6 sm:px-8 bg-[#111] text-white shrink-0">
                <div className="mx-auto h-1.5 w-12 rounded-full bg-white/30 mb-4" />
                <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold italic uppercase" style={{ fontFamily: "'Playfair Display', serif" }}>Giỏ hàng của bạn</h2>
                <X className="w-6 h-6 cursor-pointer" onClick={() => setIsCartOpen(false)} />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 overscroll-contain">
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
                        {(() => {
                           const groupedNewItems = newItems.reduce((acc: any[], item: any) => {
                             const addonKey = (item.selectedAddons || []).map((a: any) => a.name).sort().join(',');
                             const optionKey = item.selectedOption?.name || '';
                             const key = `${item.name}-${optionKey}-${addonKey}`;
                             const existing = acc.find(i => i.groupKey === key);
                             if (existing) {
                               existing.quantity += item.quantity;
                               existing.totalPrice += item.totalPrice;
                               existing.ids.push(item._id || item.menuItemId);
                             } else {
                               acc.push({ ...item, groupKey: key, ids: [item._id || item.menuItemId] });
                             }
                             return acc;
                           }, []);

                           return groupedNewItems.map((cartItem, idx) => (
                             <motion.div 
                               layout
                               key={cartItem.groupKey + idx} 
                               className="bg-white rounded-[2rem] p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100/50 flex gap-4 group hover:border-red-100 transition-all duration-300"
                             >
                                <div className="relative w-24 h-24 shrink-0 rounded-none overflow-hidden shadow-inner">
                                  <img src={cartItem.image ?? ''} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-700" alt="" />
                                </div>
                                <div className="flex-1 flex flex-col justify-between py-1">
                                  <div>
                                    <div className="flex justify-between items-start">
                                      <h4 className="font-bold italic text-base leading-tight pr-2" style={{ fontFamily: "'Playfair Display', serif" }}>{cartItem.name}</h4>
                                      <button 
                                        onClick={() => tableId ? handleRemoveTableCartItem(cartItem.ids[0]) : removeFromCart(cartItem.menuItemId)}
                                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                    
                                    {(cartItem.selectedOption || (cartItem.selectedAddons && cartItem.selectedAddons.length > 0)) && (
                                      <div className="mt-2 flex flex-wrap gap-1.5">
                                        {cartItem.selectedOption && (
                                          <span className="bg-slate-50 text-slate-500 text-[9px] font-black uppercase px-2 py-0.5 rounded-md border border-slate-100">
                                            {cartItem.selectedOption.name}
                                          </span>
                                        )}
                                        {cartItem.selectedAddons?.map((addon: any, aIdx: number) => (
                                          <span key={aIdx} className="bg-amber-50 text-amber-600 text-[9px] font-black uppercase px-2 py-0.5 rounded-md border border-amber-100">
                                            {addon.name}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex items-center justify-between mt-3">
                                    <p className="text-red-600 font-black text-base italic" style={{ fontFamily: "'Playfair Display', serif" }}>
                                      {(Number(cartItem.totalPrice) / cartItem.quantity).toLocaleString()}đ
                                    </p>
                                    
                                    <div className="flex items-center bg-[#fdfaf5] border border-[#f5efde] rounded-full p-1 shadow-sm">
                                      {tableId ? (
                                        <>
                                          <button className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-white rounded-full transition-all active:scale-90" onClick={() => handleUpdateTableCartItemQuantity(cartItem.ids[0], -1)}><Minus className="w-3.5 h-3.5" /></button>
                                          <span className="w-8 text-center font-bold text-sm">{cartItem.quantity}</span>
                                          <button className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-white rounded-full transition-all active:scale-90" onClick={() => handleUpdateTableCartItemQuantity(cartItem.ids[0], 1)}><Plus className="w-3.5 h-3.5" /></button>
                                        </>
                                      ) : (
                                        <>
                                          <button className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-white rounded-full transition-all active:scale-90" onClick={() => updateQuantity(cartItem.menuItemId, -1)}>-</button>
                                          <span className="w-8 text-center font-bold text-sm">{cartItem.quantity}</span>
                                          <button className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-white rounded-full transition-all active:scale-90" onClick={() => updateQuantity(cartItem.menuItemId, 1)}>+</button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                             </motion.div>
                           ));
                        })()}
                      </div>
                    )}

                    {orderedItems.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="h-0.5 flex-1 bg-gray-100" />
                          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Món đang phục vụ (Đã gửi bếp)</h3>
                          <div className="h-0.5 flex-1 bg-gray-100" />
                        </div>
                        {(() => {
                           const groupedOrderedItems = orderedItems.reduce((acc: any[], item: any) => {
                             const addonKey = (item.selectedAddons || []).map((a: any) => a.name).sort().join(',');
                             const optionKey = item.selectedOption?.name || '';
                             const key = `${item.name}-${optionKey}-${addonKey}-${item.status}`;
                             const existing = acc.find(i => i.groupKey === key);
                             if (existing) {
                               existing.quantity += item.quantity;
                             } else {
                               acc.push({ ...item, groupKey: key });
                             }
                             return acc;
                           }, []);

                           return groupedOrderedItems.map((cartItem, idx) => (
                            <div 
                              key={cartItem.groupKey + idx} 
                              className="bg-gray-50/50 rounded-[2rem] p-4 border border-gray-100 flex gap-4 opacity-80 grayscale-[0.2] group hover:grayscale-0 transition-all duration-500"
                            >
                              <div className="w-20 h-20 shrink-0 rounded-none overflow-hidden">
                                <img src={cartItem.image ?? ''} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-700" alt="" />
                              </div>

                              <div className="flex-1 flex flex-col justify-between py-1">
                                <div>
                                  <div className="flex justify-between items-start">
                                    <h4 className="font-bold italic text-base leading-tight pr-2" style={{ fontFamily: "'Playfair Display', serif" }}>{cartItem.name}</h4>
                                    <div className="flex items-center gap-1 flex-wrap justify-end">
                                      <span className="px-2 py-0.5 bg-white text-gray-500 rounded-lg text-[8px] font-black uppercase tracking-widest border border-gray-100 shadow-sm whitespace-nowrap">
                                        {cartItem.status}
                                      </span>
                                      {cartItem.isPaid ? (
                                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-lg text-[8px] font-black uppercase tracking-widest border border-emerald-200 shadow-sm whitespace-nowrap">
                                          Đã trả
                                        </span>
                                      ) : (
                                        <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded-lg text-[8px] font-black uppercase tracking-widest border border-red-200 shadow-sm whitespace-nowrap animate-pulse">
                                          Chưa trả
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {(cartItem.selectedOption || (cartItem.selectedAddons && cartItem.selectedAddons.length > 0)) && (
                                    <div className="mt-1.5 flex flex-wrap gap-1">
                                      {cartItem.selectedOption && (
                                        <span className="text-[9px] text-gray-400 italic">• {cartItem.selectedOption.name}</span>
                                      )}
                                      {cartItem.selectedAddons?.map((addon: any, aIdx: number) => (
                                        <p key={aIdx} className="text-[9px] text-gray-400 italic pr-2">• {addon.name}</p>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                <div className="flex justify-between items-center mt-2">
                                  <p className="text-gray-400 font-bold text-xs uppercase tracking-tighter">
                                    Số lượng: <span className="text-[#111] text-sm font-black italic" style={{ fontFamily: "'Playfair Display', serif" }}>{cartItem.quantity}</span>
                                  </p>
                                  <div className="h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                                </div>
                              </div>
                            </div>
                           ));
                        })()}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-5 sm:p-8 bg-white space-y-4 border-t border-gray-100 shrink-0">
                <div className="bg-[#111] rounded-xl p-6 text-white shadow-xl relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-red-600/20 to-transparent opacity-50" />
                  <div className="relative z-10 flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">Thanh toán</p>
                      <h3 className="text-2xl font-black italic tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>Tổng cộng</h3>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-red-400 mb-1 uppercase">{displayTotalItems} món ăn</p>
                      <span className="text-3xl font-black text-white italic" style={{ fontFamily: "'Playfair Display', serif" }}>
                        {displayTotalPrice.toLocaleString()}đ
                      </span>
                    </div>
                  </div>
                </div>

                {orderedItems.length > 0 && (
                  <button
                    onClick={() => { setIsCartOpen(false); navigate(`/table/${tableId}/tracking`); }}
                    className="w-full py-3 bg-blue-50 text-blue-600 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-100 transition-colors border border-blue-100 animate-pulse"
                  >
                    🔍 Theo dõi trạng thái món đã đặt
                  </button>
                )}

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    onClick={() => setIsCartOpen(false)}
                    className="w-full border-2 border-gray-200 text-gray-500 py-4 rounded-xl font-black italic uppercase transition-all text-xs active:scale-95"
                  >
                    Đóng
                  </button>
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
                    className={`w-full py-4 rounded-xl font-black italic uppercase transition-all shadow-xl text-xs flex items-center justify-center gap-2 ${
                      canCheckout ? "bg-red-600 text-white active:scale-95" : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {tableId ? (hasTableCartItems ? 'Xác nhận đặt' : 'Đã gửi bếp') : 'Thanh toán'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
