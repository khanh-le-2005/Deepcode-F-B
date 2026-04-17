import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, MapPin, User, History, Heart, ShoppingBag, 
  Plus, ChevronRight, Truck, Package, 
  CreditCard, Banknote, X, Loader2, ArrowRight, Leaf, Sparkles, Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';

const socket = io();

// --- Cấu hình API theo tài liệu ---
const BASE_URL = window.location.origin + '/api';
const IMAGE_URL = (id: string) => `${BASE_URL}/images/${id}`;

// Ảnh Banner phong cách trà chanh/trái cây tươi
const HERO_IMAGE = "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?q=80&w=2000&auto=format&fit=crop";

interface Category { _id: string; name: string; slug: string; }
interface MenuItem { _id: string; name: string; price: number; description: string; images: string[]; categoryId: { _id: string; name: string }; }
interface CartItem extends MenuItem { quantity: number; }

export default function FreshLemonTeaKiosk() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCatId, setSelectedCatId] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form Đặt hàng (Mục 7.3)
  const [orderType, setOrderType] = useState<'takeaway' | 'delivery'>('takeaway');
  const [paymentMethod, setPaymentMethod] = useState<'transfer' | 'cash'>('transfer');
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', deliveryAddress: '', note: '' });
  const [qrResponse, setQrResponse] = useState<{ qrBase64: string; paymentContent: string; orderId?: string; tableId?: string } | null>(null);

  // Cập nhật trạng thái thanh toán tự động qua Socket.io
  useEffect(() => {
    if (!qrResponse?.orderId) return;

    const handleOrderPaid = (data: { orderId: string, paymentStatus: string }) => {
      if (data.orderId === qrResponse.orderId && data.paymentStatus === 'paid') {
        setQrResponse(null);
        setCart([]);
        setIsModalOpen(false);
        setCustomerInfo({ name: '', phone: '', deliveryAddress: '', note: '' });
        navigate(`/success?orderId=${qrResponse.orderId}`);
      }
    };

    socket.on('order-paid', handleOrderPaid);

    return () => {
      socket.off('order-paid', handleOrderPaid);
    };
  }, [qrResponse, navigate]);

  useEffect(() => {
    const initData = async () => {
      try {
        setLoading(true);
        const [catRes, menuRes] = await Promise.all([
          fetch(`${BASE_URL}/categories`),
          fetch(`${BASE_URL}/weekly-menu/active`)
        ]);
        
        const catData = await catRes.json();
        setCategories(catData || []);

        const menuData = await menuRes.json();
        if (menuData && menuData.menuItems) {
          setMenuItems(menuData.menuItems);
        } else {
          const allMenuRes = await fetch(`${BASE_URL}/menu`);
          setMenuItems(await allMenuRes.json());
        }
      } catch (err) {
        console.error("Lỗi API");
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);

  const getItemId = (item: any) => item._id || item.id;

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => getItemId(i) === getItemId(item));
      if (existing) return prev.map(i => getItemId(i) === getItemId(item) ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const handleCheckout = async () => {
    const payload = { orderType, paymentMethod, customerInfo, 
      items: cart.map(item => ({ menuItemId: getItemId(item), name: item.name, basePrice: item.price, quantity: item.quantity })) 
    };
    try {
      const res = await fetch(`${BASE_URL}/orders/kiosk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (res.ok) {
        const actualOrderId = result.qrData?.orderId || result._id || result.id;
        const actualTableId = result.tableId || result.qrData?.tableId;

        if (paymentMethod === 'transfer' && result.qrData) {
          if (result.qrData.checkoutUrl) {
            window.location.href = result.qrData.checkoutUrl;
            return;
          }
          console.log("Setting QR Response with orderId:", actualOrderId, "tableId:", actualTableId);
          setQrResponse({ ...result.qrData, orderId: actualOrderId, tableId: actualTableId });
        } else {
          setCart([]);
          setIsModalOpen(false);
          if (actualOrderId) navigate(`/success?orderId=${actualOrderId}`);
        }
      }
    } catch (err) { 
      console.error("Lỗi gửi đơn:", err);
      alert("Lỗi gửi đơn. Vui lòng kiểm tra kết nối mạng."); 
    }
  };

  if (loading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-[#FEF9E7]">
      <Loader2 className="animate-spin text-yellow-600 mb-4" size={48} />
      <p className="font-bold text-yellow-800">Đang hái quả tươi...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FEF9E7] text-[#4A3728]">
      {/* Header Phong cách Organic */}
      <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl border-b border-yellow-100 px-6">
        <div className="max-w-7xl mx-auto h-24 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl rotate-6 flex items-center justify-center shadow-xl shadow-orange-200">
              <Leaf className="text-white" size={30} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter text-orange-600">BTEC TEA</h1>
              <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Natural & Healthy</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-2 bg-white/50 px-5 py-2.5 rounded-2xl text-sm font-bold border border-yellow-100">
              <MapPin size={18} className="text-orange-500" /> 13/Trịnh Văn Bô/Nam Từ Liêm/Hà Nội
            </div>
            <button onClick={() => setIsModalOpen(true)} className="relative p-4 bg-orange-500 text-white rounded-2xl hover:scale-110 shadow-2xl shadow-orange-200 transition-all active:scale-95">
              <ShoppingBag size={24} />
              {cart.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-black w-6 h-6 flex items-center justify-center rounded-full border-4 border-white">
                  {cart.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* Banner Tươi Mát */}
        <section className="relative w-full h-[550px] rounded-[60px] overflow-hidden mb-16 shadow-3xl group">
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-10" />
          <img src={HERO_IMAGE} alt="Lemon Tea" className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
          
          <div className="relative z-20 h-full flex flex-col justify-end p-16 text-white">
            <div className="flex items-center gap-2 bg-green-500 w-fit px-5 py-2 rounded-full text-xs font-black mb-6 uppercase tracking-widest shadow-lg">
              <Sparkles size={14} /> 100% Trái cây tươi
            </div>
            <h2 className="text-7xl md:text-8xl font-black mb-6 leading-none tracking-tight">
              Trà Chanh <br /> <span className="text-yellow-400 underline decoration-yellow-400/50">Giải Nhiệt</span>
            </h2>
            <p className="text-xl md:text-2xl opacity-90 mb-10 max-w-2xl font-medium">
              Vị chua thanh mát của chanh vàng, hòa quyện cùng mật ong rừng và lá trà thượng hạng.
            </p>
            <button className="w-fit px-12 py-5 bg-orange-500 text-white font-black rounded-[30px] shadow-2xl shadow-orange-500/40 flex items-center gap-3 hover:bg-orange-600 transition-all active:scale-95 text-lg">
              XEM MENU NGAY <ArrowRight />
            </button>
          </div>
        </section>

        {/* Danh mục dạng Viên thuốc (Pills) - SỬA LỖI HIGHLIGHT VÀ KEY */}
        <div className="flex items-center gap-4 mb-12 overflow-x-auto no-scrollbar py-2">
          <button 
            key="cat-all"
            onClick={() => setSelectedCatId('all')}
            className={`px-10 py-4 rounded-full text-sm font-black uppercase tracking-widest transition-all duration-300 focus:outline-none ${
              selectedCatId === 'all' 
              ? 'bg-orange-500 text-white shadow-xl shadow-orange-200 scale-105' 
              : 'bg-white text-yellow-800 hover:bg-yellow-50 shadow-sm border border-yellow-100'
            }`}
          >
            Tất cả vị
          </button>
          {categories.map((cat, idx) => {
            const currentId = cat._id || (cat as any).id || `cat-${idx}`;
            return (
              <button 
                key={currentId}
                onClick={() => setSelectedCatId(currentId)}
                className={`px-10 py-4 rounded-full text-sm font-black uppercase tracking-widest transition-all duration-300 focus:outline-none ${
                  selectedCatId === currentId 
                  ? 'bg-orange-500 text-white shadow-xl shadow-orange-200 scale-105' 
                  : 'bg-white text-yellow-800 hover:bg-yellow-50 shadow-sm border border-yellow-100'
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>

        {/* Grid Sản phẩm - Phong cách Organic */}
        {(() => {
          const filteredItems = menuItems.filter(item => {
            if (selectedCatId === 'all') return true;
            const itemCatId = item.categoryId?._id || (item.categoryId as any)?.id || (typeof item.categoryId === 'string' ? item.categoryId : null);
            return itemCatId === selectedCatId;
          });
          if (filteredItems.length === 0) {
            return (
              <div className="py-20 flex flex-col items-center justify-center text-center w-full">
                <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mb-6">
                  <Leaf className="text-yellow-500" size={40} />
                </div>
                <h3 className="text-2xl font-black text-[#4A3728] mb-2">Danh mục này hiện chưa có sản phẩm</h3>
                <p className="text-yellow-700/60 font-medium">Vui lòng chọn vị khác hoặc ghé lại sau nhé!</p>
              </div>
            );
          }
          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
              {filteredItems.map((item, index) => (
                <div key={item._id || `item-${index}`} className="group bg-white rounded-[40px] p-6 shadow-xl shadow-yellow-800/5 hover:shadow-2xl transition-all duration-500 border border-yellow-50">
                  <div className="relative aspect-square rounded-[32px] overflow-hidden mb-6 bg-[#FEF9E7]">
                    <img src={item.images.length > 0 ? IMAGE_URL(item.images[0]) : 'https://placehold.co/400x400'} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={item.name} />
                    <div className="absolute top-4 left-4 bg-green-500 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-md">FRESH</div>
                  </div>
                  <div className="px-2">
                    <h3 className="font-black text-2xl mb-2 text-[#4A3728] line-clamp-1">{item.name}</h3>
                    <p className="text-yellow-700/60 text-sm mb-6 line-clamp-2 h-10">{item.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-3xl font-black text-orange-600">{item.price.toLocaleString()}<small className="text-sm font-bold ml-1">đ</small></span>
                      <button onClick={() => addToCart(item)} className="w-14 h-14 bg-green-500 text-white rounded-[20px] flex items-center justify-center hover:bg-green-600 shadow-lg shadow-green-100 transition-all active:scale-90">
                        <Plus size={28} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </main>

      {/* Modal Thanh toán Kiosk (Organic Modal) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#4A3728]/40 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-5xl rounded-3xl md:rounded-[50px] overflow-hidden shadow-3xl flex flex-col md:flex-row h-[90vh] md:h-[85vh] border-4 md:border-8 border-white">
            {qrResponse ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full bg-slate-950 text-white p-8 sm:p-12 flex flex-col items-center justify-center overflow-y-auto"
              >
                <div className="max-w-4xl w-full flex flex-col md:flex-row items-center gap-10 md:gap-16">
                  {/* QR side */}
                  <div className="flex flex-col items-center">
                    <div className="w-56 h-56 sm:w-64 sm:h-64 rounded-3xl bg-white p-4 flex items-center justify-center shrink-0 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                      {(qrResponse.qrCode || qrResponse.qrBase64) ? (
                        <img 
                          src={
                            qrResponse.qrCode
                              ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrResponse.qrCode)}`
                              : (qrResponse.qrBase64?.startsWith('data:') ? qrResponse.qrBase64 : `data:image/png;base64,${qrResponse.qrBase64}`)
                          }
                          className="w-full h-full object-contain" 
                          alt="Mã QR thanh toán" 
                        />
                      ) : (
                        <div className="text-slate-500 text-sm font-black uppercase tracking-widest text-center">
                          Không có QR
                        </div>
                      )}
                    </div>
                    
                    {qrResponse.checkoutUrl && (
                      <a
                        href={qrResponse.checkoutUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-6 w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-orange-500/20 active:scale-95"
                      >
                        <CreditCard size={14} /> Mở trang thanh toán
                      </a>
                    )}

                    <button
                      onClick={() => {
                        const imgSrc = qrResponse.qrCode
                          ? `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(qrResponse.qrCode)}`
                          : (qrResponse.qrBase64?.startsWith('data:') ? qrResponse.qrBase64 : `data:image/png;base64,${qrResponse.qrBase64}`);
                        const link = document.createElement('a');
                        link.href = imgSrc;
                        link.download = `qr-payment-${qrResponse.orderId || 'kiosk'}.png`;
                        link.click();
                      }}
                      className="mt-3 w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                    >
                      <Download size={14} /> Lưu mã QR
                    </button>
                  </div>

                  {/* Text side */}
                  <div className="flex-1 text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-2 mb-4">
                      <div className="h-0.5 w-8 bg-orange-500" />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-400">Thanh toán PayOS</p>
                    </div>
                    
                    <h2 className="text-4xl sm:text-5xl font-black italic mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
                      Quét để <span className="text-orange-500">Đặt hàng</span>
                    </h2>
                    
                    <p className="text-slate-400 font-medium mb-8 leading-relaxed">
                      Vui lòng sử dụng ứng dụng Ngân hàng hoặc Ví điện tử để quét mã QR và hoàn tất thanh toán. 
                      Đơn hàng của bạn sẽ được tự động nhận sau 1-3 giây.
                    </p>

                    <div className="grid grid-cols-1 gap-4 mb-8">
                      <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Số tiền thanh toán</p>
                        <p className="text-3xl font-black text-white">{cart.reduce((s,i) => s + (i.price * i.quantity), 0).toLocaleString()}đ</p>
                      </div>
                      <div className="p-5 rounded-2xl bg-orange-500/10 border border-orange-500/20">
                        <p className="text-[10px] font-black uppercase tracking-widest text-orange-400/70 mb-2">Nội dung chuyển khoản</p>
                        <p className="text-2xl font-black text-orange-500 font-mono tracking-wider">{qrResponse.paymentContent}</p>
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-center gap-4">
                      <div className="flex items-center gap-3 text-emerald-400 bg-emerald-400/5 px-5 py-3 rounded-full border border-emerald-400/20 w-fit">
                        <Loader2 className="animate-spin" size={18} />
                        <span className="text-xs font-black uppercase tracking-[0.15em] animate-pulse">Đang chờ nhận tiền...</span>
                      </div>
                      
                      <button 
                        onClick={() => setQrResponse(null)} 
                        className="text-xs font-bold text-slate-500 underline hover:text-white transition-colors"
                      >
                        Đổi phương thức thanh toán
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <>
                <div className="flex-1 p-6 md:p-12 overflow-y-auto">
                  <div className="flex justify-between items-center mb-8 md:mb-10">
                    <h2 className="text-3xl md:text-4xl font-black text-orange-600">Giỏ hàng tươi</h2>
                    <button onClick={() => setIsModalOpen(false)} className="p-3 bg-yellow-50 rounded-full text-yellow-800"><X/></button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 md:gap-6 mb-8 md:mb-12">
                    <button onClick={() => setOrderType('takeaway')} className={`p-4 md:p-8 rounded-2xl md:rounded-[35px] border-4 transition-all flex flex-col items-center gap-2 md:gap-4 ${orderType === 'takeaway' ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-yellow-50 text-yellow-300'}`}>
                      <Package size={32} className="md:w-10 md:h-10"/> <b className="uppercase tracking-widest text-xs md:text-sm">Mang về</b>
                    </button>
                    <button onClick={() => setOrderType('delivery')} className={`p-4 md:p-8 rounded-2xl md:rounded-[35px] border-4 transition-all flex flex-col items-center gap-2 md:gap-4 ${orderType === 'delivery' ? 'border-green-500 bg-green-50 text-green-600' : 'border-yellow-50 text-yellow-300'}`}>
                      <Truck size={32} className="md:w-10 md:h-10"/> <b className="uppercase tracking-widest text-xs md:text-sm">Giao hàng</b>
                    </button>
                  </div>

                  <div className="space-y-4 md:space-y-6 mb-8 md:mb-12">
                    <input type="text" className="w-full px-6 py-4 md:px-8 md:py-5 bg-[#FEF9E7] border-none rounded-2xl md:rounded-3xl focus:ring-4 focus:ring-orange-200 outline-none font-bold" placeholder="Tên khách hàng thân yêu" onChange={e => setCustomerInfo({...customerInfo, name: e.target.value})} />
                    <input type="tel" className="w-full px-6 py-4 md:px-8 md:py-5 bg-[#FEF9E7] border-none rounded-2xl md:rounded-3xl focus:ring-4 focus:ring-orange-200 outline-none font-bold" placeholder="Số điện thoại liên lạc" onChange={e => setCustomerInfo({...customerInfo, phone: e.target.value})} />
                    {orderType === 'delivery' && <textarea className="w-full px-6 py-4 md:px-8 md:py-5 bg-[#FEF9E7] border-none rounded-2xl md:rounded-3xl focus:ring-4 focus:ring-orange-200 outline-none font-bold" rows={2} placeholder="Địa chỉ giao hàng tận tay..." onChange={e => setCustomerInfo({...customerInfo, deliveryAddress: e.target.value})} />}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => setPaymentMethod('transfer')} className={`p-4 md:p-5 rounded-2xl md:rounded-3xl border-2 transition-all font-bold flex items-center gap-2 md:gap-3 justify-center text-sm md:text-base ${paymentMethod === 'transfer' ? 'border-orange-500 bg-orange-500 text-white' : 'border-yellow-100 text-yellow-800'}`}><CreditCard size={18}/> Chuyển khoản</button>
                    <button onClick={() => setPaymentMethod('cash')} className={`p-4 md:p-5 rounded-2xl md:rounded-3xl border-2 transition-all font-bold flex items-center gap-2 md:gap-3 justify-center text-sm md:text-base ${paymentMethod === 'cash' ? 'border-orange-500 bg-orange-500 text-white' : 'border-yellow-100 text-yellow-800'}`}><Banknote size={18}/> Tiền mặt</button>
                  </div>
                </div>

                <div className="w-full md:w-[400px] bg-[#FEF9E7] p-6 md:p-12 flex flex-col border-t-4 md:border-t-0 md:border-l-4 border-white shrink-0 md:shrink">
                  <h3 className="font-black text-xl md:text-2xl mb-6 md:mb-8 flex items-center gap-3 text-yellow-800"><ShoppingBag/> Tóm tắt</h3>
                  <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
                    {cart.map((item, idx) => (
                      <div key={`${item._id || 'cart'}-${idx}`} className="flex justify-between items-center text-sm">
                        <div className="flex flex-col">
                          <span className="font-black text-[#4A3728]">{item.name}</span>
                          <span className="text-xs font-bold text-orange-400">{item.quantity} x {item.price.toLocaleString()}đ</span>
                        </div>
                        <span className="font-black text-lg">{(item.price * item.quantity).toLocaleString()}đ</span>
                      </div>
                    ))}
                    {cart.length === 0 && <p className="text-center text-yellow-800/30 font-bold py-20 uppercase tracking-widest text-xs">Chưa chọn món nào</p>}
                  </div>
                  <div className="border-t-4 border-white pt-8 mt-8">
                    <div className="flex justify-between text-3xl font-black text-green-600 mb-10 tracking-tighter">
                      <span>Tổng tiền</span>
                      <span>{cart.reduce((s,i) => s + (i.price * i.quantity), 0).toLocaleString()}đ</span>
                    </div>
                    <button 
                      onClick={handleCheckout} 
                      disabled={cart.length === 0}
                      className="w-full py-6 bg-orange-500 text-white font-black rounded-[30px] shadow-3xl shadow-orange-200 uppercase tracking-widest hover:bg-orange-600 transition-all disabled:opacity-30 disabled:grayscale active:scale-95"
                    >
                      ĐẶT HÀNG NGAY
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}