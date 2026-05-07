import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ShoppingBag, Trash2, ArrowLeft, Plus, Minus, 
    CreditCard, Banknote, Package, Truck, ChevronLeft,
    Trash, Search, Loader2, Leaf, Sparkles,
    ArrowRight
} from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import axios from '@/src/lib/axiosClient';
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
        if (tableId) {
            if (!activeSession) return;
            try {
                const hasNewItems = activeSession.items.some(i => i.status === 'in_cart');
                if (hasNewItems) {
                    await axios.post(`/api/orders/${activeSession.id || activeSession._id}/checkout`);
                    navigate(`/table/${tableId}/tracking`);
                } else {
                    navigate(`/table/${tableId}/tracking`);
                }
            } catch (error) {
                alert("Không thể gửi đơn xuống bếp. Vui lòng thử lại!");
            }
        } else {
            navigate('/kiosk/checkout');
        }
    };

    const displayCart = tableId ? (activeSession?.items || []) : localCart;
    const displayTotalItems = tableId ? displayCart.reduce((sum, item) => sum + item.quantity, 0) : localTotalItems;
    const displayTotalPrice = tableId ? (activeSession?.total ?? displayCart.reduce((sum, item) => sum + (item.quantity * item.basePrice), 0)) : localTotalPrice;
    
    const newItems = displayCart.filter(i => i.status === 'in_cart');
    const orderedItems = displayCart.filter(i => i.status !== 'in_cart');

    // ==========================================
    // KHU VỰC GIAO DIỆN (UI) ĐÃ ĐƯỢC REDESIGN
    // ==========================================
    
    if (loading && !activeSession) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFBF7]">
                <Loader2 className="w-12 h-12 text-orange-500 animate-spin mb-4" />
                <p className="font-bold text-orange-800 uppercase tracking-widest text-sm">Đang tải giỏ hàng...</p>
            </div>
        );
    }

    return (
        <div className="bg-[#FDFBF7] min-h-screen text-[#333] font-sans pb-20">
            {/* Header Trang trí nhẹ */}
            <div className="bg-[#F8F2E8] py-8 md:py-12 border-b border-[#F0E6D2] relative overflow-hidden mb-8 md:mb-12">
                <div className="max-w-5xl mx-auto px-4 relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={handleBack}
                            className="p-3 bg-white border border-gray-100 shadow-sm hover:bg-orange-50 hover:text-orange-500 rounded-full transition-colors group"
                        >
                            <ChevronLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
                        </button>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black text-gray-900 uppercase tracking-tighter">
                                {tableId ? `Bàn ${tableId}` : 'Giỏ Hàng'}
                            </h1>
                            <p className="text-xs font-bold text-gray-500 flex items-center gap-1 mt-1">
                                <Sparkles size={12} className="text-orange-400"/> Vui lòng kiểm tra lại món ăn
                            </p>
                        </div>
                    </div>
                </div>
                {/* Lá trang trí mờ */}
                <Leaf className="absolute top-2 right-10 text-orange-500/10 w-24 h-24 rotate-45" />
            </div>

            <div className="max-w-5xl mx-auto px-4 md:px-6">
                {displayCart.length === 0 ? (
                    /* TRẠNG THÁI TRỐNG (Empty State) */
                    <div className="bg-white rounded-[32px] p-12 text-center shadow-sm border border-gray-100 flex flex-col items-center max-w-2xl mx-auto">
                        <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center mb-6">
                            <ShoppingBag className="w-10 h-10 text-orange-400" />
                        </div>
                        <p className="text-2xl font-black text-gray-800 mb-2">Giỏ hàng đang trống</p>
                        <p className="text-sm font-medium text-gray-500 mb-8">Có vẻ như bạn chưa chọn món ngon nào cho mình.</p>
                        <button 
                            onClick={handleBack}
                            className="bg-orange-500 text-white px-8 py-4 rounded-full font-black uppercase tracking-widest shadow-lg shadow-orange-500/30 hover:bg-orange-600 hover:scale-105 transition-all active:scale-95"
                        >
                            Tiếp tục chọn món
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        
                        {/* CỘT TRÁI: DANH SÁCH MÓN ĂN */}
                        <div className="lg:col-span-2 space-y-8">
                            
                            {/* KHU VỰC: MÓN MỚI CHỌN */}
                            {newItems.length > 0 && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 px-2">
                                        <div className="h-[2px] flex-1 bg-orange-100" />
                                        <h3 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-orange-600 bg-orange-50 px-3 py-1 rounded-md border border-orange-100">
                                            Món mới chọn
                                        </h3>
                                        <div className="h-[2px] flex-1 bg-orange-100" />
                                    </div>
                                    
                                    <AnimatePresence>
                                        {newItems.map((item, idx) => (
                                            <motion.div 
                                                key={item._id || `new-${idx}`}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, x: -20 }}
                                                className="bg-white rounded-[24px] p-4 md:p-5 shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:items-center gap-4 transition-all hover:shadow-md group"
                                            >
                                                {/* Ảnh món */}
                                                <div className="w-full sm:w-24 h-40 sm:h-24 rounded-[16px] overflow-hidden shrink-0 bg-[#FEF9E7] border border-yellow-50 relative">
                                                    <img 
                                                        src={item.image} 
                                                        alt={item.name} 
                                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                    />
                                                </div>
                                                
                                                {/* Thông tin */}
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-black text-base md:text-lg text-gray-900 truncate">
                                                        {item.name}
                                                    </h3>
                                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                                        {item.selectedOption && (
                                                            <span className="px-2 py-1 bg-gray-50 text-gray-600 text-[10px] font-bold rounded uppercase border border-gray-100">
                                                                Size: {item.selectedOption.name}
                                                            </span>
                                                        )}
                                                        {item.selectedAddons?.map((a: any, aIdx: number) => (
                                                            <span key={aIdx} className="px-2 py-1 bg-gray-50 text-gray-600 text-[10px] font-bold rounded uppercase border border-gray-100">
                                                                + {a.name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <p className="text-orange-600 font-black mt-3 text-lg">
                                                        {(item.basePrice + (item.selectedOption?.priceExtra || 0)).toLocaleString()}đ
                                                    </p>
                                                </div>

                                                {/* Hành động (+ / - / Xóa) */}
                                                <div className="flex sm:flex-col items-center justify-between sm:items-end gap-3 mt-4 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-0 border-gray-50">
                                                    <div className="flex items-center bg-gray-50 rounded-xl border border-gray-200">
                                                        <button 
                                                            onClick={() => handleUpdateQuantity(item, -1)}
                                                            className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center hover:bg-white hover:text-orange-600 rounded-l-xl transition-colors font-bold text-gray-600"
                                                        >
                                                            <Minus size={16} />
                                                        </button>
                                                        <span className="w-8 md:w-10 text-center font-black text-sm">{item.quantity}</span>
                                                        <button 
                                                            onClick={() => handleUpdateQuantity(item, 1)}
                                                            className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center hover:bg-white hover:text-orange-600 rounded-r-xl transition-colors font-bold text-gray-600"
                                                        >
                                                            <Plus size={16} />
                                                        </button>
                                                    </div>
                                                    <button 
                                                        onClick={() => handleRemoveItem(item)}
                                                        className="text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors p-2 rounded-lg flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest"
                                                    >
                                                        <Trash2 size={16} /> <span className="sm:hidden">Xóa</span>
                                                    </button>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            )}

                            {/* KHU VỰC: MÓN ĐÃ GỬI BẾP (Chỉ dành cho Gọi món tại bàn) */}
                            {orderedItems.length > 0 && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 px-2">
                                        <div className="h-[2px] flex-1 bg-gray-200" />
                                        <h3 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-gray-500 bg-gray-100 px-3 py-1 rounded-md border border-gray-200">
                                            Món đã gửi bếp
                                        </h3>
                                        <div className="h-[2px] flex-1 bg-gray-200" />
                                    </div>
                                    <div className="space-y-3 opacity-80">
                                        {orderedItems.map((item, idx) => (
                                            <div 
                                                key={item._id || `ordered-${idx}`}
                                                className="bg-gray-50 rounded-[20px] p-3 md:p-4 flex items-center gap-4 border border-gray-200"
                                            >
                                                <div className="w-16 h-16 rounded-[12px] overflow-hidden shrink-0 bg-gray-200">
                                                    <img src={item.image} className="w-full h-full object-cover mix-blend-multiply opacity-80" alt="" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold text-gray-700 truncate text-sm">{item.name}</h4>
                                                    <p className="text-gray-500 text-xs mt-1">SL: <span className="font-bold text-gray-800">{item.quantity}</span></p>
                                                </div>
                                                <span className="px-3 py-1 bg-green-100 text-green-700 border border-green-200 rounded-md text-[9px] font-black uppercase tracking-widest shrink-0">
                                                    {item.status}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* CỘT PHẢI: BILL TÍNH TIỀN (Summary) */}
                        <div className="lg:col-span-1">
                            <div className="bg-[#FAF7F0] border border-[#F0E6D2] rounded-[32px] p-6 md:p-8 shadow-xl sticky top-28">
                                <h2 className="text-lg font-black uppercase text-gray-900 mb-6 flex items-center gap-2 border-b border-[#F0E6D2] pb-4">
                                    <ShoppingBag size={20} className="text-orange-500"/> Tổng cộng
                                </h2>
                                
                                <div className="space-y-4 mb-8">
                                    <div className="flex justify-between items-center text-gray-500 text-sm font-bold">
                                        <span>Tổng số món</span>
                                        <span className="text-gray-900">{displayTotalItems} món</span>
                                    </div>
                                    <div className="flex justify-between items-end pt-4 border-t border-[#F0E6D2]">
                                        <span className="text-gray-900 uppercase tracking-widest text-xs font-black">Thành tiền</span>
                                        <span className="text-3xl font-black text-orange-600">
                                            {displayTotalPrice.toLocaleString()}đ
                                        </span>
                                    </div>
                                </div>

                                <button 
                                    onClick={handleCheckout}
                                    disabled={displayCart.length === 0}
                                    className="w-full bg-orange-500 text-white py-4 md:py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-orange-500/20 hover:bg-orange-600 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-40 disabled:grayscale"
                                >
                                    {tableId 
                                        ? (newItems.length > 0 ? 'Xác nhận gửi bếp' : 'Xem tiến độ món') 
                                        : 'Đặt hàng'}
                                    <ArrowRight size={18} />
                                </button>

                                {/* Nút xoá sạch giỏ hàng (Chỉ hiện khi mang đi/kiosk) */}
                                {!tableId && (
                                    <button 
                                        onClick={clearLocalCart}
                                        className="w-full mt-4 py-3 text-gray-400 hover:text-red-500 transition-colors text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-1"
                                    >
                                        <Trash size={14} /> Xóa sạch giỏ hàng
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CartPage;