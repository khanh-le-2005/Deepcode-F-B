import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShoppingBag, Trash2, ArrowLeft, Plus, Minus,
    CreditCard, Banknote, Package, Truck, ChevronLeft,
    Trash, Search, Loader2, Leaf, Sparkles,
    ArrowRight, User, MapPin, QrCode, X
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useCart } from '../../contexts/CartContext';
import axios from '@/src/api/axiosClient';
import { Order, OrderItem } from '../../types';

export const CartPage = () => {
    // ==========================================
    // KHU VỰC LOGIC NGHIỆP VỤ - GIỮ NGUYÊN 100%
    // ==========================================
    const navigate = useNavigate();
    const { tableId } = useParams();
    const {
        cart: localCart,
        totalPrice: localTotalPrice,
        totalItems: localTotalItems,
        updateQuantity: updateLocalQuantity,
        removeFromCart: removeLocalFromCart,
        getUniqueCartKey,
        clearCart: clearLocalCart
    } = useCart();

    const [activeSession, setActiveSession] = useState<Order | null>(null);
    const [loading, setLoading] = useState(false);
    const [orderType, setOrderType] = useState<'takeaway' | 'delivery'>('takeaway');
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash');
    const [showCheckoutModal, setShowCheckoutModal] = useState(false);
    const [orderSuccess, setOrderSuccess] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        address: '',
        note: ''
    });

    const formatShortPrice = (price: number) => {
        if (price >= 1000000) {
            return (price / 1000000).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + 'tr';
        }
        return price.toLocaleString('vi-VN') + 'đ';
    };

    const fetchActiveSession = async () => {
        if (!tableId) return;
        setLoading(true);
        try {
            const res = await axios.get(`/api/orders/table/${tableId}/active-session`);
            const isStillActive = res.data && res.data.status !== 'paid' && res.data.status !== 'completed' && res.data.paymentStatus !== 'paid';
            setActiveSession(isStillActive ? res.data : null);
        } catch (error: any) {
            if (error.response?.status === 404) {
                setActiveSession(null);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (tableId) {
            fetchActiveSession();
        }
    }, [tableId]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleBack = () => {
        if (tableId) {
            navigate(`/table/${tableId}/menu`);
        } else {
            navigate('/');
        }
    };

    const handleUpdateQuantity = async (item: OrderItem, delta: number) => {
        if (tableId && activeSession) {
            try {
                await axios.patch(`/api/orders/${activeSession.id || activeSession._id}/item/${item._id || (item as any).menuItemId}/quantity`, {
                    delta,
                });
                await fetchActiveSession();
            } catch (err) {
                console.error("Failed to update table cart item quantity:", err);
                alert("Không thể cập nhật số lượng. Vui lòng thử lại!");
            }
        } else {
            updateLocalQuantity(getUniqueCartKey(item), delta);
        }
    };

    const handleRemoveItem = async (item: OrderItem) => {
        if (tableId && activeSession) {
            try {
                await axios.delete(`/api/orders/${activeSession.id || activeSession._id}/item/${item._id || (item as any).menuItemId}`);
                await fetchActiveSession();
            } catch (err) {
                console.error("Failed to remove item from table cart:", err);
                alert("Không thể xoá món. Vui lòng thử lại!");
            }
        } else {
            removeLocalFromCart(getUniqueCartKey(item));
        }
    };

    const handleCheckout = async () => {
        if (!showCheckoutModal) {
            setShowCheckoutModal(true);
            return;
        }

        if (tableId) {
            if (!activeSession) return;
            setLoading(true);
            try {
                const hasNewItems = activeSession.items.some(i => i.status === 'in_cart');
                if (hasNewItems) {
                    await axios.post(`/api/orders/${activeSession.id || activeSession._id}/checkout`);
                    navigate(`/table/${tableId}/tracking`);
                } else {
                    navigate(`/table/${tableId}/tracking`);
                }
            } catch (error) {
                toast.error("Không thể gửi đơn xuống bếp. Vui lòng thử lại!");
            } finally {
                setLoading(false);
            }
        } else {
            if (!formData.name.trim() || !formData.phone.trim()) {
                toast.error("Vui lòng điền đầy đủ tên và số điện thoại");
                return;
            }
            if (orderType === 'delivery' && !formData.address.trim()) {
                toast.error("Vui lòng điền địa chỉ giao hàng");
                return;
            }

            setLoading(true);
            try {
                const payload = {
                    orderType,
                    paymentMethod,
                    customerInfo: {
                        name: formData.name,
                        phone: formData.phone,
                        deliveryAddress: orderType === 'delivery' ? formData.address : undefined,
                        note: formData.note
                    },
                    frontendUrl: window.location.origin,
                    items: localCart.map(item => ({
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

                if (paymentMethod === 'transfer' && res.data.qrData?.checkoutUrl) {
                    toast.info("Đang chuyển hướng đến cổng thanh toán...");
                    window.location.href = res.data.qrData.checkoutUrl;
                    return;
                } else {
                    clearLocalCart();
                    toast.success("Đặt hàng thành công!");
                    navigate(`/tracking/${res.data._id || res.data.id}`);
                }
            } catch (error: any) {
                toast.error(error.response?.data?.error?.message || "Lỗi khi đặt hàng. Vui lòng thử lại!");
                setLoading(false);
            }
        }
    };

    const displayCart = tableId ? (activeSession?.items || []) : localCart;
    const displayTotalItems = tableId ? displayCart.reduce((sum, item) => sum + item.quantity, 0) : localTotalItems;
    const displayTotalPrice = tableId ? (activeSession?.total ?? displayCart.reduce((sum, item) => sum + (item.quantity * item.basePrice), 0)) : localTotalPrice;

    const newItems = displayCart.filter(i => i.status === 'in_cart');
    const orderedItems = displayCart.filter(i => i.status !== 'in_cart');

    // ==========================================
    // KHU VỰC GIAO DIỆN ĐÃ ĐƯỢC TỐI ƯU MOBILE
    // ==========================================

    if (loading && !activeSession) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFBF7]">
                <Loader2 className="w-10 h-10 md:w-12 md:h-12 text-orange-500 animate-spin mb-4" />
                <p className="font-bold text-orange-800 uppercase tracking-widest text-xs md:text-sm">Đang tải giỏ hàng...</p>
            </div>
        );
    }

    return (
        // Đã tăng padding bottom (pb-32) trên mobile để không bị thanh công cụ che khuất nội dung
        <div className="bg-[#FDFBF7] min-h-screen text-[#333] font-sans pb-32 lg:pb-20">

            {/* Overlay Loading */}
            <AnimatePresence>
                {loading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[9999] bg-white/60 backdrop-blur-md flex flex-col items-center justify-center"
                    >
                        <div className="relative">
                            <div className="w-16 h-16 md:w-20 md:h-20 border-4 border-orange-100 border-t-orange-500 rounded-full animate-spin"></div>
                            <ShoppingBag className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-orange-500" size={24} />
                        </div>
                        <motion.p
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="mt-4 md:mt-6 font-black text-orange-900 uppercase tracking-widest text-xs md:text-sm"
                        >
                            Đang xử lý đơn hàng...
                        </motion.p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header Trang trí nhẹ */}
            <div className="bg-[#F8F2E8] py-6 md:py-12 border-b border-[#F0E6D2] relative overflow-hidden mb-6 md:mb-12">
                <div className="max-w-5xl mx-auto px-4 relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3 md:gap-4">
                        <button
                            onClick={handleBack}
                            className="p-2 md:p-3 bg-white border border-gray-100 shadow-sm hover:bg-orange-50 hover:text-orange-500 rounded-full transition-colors group"
                        >
                            <ChevronLeft size={20} className="md:w-6 md:h-6 group-hover:-translate-x-1 transition-transform" />
                        </button>
                        <div>
                            <h1 className="text-2xl md:text-4xl font-black text-gray-900 uppercase tracking-tighter">
                                {tableId ? `Bàn ${tableId}` : 'Giỏ Hàng'}
                            </h1>
                            <p className="text-[10px] md:text-xs font-bold text-gray-500 flex items-center gap-1 mt-0.5 md:mt-1">
                                <Sparkles size={10} className="md:w-3 md:h-3 text-orange-400" /> Vui lòng kiểm tra lại món
                            </p>
                        </div>
                    </div>
                </div>
                <Leaf className="absolute top-2 right-4 md:right-10 text-orange-500/10 w-16 h-16 md:w-24 md:h-24 rotate-45" />
            </div>

            <div className="max-w-5xl mx-auto px-4 md:px-6">
                {displayCart.length === 0 ? (
                    /* TRẠNG THÁI TRỐNG */
                    <div className="bg-white rounded-[24px] md:rounded-[32px] p-8 md:p-12 text-center shadow-sm border border-gray-100 flex flex-col items-center max-w-2xl mx-auto">
                        <div className="w-16 h-16 md:w-24 md:h-24 bg-orange-50 rounded-full flex items-center justify-center mb-4 md:mb-6">
                            <ShoppingBag className="w-8 h-8 md:w-10 md:h-10 text-orange-400" />
                        </div>
                        <p className="text-xl md:text-2xl font-black text-gray-800 mb-2">Giỏ hàng đang trống</p>
                        <p className="text-xs md:text-sm font-medium text-gray-500 mb-6 md:mb-8">Có vẻ như bạn chưa chọn món ngon nào cho mình.</p>
                        <button
                            onClick={handleBack}
                            className="bg-orange-500 text-white px-6 py-3 md:px-8 md:py-4 rounded-full font-black uppercase tracking-widest text-xs md:text-sm shadow-lg shadow-orange-500/30 hover:bg-orange-600 active:scale-95 transition-all"
                        >
                            Tiếp tục chọn món
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">

                        {/* CỘT TRÁI: DANH SÁCH MÓN & FORM (7/12) */}
                        <div className="lg:col-span-7 space-y-6 md:space-y-8">

                            {/* KHU VỰC: MÓN MỚI CHỌN */}
                            {newItems.length > 0 && (
                                <div className="space-y-3 md:space-y-4">
                                    <div className="flex items-center justify-between px-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-orange-600 bg-orange-50 px-2 py-1 md:px-3 md:py-1 rounded-md border border-orange-100">
                                                Món mới chọn
                                            </h3>
                                            <span className="text-[10px] md:text-xs font-bold text-gray-400">({newItems.length} món)</span>
                                        </div>
                                        {/* Nút Xoá tất cả đưa lên đây cho Mobile dễ bấm */}
                                        {!tableId && (
                                            <button onClick={clearLocalCart} className="text-gray-400 hover:text-red-500 lg:hidden flex items-center gap-1">
                                                <Trash size={14} />
                                            </button>
                                        )}
                                    </div>

                                    <div className="max-h-[550px] overflow-y-auto pr-2 space-y-3 md:space-y-4 custom-scrollbar">
                                        <AnimatePresence>
                                            {newItems.map((item, idx) => (
                                                <motion.div
                                                    key={item._id || `new-${idx}`}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, x: -20 }}
                                                    className="bg-white rounded-[20px] md:rounded-[24px] p-3 md:p-5 shadow-sm border border-gray-100 flex gap-3 md:gap-4 transition-all"
                                                >
                                                    {/* Ảnh món */}
                                                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-[12px] md:rounded-[16px] overflow-hidden shrink-0 bg-[#FEF9E7] border border-yellow-50">
                                                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                                    </div>

                                                    {/* Thông tin */}
                                                    <div className="flex-1 flex flex-col justify-between min-w-0">
                                                        <div>
                                                            <h3 className="font-black text-sm md:text-lg text-gray-900 truncate pr-4">
                                                                {item.name}
                                                            </h3>
                                                            <div className="flex flex-wrap gap-1 mt-1 md:mt-2">
                                                                {item.selectedOption && (
                                                                    <span className="px-1.5 py-0.5 md:px-2 md:py-1 bg-gray-50 text-gray-600 text-[9px] md:text-[10px] font-bold rounded uppercase border border-gray-100">
                                                                        Size: {item.selectedOption.name}
                                                                    </span>
                                                                )}
                                                                {item.selectedAddons?.map((a: any, aIdx: number) => (
                                                                    <span key={aIdx} className="px-1.5 py-0.5 md:px-2 md:py-1 bg-gray-50 text-gray-600 text-[9px] md:text-[10px] font-bold rounded uppercase border border-gray-100">
                                                                        + {a.name}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Giá & Hành động */}
                                                        <div className="flex items-center justify-between mt-2 md:mt-0 pt-2 border-t border-gray-50 sm:border-0 sm:pt-0">

                                                            {/* GIÁ TIỀN: Dùng hàm rút gọn và thêm truncate để chống tràn */}
                                                            <p className="text-orange-600 font-black text-base md:text-lg flex-1 truncate pr-2">
                                                                {formatShortPrice(item.basePrice + (item.selectedOption?.priceExtra || 0))}
                                                            </p>

                                                            {/* KHỐI NÚT BẤM: Thêm shrink-0 để KHÔNG BAO GIỜ bị bóp méo */}
                                                            <div className="flex items-center gap-2 md:gap-3 shrink-0">
                                                                <div className="flex items-center bg-gray-50 rounded-xl border border-gray-200 p-1">
                                                                    <button
                                                                        onClick={() => handleUpdateQuantity(item, -1)}
                                                                        className="w-7 h-7 md:w-10 md:h-10 flex items-center justify-center hover:bg-white hover:text-orange-600 rounded-lg transition-colors font-bold text-gray-600"
                                                                    >
                                                                        <Minus size={14} className="md:w-4 md:h-4" />
                                                                    </button>
                                                                    <span className="w-6 md:w-10 text-center font-black text-sm">{item.quantity}</span>
                                                                    <button
                                                                        onClick={() => handleUpdateQuantity(item, 1)}
                                                                        className="w-7 h-7 md:w-10 md:h-10 flex items-center justify-center hover:bg-white hover:text-orange-600 rounded-lg transition-colors font-bold text-gray-600"
                                                                    >
                                                                        <Plus size={14} className="md:w-4 md:h-4" />
                                                                    </button>
                                                                </div>
                                                                <button
                                                                    onClick={() => handleRemoveItem(item)}
                                                                    className="text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors p-2 rounded-lg flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            )}

                            {/* KHU VỰC: MÓN ĐÃ GỬI BẾP (Bàn) */}
                            {orderedItems.length > 0 && (
                                <div className="space-y-3 md:space-y-4">
                                    <div className="flex items-center gap-3 px-2">
                                        <div className="h-[2px] flex-1 bg-gray-200" />
                                        <h3 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-gray-500 bg-gray-100 px-3 py-1 rounded-md border border-gray-200">
                                            Món đã gửi bếp
                                        </h3>
                                        <div className="h-[2px] flex-1 bg-gray-200" />
                                    </div>
                                    <div className="space-y-2 md:space-y-3 opacity-80">
                                        {orderedItems.map((item, idx) => (
                                            <div key={item._id || `ordered-${idx}`} className="bg-gray-50 rounded-[16px] md:rounded-[20px] p-2.5 md:p-4 flex items-center gap-3 md:gap-4 border border-gray-200">
                                                <div className="w-12 h-12 md:w-16 md:h-16 rounded-[10px] md:rounded-[12px] overflow-hidden shrink-0 bg-gray-200">
                                                    <img src={item.image} className="w-full h-full object-cover mix-blend-multiply opacity-80" alt="" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold text-gray-700 truncate text-xs md:text-sm">{item.name}</h4>
                                                    <p className="text-gray-500 text-[10px] md:text-xs mt-0.5 md:mt-1">SL: <span className="font-bold text-gray-800">{item.quantity}</span></p>
                                                </div>
                                                <span className="px-2 py-0.5 md:px-3 md:py-1 bg-green-100 text-green-700 border border-green-200 rounded-md text-[8px] md:text-[9px] font-black uppercase tracking-widest shrink-0">
                                                    {item.status}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}


                        </div>

                        {/* CỘT PHẢI: BILL TÍNH TIỀN (5/12) */}
                        <div className="lg:col-span-5 fixed bottom-0 left-0 w-full lg:relative lg:w-auto z-[60] lg:z-auto">
                            <div className="bg-white lg:bg-[#FAF7F0] border-t lg:border border-[#F0E6D2] rounded-t-[24px] lg:rounded-[32px] p-4 md:p-6 lg:p-8 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] lg:shadow-xl lg:sticky lg:top-28">

                                {/* SECTION: Thông tin & Nhận hàng / Thanh toán (Moved to Modal) */}

                                {/* Ẩn các chi tiết rườm rà trên Mobile, chỉ hiện trên Desktop */}
                                <div className="hidden lg:block space-y-4 mb-8">
                                    <h2 className="text-lg font-black uppercase text-gray-900 mb-6 flex items-center gap-2 border-b border-[#F0E6D2] pb-4">
                                        <ShoppingBag size={20} className="text-orange-500" /> Tổng cộng
                                    </h2>
                                    <div className="flex justify-between items-center text-gray-500 text-sm font-bold">
                                        <span>Tổng số món</span>
                                        <span className="text-gray-900">{displayTotalItems} món</span>
                                    </div>
                                </div>

                                {/* Khu vực hiển thị Tiền + Nút thanh toán (Mobile hiển thị ngang, Desktop hiển thị dọc) */}
                                <div className="flex flex-row lg:flex-col items-center lg:items-stretch justify-between gap-4 lg:gap-8">

                                    <div className="flex flex-col lg:flex-row lg:justify-between lg:items-end lg:pt-4 lg:border-t border-[#F0E6D2]">
                                        <span className="text-gray-500 uppercase tracking-widest text-[10px] md:text-xs font-bold lg:text-gray-900 lg:mb-1">Thành tiền</span>
                                        <span className="text-xl sm:text-2xl lg:text-3xl font-black text-orange-600 leading-none mt-1 lg:mt-0">
                                            {displayTotalPrice.toLocaleString()}đ
                                        </span>
                                    </div>

                                    <button
                                        onClick={handleCheckout}
                                        disabled={displayCart.length === 0}
                                        className="flex-1 lg:flex-none py-3.5 sm:py-4 lg:py-5 px-6 lg:px-0 bg-orange-500 text-white rounded-[16px] lg:rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-orange-500/20 hover:bg-orange-600 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-40 disabled:grayscale text-xs sm:text-sm lg:text-base"
                                    >
                                        {tableId
                                            ? (newItems.length > 0 ? 'Xác nhận gửi' : 'Xem tiến độ')
                                            : 'Đặt hàng ngay'}
                                        <ArrowRight size={16} className="lg:w-5 lg:h-5" />
                                    </button>
                                </div>

                                {/* Nút xoá sạch giỏ hàng (Chỉ hiện trên Desktop) */}
                                {!tableId && (
                                    <button
                                        onClick={clearLocalCart}
                                        className="hidden lg:flex w-full mt-4 py-3 text-gray-400 hover:text-red-500 transition-colors text-[10px] font-bold uppercase tracking-widest items-center justify-center gap-1"
                                    >
                                        <Trash size={14} /> Xóa sạch giỏ hàng
                                    </button>
                                )}
                            </div>
                        </div>

                    </div>
                )}
            {/* CHECKOUT MODAL: Thông tin khách hàng */}
            <AnimatePresence>
                {showCheckoutModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        {/* Backdrop */}
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }}
                            onClick={() => setShowCheckoutModal(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        
                        {/* Modal Content */}
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white rounded-[28px] w-full max-w-md relative z-10 overflow-hidden shadow-2xl"
                        >
                            {/* Modal Header - Compact */}
                            <div className="bg-orange-500 p-5 md:p-6 text-white relative">
                                <button 
                                    onClick={() => setShowCheckoutModal(false)}
                                    className="absolute top-3 right-3 p-1.5 hover:bg-white/20 rounded-full transition-colors"
                                >
                                    <X size={18} />
                                </button>
                                <h2 className="text-lg md:text-xl font-black uppercase tracking-tight flex items-center gap-2">
                                    <ShoppingBag size={20} /> Xác nhận đơn hàng
                                </h2>
                                <p className="text-orange-100 text-[10px] md:text-xs font-bold mt-0.5 uppercase tracking-widest opacity-80">
                                    Vui lòng nhập thông tin nhận hàng
                                </p>
                            </div>

                            {/* Modal Body - Reduced spacing */}
                            <div className="p-5 md:p-6 space-y-5 md:space-y-6 overflow-y-auto max-h-[60vh] custom-scrollbar text-left">
                                {/* 1. Thông tin cá nhân */}
                                <div className="space-y-3 text-left">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                        <User size={14} className="text-orange-500" /> Thông tin liên hệ
                                    </h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black uppercase text-gray-400 ml-1">Họ tên</label>
                                            <input name="name" value={formData.name} onChange={handleInputChange} placeholder="Tên khách..." className="w-full bg-gray-50 border border-gray-100 focus:border-orange-500 focus:bg-white rounded-xl px-3 py-2 outline-none font-bold text-xs transition-all" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black uppercase text-gray-400 ml-1">Điện thoại</label>
                                            <input name="phone" type="tel" value={formData.phone} onChange={handleInputChange} placeholder="Số điện thoại..." className="w-full bg-gray-50 border border-gray-100 focus:border-orange-500 focus:bg-white rounded-xl px-3 py-2 outline-none font-bold text-xs transition-all" />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black uppercase text-gray-400 ml-1 flex items-center gap-1">
                                            <Sparkles size={10} className="text-orange-400" /> Ghi chú đơn hàng
                                        </label>
                                        <textarea name="note" value={formData.note} onChange={handleInputChange} placeholder="Dặn dò quán..." className="w-full bg-gray-50 border border-gray-100 focus:border-orange-500 focus:bg-white rounded-xl px-3 py-2 outline-none font-bold text-xs transition-all" rows={1} />
                                    </div>
                                </div>

                                {/* 2. Hình thức nhận hàng */}
                                <div className="space-y-3">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                        <Truck size={14} className="text-orange-500" /> Nhận hàng
                                    </h3>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button onClick={() => setOrderType('takeaway')} className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border-2 transition-all font-black uppercase text-[9px] tracking-widest ${orderType === 'takeaway' ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-gray-100 bg-gray-50 text-gray-400'}`}>
                                            Mang về
                                        </button>
                                        <button onClick={() => setOrderType('delivery')} className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border-2 transition-all font-black uppercase text-[9px] tracking-widest ${orderType === 'delivery' ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-gray-100 bg-gray-50 text-gray-400'}`}>
                                            Giao tận nơi
                                        </button>
                                    </div>
                                    <AnimatePresence mode="wait">
                                        {orderType === 'delivery' && (
                                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                                <textarea name="address" value={formData.address} onChange={handleInputChange} placeholder="Địa chỉ giao hàng chi tiết..." className="w-full bg-gray-50 border border-gray-100 focus:border-orange-500 focus:bg-white rounded-xl px-3 py-2 outline-none font-bold text-xs" rows={2} />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* 3. Phương thức thanh toán */}
                                <div className="space-y-3">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                        <CreditCard size={14} className="text-orange-500" /> Thanh toán
                                    </h3>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button onClick={() => setPaymentMethod('cash')} className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border-2 transition-all font-black uppercase text-[9px] tracking-widest ${paymentMethod === 'cash' ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-gray-100 bg-gray-50 text-gray-400'}`}>
                                            Tiền mặt
                                        </button>
                                        <button onClick={() => setPaymentMethod('transfer')} className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border-2 transition-all font-black uppercase text-[9px] tracking-widest ${paymentMethod === 'transfer' ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-gray-100 bg-gray-50 text-gray-400'}`}>
                                            PayOS / CK
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer - Compact */}
                            <div className="p-5 md:p-6 bg-gray-50 border-t border-gray-100 flex flex-col gap-3">
                                <div className="flex justify-between items-center px-1">
                                    <span className="text-gray-500 text-[9px] font-black uppercase tracking-widest">Tổng tiền</span>
                                    <span className="text-xl md:text-2xl font-black text-orange-600">
                                        {displayTotalPrice.toLocaleString()}đ
                                    </span>
                                </div>
                                <button 
                                    onClick={handleCheckout}
                                    disabled={loading}
                                    className="w-full py-3.5 md:py-4 bg-orange-500 text-white rounded-xl font-black uppercase tracking-widest shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 text-xs md:text-sm"
                                >
                                    {loading ? 'Đang xử lý...' : 'Xác nhận đặt hàng'}
                                    {!loading && <ArrowRight size={18} />}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            </div>
        </div>
    );
};

export default CartPage;