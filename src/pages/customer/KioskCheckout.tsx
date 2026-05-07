import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft, CreditCard, Banknote, Truck,
    ShoppingBag, User, MapPin, CheckCircle2,
    QrCode, ArrowRight, Loader2, Sparkles, ShieldCheck, Copy
} from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import axios from '@/src/lib/axiosClient';
import { toast } from 'react-toastify';

export const KioskCheckout = () => {
    // ==========================================
    // KHU VỰC LOGIC NGHIỆP VỤ - GIỮ NGUYÊN 100%
    // ==========================================
    const navigate = useNavigate();
    const { cart, totalPrice, clearCart, getUniqueCartKey } = useCart();

    const [loading, setLoading] = useState(false);
    const [orderType, setOrderType] = useState<'takeaway' | 'delivery'>('takeaway');
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash');
    const [qrData, setQrData] = useState<{ qrBase64: string; paymentContent: string } | null>(null);
    const [orderSuccess, setOrderSuccess] = useState<any>(null);

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        address: '',
        note: ''
    });

    useEffect(() => {
        let interval: any;
        if (orderSuccess && qrData) {
            interval = setInterval(async () => {
                try {
                    const res = await axios.get(`/api/orders/${orderSuccess._id || orderSuccess.id}/status`);
                    if (res.data && res.data.paymentStatus === 'paid') {
                        clearInterval(interval);
                        clearCart();
                        toast.success("Thanh toán thành công!");
                        navigate(`/tracking/${orderSuccess._id || orderSuccess.id}`);
                    }
                } catch (err) {
                    console.error("Polling error:", err);
                }
            }, 3000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [orderSuccess, qrData, navigate, clearCart]);

    useEffect(() => {
        if (cart.length === 0 && !orderSuccess) {
            navigate('/kiosk');
        }
    }, [cart, navigate, orderSuccess]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmitOrder = async () => {
        if (!formData.name.trim()) return toast.error("Vui lòng nhập tên của bạn");
        if (!formData.phone.trim()) return toast.error("Vui lòng nhập số điện thoại");
        if (orderType === 'delivery' && !formData.address.trim()) return toast.error("Vui lòng nhập địa chỉ giao hàng");

        setLoading(true);
        try {
            const payload = {
                orderType,
                paymentMethod,
                customerInfo: {
                    name: formData.name,
                    phone: formData.phone,
                    deliveryAddress: formData.address,
                    note: formData.note
                },
                items: cart.map(item => ({
                    menuItemId: item.menuItemId,
                    name: item.name,
                    basePrice: item.basePrice,
                    quantity: item.quantity,
                    selectedOption: item.selectedOption,
                    selectedAddons: item.selectedAddons,
                    image: item.image?.replace('/api/images/', '')
                }))
            };

            const res = await axios.post('/api/orders/kiosk', payload);

            if (paymentMethod === 'transfer' && res.data.qrData) {
                setQrData(res.data.qrData);
                setOrderSuccess(res.data);
            } else {
                clearCart();
                toast.success("Đặt hàng thành công!");
                navigate(`/tracking/${res.data._id || res.data.id}`);
            }
        } catch (error: any) {
            console.error("Kiosk Checkout Error:", error);
            const msg = error.response?.data?.error?.message || "Lỗi khi đặt hàng. Vui lòng thử lại!";
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    // ==========================================
    // KHU VỰC GIAO DIỆN ĐÃ ĐƯỢC RESPONSIVE
    // ==========================================

// Màn hình quét QR (Thành công bước 1)
    if (orderSuccess && qrData) {
        return (
            <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-4">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-[32px] md:rounded-[40px] shadow-2xl p-6 md:p-8 max-w-md w-full text-center border border-orange-100 relative"
                >
                    {/* Nút Quay lại nhỏ ở góc trái (Tuỳ chọn thêm) */}
                    <button 
                        onClick={() => {
                            setQrData(null);
                            setOrderSuccess(null);
                        }}
                        className="absolute top-6 left-6 p-2 text-gray-4000 hover:bg-red-500 rounded-full transition-colors cursor-pointer"
                    >
                        <ChevronLeft size={24} />
                    </button>

                    <div className="w-16 h-16 md:w-20 md:h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6 text-green-500 mt-2">
                        <CheckCircle2 size={32} className="md:w-10 md:h-10" />
                    </div>
                    <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-2 uppercase italic" style={{ fontFamily: 'serif' }}>Thanh Toán</h2>
                    <p className="text-gray-500 text-xs md:text-sm mb-6 md:mb-8 font-medium">Vui lòng quét mã QR bên dưới để hoàn tất đơn hàng</p>
                    
                    <div className="bg-gray-50 p-4 md:p-6 rounded-[24px] md:rounded-[32px] mb-6 md:mb-8 border-2 border-dashed border-orange-200">
                        <img 
                            src={qrData.qrBase64.startsWith('http') || qrData.qrBase64.startsWith('data:image') 
                                ? qrData.qrBase64 
                                : `data:image/png;base64,${qrData.qrBase64}`
                            } 
                            alt="Payment QR" 
                            className="w-full aspect-square rounded-xl md:rounded-2xl shadow-sm mb-4" 
                        />
                        
                        <div className="bg-white p-3 md:p-4 rounded-xl md:rounded-2xl border border-gray-100 flex flex-col items-center">
                            <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                                Nội dung chuyển khoản
                            </p>
                            <div className="flex items-center justify-between w-full bg-orange-50/50 p-2 rounded-lg border border-orange-100">
                                <p className="text-sm md:text-base font-black text-orange-600 tracking-tighter break-all text-left flex-1 px-2">
                                    {qrData.paymentContent}
                                </p>
                                <button 
                                    onClick={() => {
                                        navigator.clipboard.writeText(qrData.paymentContent);
                                        toast.success("Đã copy nội dung!");
                                    }}
                                    className="p-2 bg-white text-orange-500 rounded-md shadow-sm border border-orange-200 hover:bg-orange-500 hover:text-white transition-colors shrink-0 active:scale-95"
                                    title="Copy"
                                >
                                    <Copy size={16} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center px-4 py-3 bg-orange-50 rounded-xl md:rounded-2xl text-orange-800 font-bold">
                            <span className="text-sm">Tổng tiền:</span>
                            <span className="text-lg md:text-xl font-black">{totalPrice.toLocaleString()}đ</span>
                        </div>

                        {/* NÚT QUAY LẠI LỚN Ở DƯỚI */}
                        <button 
                            onClick={() => {
                                setQrData(null);
                                setOrderSuccess(null);
                            }}
                            className="w-full py-3 md:py-4 text-gray-500 font-bold text-sm md:text-base rounded-xl md:rounded-2xl hover:bg-gray-50 hover:text-orange-600 transition-colors flex items-center justify-center gap-2"
                        >
                            <ChevronLeft size={18} /> Thay đổi phương thức thanh toán
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    // Màn hình điền thông tin (Checkout)
    return (
        <div className="min-h-screen bg-[#FDFBF7] text-[#1a1a1a] font-sans pb-10 md:pb-20">
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-orange-100">
                <div className="max-w-5xl mx-auto px-4 h-16 md:h-20 flex items-center justify-between">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 md:p-3 hover:bg-red-500 text-gray-600 rounded-xl md:rounded-2xl transition-all cursor-pointer"
                    >
                        <ChevronLeft size={20} className="md:w-6 md:h-6" />
                    </button>
                    <h1 className="text-base md:text-xl font-black uppercase tracking-tighter italic" style={{ fontFamily: 'serif' }}>
                        Xác nhận đơn hàng
                    </h1>
                    <div className="w-10 md:w-12" /> {/* Spacer */}
                </div>
            </div>

            <main className="max-w-5xl mx-auto px-4 mt-6 md:mt-8">
                {/* Đổi sang Grid: 1 cột trên Mobile, 2 cột trên Laptop */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-12">

                    {/* --- CỘT TRÁI: THÔNG TIN KHÁCH HÀNG --- */}
                    <div className="space-y-6 md:space-y-8">

                        {/* Section 1: Thông tin cá nhân */}
                        <section className="bg-white rounded-[24px] md:rounded-[32px] p-5 md:p-8 shadow-sm border border-orange-50">
                            <h2 className="text-base md:text-lg font-black uppercase text-gray-900 mb-4 md:mb-6 flex items-center gap-2 md:gap-3">
                                <User className="text-orange-500" size={18} className="md:w-5 md:h-5" /> Thông tin cá nhân
                            </h2>
                            <div className="space-y-4 md:space-y-5">
                                <div className="relative group">
                                    <label className="text-[9px] md:text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1.5 block ml-1">Họ và tên</label>
                                    <input
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        placeholder="Nhập tên của bạn..."
                                        className="w-full bg-gray-50 border-2 border-transparent focus:border-orange-500 focus:bg-white rounded-xl md:rounded-2xl px-4 py-3 md:px-6 md:py-4 transition-all outline-none font-bold text-sm md:text-base"
                                    />
                                </div>
                                <div className="relative group">
                                    <label className="text-[9px] md:text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1.5 block ml-1">Số điện thoại</label>
                                    <input
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleInputChange}
                                        placeholder="Số điện thoại liên lạc..."
                                        className="w-full bg-gray-50 border-2 border-transparent focus:border-orange-500 focus:bg-white rounded-xl md:rounded-2xl px-4 py-3 md:px-6 md:py-4 transition-all outline-none font-bold text-sm md:text-base"
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Section 2: Nhận hàng */}
                        <section className="bg-white rounded-[24px] md:rounded-[32px] p-5 md:p-8 shadow-sm border border-orange-50">
                            <h2 className="text-base md:text-lg font-black uppercase text-gray-900 mb-4 md:mb-6 flex items-center gap-2 md:gap-3">
                                <Truck className="text-orange-500" size={18} className="md:w-5 md:h-5" /> Hình thức nhận hàng
                            </h2>
                            <div className="grid grid-cols-2 gap-3 md:gap-4">
                                {[
                                    { id: 'takeaway', label: 'Mang về', icon: ShoppingBag },
                                    { id: 'delivery', label: 'Giao hàng', icon: MapPin }
                                ].map((type) => (
                                    <button
                                        key={type.id}
                                        onClick={() => setOrderType(type.id as any)}
                                        className={`flex flex-col items-center gap-2 md:gap-3 p-4 md:p-6 rounded-2xl md:rounded-3xl border-2 transition-all ${orderType === type.id
                                                ? 'border-orange-500 bg-orange-50 text-orange-600'
                                                : 'border-gray-50 bg-gray-50 text-gray-400 hover:border-orange-200'
                                            }`}
                                    >
                                        <type.icon size={24} className="md:w-7 md:h-7" />
                                        <span className="font-black uppercase text-[10px] md:text-xs tracking-widest">{type.label}</span>
                                    </button>
                                ))}
                            </div>

                            <AnimatePresence>
                                {orderType === 'delivery' && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="mt-4 md:mt-6 overflow-hidden"
                                    >
                                        <label className="text-[9px] md:text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1.5 block ml-1">Địa chỉ giao hàng</label>
                                        <textarea
                                            name="address"
                                            value={formData.address}
                                            onChange={handleInputChange}
                                            placeholder="Số nhà, tên đường, khu vực..."
                                            rows={2}
                                            className="w-full bg-gray-50 border-2 border-transparent focus:border-orange-500 focus:bg-white rounded-xl md:rounded-2xl px-4 py-3 md:px-6 md:py-4 transition-all outline-none font-bold text-sm md:text-base"
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </section>

                        {/* Section 3: Thanh toán */}
                        <section className="bg-white rounded-[24px] md:rounded-[32px] p-5 md:p-8 shadow-sm border border-orange-50">
                            <h2 className="text-base md:text-lg font-black uppercase text-gray-900 mb-4 md:mb-6 flex items-center gap-2 md:gap-3">
                                <CreditCard className="text-orange-500" size={18} className="md:w-5 md:h-5" /> Phương thức thanh toán
                            </h2>
                            <div className="space-y-3 md:space-y-4">
                                {[
                                    { id: 'cash', label: 'Tiền mặt', icon: Banknote, desc: 'Thanh toán sau khi nhận' },
                                    { id: 'transfer', label: 'Chuyển khoản QR', icon: QrCode, desc: 'Quét mã VietQR nhanh' }
                                ].map((method) => (
                                    <button
                                        key={method.id}
                                        onClick={() => setPaymentMethod(method.id as any)}
                                        className={`w-full flex items-center gap-3 md:gap-5 p-3 md:p-5 rounded-2xl md:rounded-3xl border-2 transition-all text-left ${paymentMethod === method.id
                                                ? 'border-orange-500 bg-orange-50'
                                                : 'border-gray-50 bg-gray-50 hover:border-orange-200'
                                            }`}
                                    >
                                        <div className={`w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 ${paymentMethod === method.id ? 'bg-orange-500 text-white' : 'bg-white text-gray-400'}`}>
                                            <method.icon size={20} className="md:w-6 md:h-6" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-black uppercase text-[10px] md:text-xs tracking-widest truncate ${paymentMethod === method.id ? 'text-orange-600' : 'text-gray-900'}`}>{method.label}</p>
                                            <p className="text-[9px] md:text-[10px] font-bold text-gray-400 mt-0.5 truncate">{method.desc}</p>
                                        </div>
                                        <div className={`w-5 h-5 md:w-6 md:h-6 rounded-full border-[3px] md:border-4 flex items-center justify-center shrink-0 ${paymentMethod === method.id ? 'border-orange-500' : 'border-gray-200'}`}>
                                            {paymentMethod === method.id && <div className="w-2 h-2 bg-orange-500 rounded-full" />}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* --- CỘT PHẢI: TỔNG KẾT ĐƠN HÀNG --- */}
                    <div className="lg:sticky lg:top-24 h-fit">
                        <section className="bg-gray-900 rounded-[32px] md:rounded-[40px] p-6 md:p-8 text-white shadow-2xl relative overflow-hidden">
                            {/* Trang trí */}
                            <Sparkles className="absolute top-4 right-4 text-orange-500/20 w-8 h-8 md:w-12 md:h-12" />

                            <h2 className="text-lg md:text-xl font-black uppercase tracking-tighter mb-6 md:mb-8 flex items-center gap-2 md:gap-3 border-b border-white/10 pb-4 md:pb-6 italic" style={{ fontFamily: 'serif' }}>
                                Tóm tắt đơn hàng
                            </h2>

                            <div className="max-h-[250px] md:max-h-[300px] overflow-y-auto pr-2 mb-6 md:mb-8 space-y-4 md:space-y-5 custom-scrollbar">
                                {cart.map((item, idx) => (
                                    <div key={getUniqueCartKey(item)} className="flex items-center gap-3 md:gap-4">
                                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl overflow-hidden bg-white/10 shrink-0">
                                            <img src={item.image} className="w-full h-full object-cover" alt="" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-xs md:text-sm truncate">{item.name}</h4>
                                            <p className="text-[10px] md:text-xs text-white/50">x{item.quantity}</p>
                                        </div>
                                        <p className="font-black text-orange-400 text-xs md:text-sm">{(item.basePrice * item.quantity).toLocaleString()}đ</p>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-3 md:space-y-4 border-t border-white/10 pt-5 md:pt-6 mb-6 md:mb-8">
                                <div className="flex justify-between items-center text-white/60 text-[10px] md:text-xs font-bold uppercase tracking-widest">
                                    <span>Tạm tính</span>
                                    <span>{totalPrice.toLocaleString()}đ</span>
                                </div>
                                <div className="flex justify-between items-center text-white/60 text-[10px] md:text-xs font-bold uppercase tracking-widest">
                                    <span>Phí giao hàng</span>
                                    <span>0đ</span>
                                </div>
                                <div className="flex justify-between items-center pt-3 md:pt-4">
                                    <span className="font-black uppercase tracking-tighter text-xs md:text-sm">Tổng cộng</span>
                                    <span className="text-2xl md:text-3xl font-black text-orange-500">{totalPrice.toLocaleString()}đ</span>
                                </div>
                            </div>

                            <button
                                onClick={handleSubmitOrder}
                                disabled={loading}
                                className="w-full bg-orange-500 text-white py-4 md:py-5 rounded-xl md:rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-orange-500/20 hover:bg-orange-600 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 md:gap-3 text-sm disabled:opacity-50 disabled:grayscale"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="animate-spin" size={18} />
                                        Đang xử lý...
                                    </>
                                ) : (
                                    <>
                                        Xác nhận đặt hàng
                                        <ArrowRight size={18} />
                                    </>
                                )}
                            </button>

                            <div className="mt-6 md:mt-8 pt-4 md:pt-6 border-t border-white/10 flex items-center justify-center gap-1.5 md:gap-2 opacity-50">
                                <ShieldCheck size={14} className="md:w-4 md:h-4" />
                                <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest">Thanh toán an toàn 100%</span>
                            </div>
                        </section>
                    </div>

                </div>
            </main>
        </div>
    );
};

export default KioskCheckout;