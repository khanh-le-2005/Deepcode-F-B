import React, { useState, useEffect } from 'react';
import { 
  Search, MapPin, User, History, Heart, ShoppingBag, 
  Plus, ChevronRight, Truck, Package, 
  CreditCard, Banknote, X, Loader2, AlertCircle, ArrowRight
} from 'lucide-react';

// --- Cấu hình API theo tài liệu ---
const BASE_URL = 'http://localhost:3000/api';
const IMAGE_URL = (id: string) => `${BASE_URL}/images/${id}`;

// Ảnh Banner dự phòng nếu bạn chưa có ảnh trên server (chủ đề Orange/Summer)
const HERO_IMAGE = "https://images.unsplash.com/photo-1543253331-c006626607e4?q=80&w=2000&auto=format&fit=crop";

interface Category { _id: string; name: string; slug: string; image: string; }
interface MenuItem { _id: string; name: string; price: number; description: string; images: string[]; categoryId: { _id: string; name: string }; }
interface CartItem extends MenuItem { quantity: number; }

export default function OrangeDrinkKiosk() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form Đặt hàng (Mục 7.3)
  const [orderType, setOrderType] = useState<'takeaway' | 'delivery'>('takeaway');
  const [paymentMethod, setPaymentMethod] = useState<'transfer' | 'cash'>('transfer');
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', deliveryAddress: '', note: '' });
  const [qrResponse, setQrResponse] = useState<{ qrBase64: string; paymentContent: string } | null>(null);

  useEffect(() => {
    const initData = async () => {
      try {
        setLoading(true);
        const [catRes, menuRes] = await Promise.all([
          fetch(`${BASE_URL}/categories`),
          fetch(`${BASE_URL}/weekly-menu/active`)
        ]);
        
        const catData = await catRes.json();
        setCategories(catData);

        const menuData = await menuRes.json();
        if (menuData && menuData.menuItems) {
          setMenuItems(menuData.menuItems);
        } else {
          const allMenuRes = await fetch(`${BASE_URL}/menu`);
          setMenuItems(await allMenuRes.json());
        }
      } catch (err) {
        setError("Lỗi kết nối API. Vui lòng kiểm tra server.");
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i._id === item._id);
      if (existing) return prev.map(i => i._id === item._id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleCheckout = async () => {
    const payload = { orderType, paymentMethod, customerInfo, 
      items: cart.map(item => ({ menuItemId: item._id, name: item.name, basePrice: item.price, quantity: item.quantity })) 
    };
    try {
      const res = await fetch(`${BASE_URL}/orders/kiosk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (res.ok) {
        if (paymentMethod === 'transfer' && result.qrData) setQrResponse(result.qrData);
        else { alert("Đặt đơn thành công!"); setCart([]); setIsModalOpen(false); }
      }
    } catch (err) { alert("Lỗi gửi đơn hàng."); }
  };

  if (loading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-orange-50">
      <Loader2 className="animate-spin text-orange-500 mb-4" size={48} />
      <p className="font-bold text-orange-600">Đang chuẩn bị menu...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FFFBF7]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-orange-100 px-4">
        <div className="max-w-7xl mx-auto h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-200">
              <ShoppingBag className="text-white" size={22} />
            </div>
            <span className="text-2xl font-black text-orange-600 tracking-tighter">ORANGE DRINK</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden lg:flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-full text-sm font-medium text-gray-500">
              <MapPin size={16} className="text-orange-500" /> 22/1 HCM City
            </div>
            <button onClick={() => setIsModalOpen(true)} className="relative p-3 bg-orange-500 text-white rounded-2xl hover:bg-orange-600 shadow-lg shadow-orange-100 transition-all">
              <ShoppingBag size={22} />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-white text-orange-600 text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-orange-500">
                  {cart.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* --- HERO SECTION (BANNER) --- */}
        <section className="relative w-full h-[500px] rounded-[48px] overflow-hidden mb-12 shadow-2xl">
          {/* Image Overlay/Gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/20 to-transparent z-10" />
          
          {/* Main Hero Image */}
          <img 
            src={HERO_IMAGE} 
            alt="Orange Fresh Drink" 
            className="absolute inset-0 w-full h-full object-cover object-center scale-105 hover:scale-100 transition-transform duration-[2s]"
          />

          {/* Content */}
          <div className="relative z-20 h-full flex flex-col justify-center px-12 md:px-20 max-w-3xl text-white">
            <div className="flex items-center gap-2 bg-orange-500/90 w-fit px-4 py-1.5 rounded-full text-xs font-bold mb-6 tracking-widest uppercase">
              <span className="animate-pulse">●</span> Menu Tuần Mới
            </div>
            <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">
              Sảng Khoái <br /> 
              <span className="text-orange-400">Từng Giọt Cam</span>
            </h1>
            <p className="text-lg md:text-xl opacity-90 mb-10 leading-relaxed font-medium">
              Khởi đầu ngày mới năng động với công thức pha chế độc quyền từ những quả cam mọng nước nhất. Giảm ngay 20% cho đơn hàng đầu tiên.
            </p>
            <div className="flex flex-wrap gap-4">
              <button className="px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-2xl transition-all shadow-xl shadow-orange-500/40 flex items-center gap-2 group">
                ĐẶT MÓN NGAY <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="px-8 py-4 bg-white/10 backdrop-blur-md hover:bg-white/20 text-white font-bold rounded-2xl border border-white/30 transition-all">
                Xem Khuyến Mãi
              </button>
            </div>
          </div>
        </section>

        {/* Categories Bar */}
        <div className="flex gap-4 overflow-x-auto pb-6 mb-10 no-scrollbar">
          <button 
            onClick={() => setSelectedCat('all')}
            className={`px-8 py-3.5 rounded-2xl whitespace-nowrap font-bold transition-all ${selectedCat === 'all' ? 'bg-orange-500 text-white shadow-xl shadow-orange-200' : 'bg-white text-slate-500 hover:bg-orange-50'}`}
          >
            Tất cả menu
          </button>
          {categories.map((cat) => (
            <button 
              key={cat._id} 
              onClick={() => setSelectedCat(cat._id)}
              className={`px-8 py-3.5 rounded-2xl whitespace-nowrap font-bold transition-all flex items-center gap-2 ${selectedCat === cat._id ? 'bg-orange-500 text-white shadow-xl shadow-orange-200' : 'bg-white text-slate-500 hover:bg-orange-50'}`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {menuItems
            .filter(item => selectedCat === 'all' || item.categoryId?._id === selectedCat)
            .map(item => (
              <div key={item._id} className="group bg-white rounded-[32px] p-4 shadow-sm hover:shadow-2xl transition-all border border-transparent hover:border-orange-100">
                <div className="relative h-56 rounded-[24px] overflow-hidden mb-5">
                  <img src={item.images.length > 0 ? IMAGE_URL(item.images[0]) : 'https://placehold.co/400x400'} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={item.name} />
                  <button className="absolute top-3 right-3 p-2.5 bg-white/90 backdrop-blur rounded-xl text-slate-400 hover:text-red-500 shadow-sm"><Heart size={18} /></button>
                </div>
                <div className="px-2">
                  <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">{item.categoryId?.name}</span>
                  <h3 className="font-extrabold text-xl mb-2 line-clamp-1">{item.name}</h3>
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-2xl font-black text-slate-900">{item.price.toLocaleString()}<small className="text-sm">đ</small></span>
                    <button onClick={() => addToCart(item)} className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center hover:bg-orange-500 transition-all active:scale-90"><Plus size={24} /></button>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </main>

      {/* Checkout Modal (Section 7.3) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-4xl rounded-[40px] overflow-hidden shadow-2xl flex flex-col md:flex-row h-[85vh]">
            {qrResponse ? (
               <div className="w-full p-12 text-center flex flex-col items-center justify-center">
                 <h2 className="text-3xl font-black mb-2 text-orange-600">Thanh toán Chuyển khoản</h2>
                 <img src={`data:image/png;base64,${qrResponse.qrBase64}`} className="w-64 h-64 shadow-xl rounded-2xl mb-6" alt="QR" />
                 <div className="bg-slate-100 p-4 rounded-2xl w-full max-w-xs mb-8">
                   <p className="text-xs text-slate-400 uppercase font-bold mb-1">Nội dung chuyển khoản</p>
                   <p className="text-xl font-mono font-black text-orange-600">{qrResponse.paymentContent}</p>
                 </div>
                 <button onClick={() => {setQrResponse(null); setCart([]); setIsModalOpen(false);}} className="px-12 py-4 bg-slate-900 text-white font-bold rounded-2xl">Hoàn tất</button>
               </div>
            ) : (
              <>
                <div className="flex-1 p-8 md:p-12 overflow-y-auto">
                  <h2 className="text-3xl font-black mb-8">Xác nhận đơn hàng</h2>
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <button onClick={() => setOrderType('takeaway')} className={`flex flex-col items-center gap-2 p-4 rounded-3xl border-2 transition-all ${orderType === 'takeaway' ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-slate-100'}`}><Package/><b>Mang đi</b></button>
                    <button onClick={() => setOrderType('delivery')} className={`flex flex-col items-center gap-2 p-4 rounded-3xl border-2 transition-all ${orderType === 'delivery' ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-slate-100'}`}><Truck/><b>Giao tận nơi</b></button>
                  </div>
                  <div className="space-y-4 mb-8">
                    <input type="text" className="w-full px-6 py-4 bg-slate-50 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Tên của bạn" onChange={e => setCustomerInfo({...customerInfo, name: e.target.value})} />
                    <input type="tel" className="w-full px-6 py-4 bg-slate-50 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Số điện thoại" onChange={e => setCustomerInfo({...customerInfo, phone: e.target.value})} />
                    {orderType === 'delivery' && <textarea className="w-full px-6 py-4 bg-slate-50 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Địa chỉ giao hàng" onChange={e => setCustomerInfo({...customerInfo, deliveryAddress: e.target.value})} />}
                  </div>
                  <h3 className="font-bold mb-4">Phương thức thanh toán</h3>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl cursor-pointer">
                      <div className="flex items-center gap-3"><CreditCard className="text-orange-500"/><span>Chuyển khoản (MBBank)</span></div>
                      <input type="radio" checked={paymentMethod === 'transfer'} onChange={() => setPaymentMethod('transfer')} className="accent-orange-500 w-5 h-5" />
                    </label>
                    <label className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl cursor-pointer">
                      <div className="flex items-center gap-3"><Banknote className="text-orange-500"/><span>Tiền mặt</span></div>
                      <input type="radio" checked={paymentMethod === 'cash'} onChange={() => setPaymentMethod('cash')} className="accent-orange-500 w-5 h-5" />
                    </label>
                  </div>
                </div>
                <div className="w-full md:w-[360px] bg-slate-50 p-8 flex flex-col border-l border-slate-100">
                  <h3 className="font-black text-xl mb-6">Giỏ hàng</h3>
                  <div className="flex-1 overflow-y-auto space-y-4">
                    {cart.map(item => (
                      <div key={item._id} className="flex justify-between items-center text-sm">
                        <span className="font-bold">{item.quantity}x <span className="font-medium text-slate-500">{item.name}</span></span>
                        <span className="font-black">{(item.price * item.quantity).toLocaleString()}đ</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t pt-6 mt-6">
                    <div className="flex justify-between text-2xl font-black text-orange-600 mb-8"><span>Tổng:</span><span>{totalPrice.toLocaleString()}đ</span></div>
                    <button onClick={handleCheckout} disabled={cart.length === 0} className="w-full py-5 bg-orange-500 text-white font-black rounded-3xl shadow-xl shadow-orange-200 uppercase tracking-widest active:scale-95 transition-all disabled:bg-slate-300">Đặt hàng ngay</button>
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