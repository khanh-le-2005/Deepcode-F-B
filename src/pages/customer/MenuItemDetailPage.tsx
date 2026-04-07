import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '@/src/lib/axiosClient';
import { motion, AnimatePresence } from 'framer-motion';
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
      if (foundItem?.options?.length > 0) {
        setSelectedOption(foundItem.options[0]); // Mặc định chọn cái đầu tiên
      }
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

  const handleAddToCart = async () => {
    if (!item) return;
    
    const itemsToAdd = [{
      menuItemId: getMenuItemId(item),
      name: item.name,
      basePrice: item.price,
      quantity: quantity,
      selectedOption,
      selectedAddons,
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
        alert(`Đã thêm ${quantity} ${item.name} vào giỏ bàn ${tableId}!`);
        await fetchActiveSession();
        navigate(`/table/${tableId}/menu`);
      } catch (err: any) {
        console.error("Failed to add to shared cart", err);
        alert(err.response?.data?.message || "Lỗi khi thêm món vào giỏ bàn. Vui lòng thử lại!");
      }
    } else {
      // Local Cart cho Delivery
      addToCart({
        ...itemsToAdd[0],
        totalPrice: (item.price + (selectedOption?.priceExtra || 0) + selectedAddons.reduce((a,c) => a+c.priceExtra,0)) * quantity,
        status: 'in_cart',
      });
      alert(`Đã thêm ${quantity} ${item.name} vào giỏ hàng!`);
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
        <div className="bg-white rounded-4xl sm:rounded-[3rem] p-6 sm:p-10 md:p-16 shadow-2xl flex flex-col lg:flex-row gap-8 lg:gap-16 relative overflow-hidden text-center lg:text-left border border-gray-100">
          <div className="absolute top-0 right-0 w-64 h-64 bg-red-50 rounded-full -translate-y-1/2 translate-x-1/2 mix-blend-multiply opacity-50 blur-3xl"></div>
          
          <div className="w-full lg:w-1/2 flex items-center justify-center relative z-10">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="w-full max-w-sm md:max-w-md aspect-4/3 rounded-3xl sm:rounded-4xl overflow-hidden shadow-2xl bg-gray-100"
            >
              <img
                src={item.images?.[0] ? `/api/images/${item.images[0]}` : ''}
                alt={item.name}
                className="w-full h-full object-cover hover:scale-110 transition-transform duration-700"
              />
            </motion.div>
          </div>

          <div className="w-full lg:w-1/2 flex flex-col justify-center relative z-10">
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
              <div className="flex items-center gap-2 mb-4 justify-center lg:justify-start">
                <span className="bg-red-100 text-red-600 text-xs font-black uppercase px-3 py-1 rounded-full">{getMenuItemCategoryName(item)}</span>
                <span className="flex text-yellow-500"><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /></span>
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 mb-6 italic" style={{ fontFamily: "'Playfair Display', serif" }}>
                {item.name}
              </h1>
              
              <p className="text-gray-500 leading-relaxed mb-8 text-lg">
                {item.description || "Hương vị tuyệt hảo được chế biến từ những nguyên liệu tươi ngon nhất, mang đến trải nghiệm ẩm thực khó quên dành cho bạn."}
              </p>

              <div className="text-4xl md:text-5xl font-black text-red-600 mb-8" style={{ fontFamily: "'Playfair Display', serif" }}>
                {item.price.toLocaleString()}đ
              </div>

              {/* Options Selection */}
              {item.options && item.options.length > 0 && (
                <div className="mb-8 text-left">
                  <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-4">Lựa chọn (Chọn 1)</h3>
                  <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
                    {item.options.map((opt) => (
                      <button
                        key={opt.name}
                        onClick={() => setSelectedOption(opt)}
                        className={`px-5 py-3 rounded-2xl font-bold border-2 transition-all ${
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
                          className={`px-5 py-3 rounded-2xl font-bold border-2 transition-all ${
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
                <div className="flex items-center border-2 border-gray-200 rounded-full h-14 bg-white hover:border-red-200 transition-colors">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="px-6 h-full flex items-center hover:text-red-600 font-black text-xl transition-colors">-</button>
                  <span className="px-4 font-black text-xl w-12 text-center text-gray-900">{quantity}</span>
                  <button onClick={() => setQuantity(quantity + 1)} className="px-6 h-full flex items-center hover:text-red-600 font-black text-xl transition-colors">+</button>
                </div>
                
                <button 
                  onClick={handleAddToCart}
                  className="bg-[#111] hover:bg-red-600 text-white px-10 h-14 rounded-full font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-colors shadow-[0_10px_40px_-10px_rgba(220,38,38,0.5)] w-full sm:w-auto"
                >
                  <ShoppingBag className="w-5 h-5" />
                  Thêm vào giỏ
                </button>

                <button className="h-14 w-14 flex items-center justify-center rounded-full border-2 border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-600 hover:bg-red-50 transition-all bg-white shrink-0">
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
              className="fixed right-0 bottom-0 w-full sm:max-w-md bg-white z-[201] flex flex-col shadow-[0_-16px_40px_rgba(0,0,0,0.18)] rounded-t-[2rem] sm:rounded-t-[2.5rem] overflow-hidden"
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
                  <>
                    {newItems.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <div className="h-0.5 flex-1 bg-red-100" />
                          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-red-600">Món mới chọn</h3>
                          <div className="h-0.5 flex-1 bg-red-100" />
                        </div>
                        {newItems.map((cartItem: any, idx: number) => (
                          <div key={(cartItem._id || cartItem.menuItemId) + idx} className="flex gap-4 border-b border-gray-100 pb-5">
                            <img src={cartItem.image ?? ''} className="w-20 h-20 rounded-2xl object-cover" alt="" />
                            <div className="flex-1">
                              <h4 className="font-bold italic text-lg" style={{ fontFamily: "'Playfair Display', serif" }}>{cartItem.name}</h4>
                              {(cartItem.selectedOption || (cartItem.selectedAddons && cartItem.selectedAddons.length > 0)) && (
                                <div className="mt-1 space-y-0.5">
                                  {cartItem.selectedOption && <p className="text-[10px] text-gray-500 italic">• {cartItem.selectedOption.name}</p>}
                                  {cartItem.selectedAddons?.map((addon: any, addonIdx: number) => (
                                    <p key={addonIdx} className="text-[10px] text-gray-500 italic">• {addon.name}</p>
                                  ))}
                                </div>
                              )}
                              <p className="text-red-600 font-bold mt-1">{(Number(cartItem.totalPrice || 0) / Number(cartItem.quantity || 1)).toLocaleString()}đ</p>
                              <div className="flex items-center gap-4 mt-2">
                                <div className="flex items-center border border-gray-200 rounded-lg bg-white overflow-hidden">
                                  {tableId ? (
                                    <>
                                      <button className="px-3 py-1 hover:bg-red-50 hover:text-red-600 font-bold" onClick={() => handleUpdateTableCartItemQuantity(cartItem._id || cartItem.menuItemId, -1)}><Minus className="w-3 h-3" /></button>
                                      <span className="px-4 font-bold">{cartItem.quantity}</span>
                                      <button className="px-3 py-1 hover:bg-red-50 hover:text-red-600 font-bold" onClick={() => handleUpdateTableCartItemQuantity(cartItem._id || cartItem.menuItemId, 1)}><Plus className="w-3 h-3" /></button>
                                    </>
                                  ) : (
                                    <>
                                      <button className="px-3 py-1 hover:bg-red-50 hover:text-red-600 font-bold" onClick={() => updateQuantity(cartItem.menuItemId, -1)}>-</button>
                                      <span className="px-4 font-bold">{cartItem.quantity}</span>
                                      <button className="px-3 py-1 hover:bg-red-50 hover:text-red-600 font-bold" onClick={() => updateQuantity(cartItem.menuItemId, 1)}>+</button>
                                    </>
                                  )}
                                </div>
                                <Trash2 className="w-4 h-4 text-gray-300 cursor-pointer hover:text-red-600" onClick={() => tableId ? handleRemoveTableCartItem(cartItem._id || cartItem.menuItemId) : removeFromCart(cartItem.menuItemId)} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {orderedItems.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <div className="h-0.5 flex-1 bg-gray-100" />
                          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Món đang phục vụ</h3>
                          <div className="h-0.5 flex-1 bg-gray-100" />
                        </div>
                        {orderedItems.map((cartItem: any, idx: number) => (
                          <div key={(cartItem._id || cartItem.menuItemId) + idx} className="flex gap-4 border-b border-gray-100 pb-5 opacity-80 grayscale-[0.3]">
                            <img src={cartItem.image ?? ''} className="w-16 h-16 rounded-2xl object-cover" alt="" />
                            <div className="flex-1">
                              <h4 className="font-bold italic text-base" style={{ fontFamily: "'Playfair Display', serif" }}>{cartItem.name}</h4>
                              <p className="text-gray-500 font-medium text-xs mt-1">SL: <span className="font-bold text-[#111]">{cartItem.quantity}</span></p>
                              <span className="inline-flex mt-2 px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[8px] font-black uppercase tracking-widest">{cartItem.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="p-5 sm:p-8 bg-gray-50 space-y-4 border-t border-gray-100 shrink-0">
                <div className="flex justify-between items-center px-1">
                  <span className="text-gray-400 font-bold uppercase text-[10px] tracking-widest italic">Tổng cộng</span>
                  <span className="text-2xl font-black text-red-600 italic" style={{ fontFamily: "'Playfair Display', serif" }}>
                    {displayTotalPrice.toLocaleString()}đ
                  </span>
                </div>

                <button
                  onClick={() => setIsCartOpen(false)}
                  className="w-full bg-[#111] text-white py-4 rounded-2xl font-black italic uppercase transition-all shadow-xl text-xs active:scale-95"
                >
                  Đóng giỏ hàng
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
