import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search, MapPin, User, History, Heart, ShoppingBag,
    ShoppingCart, ChevronRight, Truck, Package,
    CreditCard, Banknote, X, Loader2, ArrowRight, Leaf, Sparkles,
    ChevronLeft,
    Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Cấu hình API theo tài liệu ---
const BASE_URL = 'http://localhost:3000/api';
const IMAGE_URL = (id: string) => `${BASE_URL}/images/${id}`;

interface Category { _id: string; name: string; slug: string; }
interface MenuItem { _id: string; name: string; price: number; description: string; images: string[]; categoryId: { _id: string; name: string }; options?: any[]; }
interface CartItem extends MenuItem { quantity: number; selectedOption?: any; }

export default function FreshLemonTeaKiosk() {
    const navigate = useNavigate();
    const [categories, setCategories] = useState<Category[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCatId, setSelectedCatId] = useState<string>('all');
    const [selectedOptionsMap, setSelectedOptionsMap] = useState<Record<string, any>>({});
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItemForDetail, setSelectedItemForDetail] = useState<MenuItem | null>(null);

    // Form Đặt hàng (Mục 7.3)
    const [orderType, setOrderType] = useState<'takeaway' | 'delivery'>('takeaway');
    const [paymentMethod, setPaymentMethod] = useState<'transfer' | 'cash'>('transfer');
    const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', deliveryAddress: '', note: '' });
    const [qrResponse, setQrResponse] = useState<{ qrBase64: string; paymentContent: string; orderId?: string; tableId?: string } | null>(null);
    // --- THÊM PHẦN NÀY DÀNH CHO SLIDER ---
    const [currentSlide, setCurrentSlide] = useState(0);

    // Mảng chứa các slide (Bạn có thể thay đổi link ảnh và nội dung tùy ý)
    const heroSlides = [
        {
            image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?q=80&w=2000&auto=format&fit=crop",
            badge: "100% Trái cây tươi",
            title1: "Trà Chanh",
            titleHighlight: "Giải Nhiệt",
            desc: "Vị chua thanh mát của chanh vàng, hòa quyện cùng mật ong rừng và lá trà thượng hạng."
        },
        {
            image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?q=80&w=2000&auto=format&fit=crop",
            badge: "Best Seller",
            title1: "Trà Đào",
            titleHighlight: "Cam Sả",
            desc: "Đậm đà vị trà đen nguyên bản, kết hợp cùng những lát đào giòn ngọt và cam vàng mọng nước."
        },
        {
            image: "https://images.unsplash.com/photo-1497534446932-c925b458314e?q=80&w=2000&auto=format&fit=crop",
            badge: "Mới ra mắt",
            title1: "Lục Trà",
            titleHighlight: "Dâu Tây",
            desc: "Sự bùng nổ hương vị từ dâu tây Đà Lạt tươi chín mọng cùng lục trà hoa nhài thơm ngát."
        }
    ];

    // Logic tự động chuyển slide sau mỗi 5 giây
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [heroSlides.length]);

    const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    const prevSlide = () => setCurrentSlide((prev) => (prev === 0 ? heroSlides.length - 1 : prev - 1));
    // ----------------------------------------

    // Cập nhật trạng thái thanh toán tự động
    useEffect(() => {
        console.log("QR response changed:", qrResponse);
        if (!qrResponse?.orderId) return;

        console.log("Starting polling for orderId:", qrResponse.orderId);
        const interval = setInterval(async () => {
            try {
                console.log("Fetching status for order:", qrResponse.orderId);
                const res = await fetch(`${BASE_URL}/orders/${qrResponse.orderId}/status`);
                const data = await res.json();
                console.log("Status API response:", data);
                if (data && data.paymentStatus === 'paid') {
                    clearInterval(interval);
                    setQrResponse(null);
                    setCart([]);
                    setIsModalOpen(false);
                    setCustomerInfo({ name: '', phone: '', deliveryAddress: '', note: '' });
                    navigate(`/success?orderId=${qrResponse.orderId}`);
                }
            } catch (err) {
                console.error("Lỗi mạng khi polling status", err);
            }
        }, 3000);
        return () => clearInterval(interval);
    }, [qrResponse]);

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
    const getCartTotal = () => cart.reduce((s, item) => s + ((item.price + (item.selectedOption?.priceExtra || 0)) * item.quantity), 0);

    const addToCart = (item: MenuItem, selectedOption?: any) => {
        setCart(prev => {
            const cartItemId = `${getItemId(item)}${selectedOption ? `-${selectedOption.name}` : ''}`;
            const existingIndex = prev.findIndex(i => {
                const iId = `${getItemId(i)}${i.selectedOption ? `-${i.selectedOption.name}` : ''}`;
                return iId === cartItemId;
            });
            if (existingIndex >= 0) {
                const newCart = [...prev];
                newCart[existingIndex].quantity += 1;
                return newCart;
            }
            return [...prev, { ...item, quantity: 1, selectedOption }];
        });
    };

    const updateQuantity = (cartItemId: string, delta: number) => {
        setCart(prev => prev.map(item => {
            const iId = `${getItemId(item)}${item.selectedOption ? `-${item.selectedOption.name}` : ''}`;
            return iId === cartItemId ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item;
        }));
    };

    const removeFromCart = (cartItemId: string) => {
        setCart(prev => prev.filter(item => {
            const iId = `${getItemId(item)}${item.selectedOption ? `-${item.selectedOption.name}` : ''}`;
            return iId !== cartItemId;
        }));
    };

    const handleCheckout = async () => {
        const payload = {
            orderType, paymentMethod, customerInfo,
            items: cart.map(item => ({ 
                menuItemId: getItemId(item), 
                name: item.selectedOption ? `${item.name} (${item.selectedOption.name})` : item.name, 
                basePrice: item.price + (item.selectedOption?.priceExtra || 0), 
                quantity: item.quantity,
                selectedOption: item.selectedOption
            }))
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
                    console.log("Setting QR Response with orderId:", actualOrderId, "tableId:", actualTableId);
                    setQrResponse({ ...result.qrData, orderId: actualOrderId, tableId: actualTableId });
                } else {
                    setCart([]);
                    setIsModalOpen(false);
                    if (actualOrderId) navigate(`/success?orderId=${actualOrderId}`);
                }
            }
        } catch (err) { alert("Lỗi gửi đơn."); }
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
            <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-yellow-100 shadow-sm">
                {/* TOP BANNER (Thanh thông báo nhỏ xíu ở trên cùng) */}
                <div className="max-w-7xl mx-auto px-4 md:px-6 h-20 md:h-24 flex items-center justify-between gap-2 md:gap-8">

                    {/* 1. LOGO TRÁI */}
                    <div className="flex items-center gap-3 shrink-0 cursor-pointer group">
                        <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl rotate-6 flex items-center justify-center shadow-xl shadow-orange-200 group-hover:rotate-12 transition-all duration-300">
                            <Leaf className="text-white drop-shadow-md" size={28} />
                        </div>
                        <div className="hidden sm:block">
                            <h1 className="text-lg md:text-2xl font-black tracking-tighter text-orange-600">BTEC TEA</h1>
                            <p className="text-[8px] md:text-[10px] font-bold text-green-600 uppercase tracking-widest flex items-center gap-1">
                                <Sparkles size={10} /> Natural & Healthy
                            </p>
                        </div>
                    </div>

                    {/* 2. THANH TÌM KIẾM Ở GIỮA (Lấp đầy khoảng trống) */}
                    <div className="flex flex-1 max-w-xl relative group mx-2">
                        <div className="absolute inset-y-0 left-0 pl-3 md:pl-4 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 md:h-5 md:w-5 text-orange-400 group-focus-within:text-orange-600 transition-colors" />
                        </div>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="block w-full pl-9 md:pl-12 pr-10 md:pr-24 py-2 md:py-3 bg-orange-50/50 border-2 border-transparent rounded-full font-bold text-[10px] md:text-sm text-[#4A3728] placeholder-orange-300 focus:bg-white focus:border-orange-300 focus:ring-4 focus:ring-orange-100 transition-all outline-none"
                            placeholder="Tìm kiếm..."
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-10 md:right-20 top-1/2 -translate-y-1/2 p-1 text-orange-300 hover:text-orange-500 transition-colors"
                            >
                                <X size={14} className="md:w-[18px] md:h-[18px]" />
                            </button>
                        )}
                        <button
                            onClick={() => setSearchTerm(searchTerm)}
                            className="absolute inset-y-1 md:inset-y-1.5 right-1 md:right-1.5 bg-orange-500 hover:bg-orange-600 text-white px-3 md:px-5 rounded-full font-bold text-[10px] md:text-xs transition-colors shadow-md flex items-center justify-center"
                        >
                            <span className="hidden md:inline">Tìm</span>
                            <Search className="md:hidden h-3 w-3" />
                        </button>
                    </div>

                    {/* 3. CÁC NÚT HÀNH ĐỘNG BÊN PHẢI */}
                    <div className="flex items-center gap-4 md:gap-6 shrink-0">

                        {/* Cụm Thông tin (Ẩn trên mobile) */}
                        <div className="hidden xl:flex items-center gap-6 border-r border-yellow-200 pr-6 mr-2">
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Địa chỉ</span>
                                <div className="flex items-center gap-1 text-sm font-bold text-orange-600 cursor-pointer">
                                    <MapPin size={16} />
                                    <span className="truncate max-w-[150px]">Số 13 Trịnh Văn Bô, HN</span>
                                </div>
                            </div>
                        </div>

                        {/* Nút Giỏ Hàng (To và nổi bật nhất) */}
                        <button onClick={() => setIsModalOpen(true)} className="relative p-3.5 md:p-4 bg-orange-500 text-white rounded-2xl hover:bg-orange-600 shadow-xl shadow-orange-200 transition-all active:scale-95 group">
                            <ShoppingBag size={24} className="group-hover:animate-bounce" />
                            {cart.length > 0 && (
                                <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-black w-6 h-6 flex items-center justify-center rounded-full border-4 border-white shadow-sm">
                                    {cart.reduce((s, i) => s + i.quantity, 0)}
                                </span>
                            )}
                        </button>
                    </div>

                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-10">
                {/* Banner Tươi Mát */}
                <section className="relative w-full h-[550px] rounded-[60px] overflow-hidden mb-16 shadow-3xl group">
                    {heroSlides.map((slide, index) => (
                        <div
                            key={index}
                            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentSlide ? "opacity-100 z-10" : "opacity-0 z-0"
                                }`}
                        >
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent z-10" />
                            <img
                                src={slide.image}
                                alt={slide.title1}
                                className={`absolute inset-0 w-full h-full object-cover transition-transform duration-[6000ms] ${index === currentSlide ? "scale-105" : "scale-100"}`}
                            />

                            <div className="relative z-20 h-full flex flex-col justify-end p-10 md:p-16 text-white max-w-3xl">
                                <div className={`flex items-center gap-2 bg-green-500 w-fit px-5 py-2 rounded-full text-xs font-black mb-6 uppercase tracking-widest shadow-lg transition-all duration-700 delay-100 ${index === currentSlide ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
                                    <Sparkles size={14} /> {slide.badge}
                                </div>

                                <h2 className={`text-6xl md:text-8xl font-black mb-6 leading-none tracking-tight transition-all duration-700 delay-200 ${index === currentSlide ? "translate-x-0 opacity-100" : "-translate-x-10 opacity-0"}`}>
                                    {slide.title1} <br />
                                    <span className="text-yellow-400 underline decoration-yellow-400/50">{slide.titleHighlight}</span>
                                </h2>

                                <p className={`text-lg md:text-2xl opacity-90 mb-10 max-w-2xl font-medium transition-all duration-700 delay-300 ${index === currentSlide ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
                                    {slide.desc}
                                </p>
                            </div>
                        </div>
                    ))}

                    <button
                        onClick={prevSlide}
                        className="absolute left-6 top-1/2 -translate-y-1/2 z-30 w-14 h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/30 opacity-0 group-hover:opacity-100 transition-all hover:bg-orange-500 hover:border-orange-500 active:scale-90"
                    >
                        <ChevronLeft size={32} />
                    </button>

                    <button
                        onClick={nextSlide}
                        className="absolute right-6 top-1/2 -translate-y-1/2 z-30 w-14 h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/30 opacity-0 group-hover:opacity-100 transition-all hover:bg-orange-500 hover:border-orange-500 active:scale-90"
                    >
                        <ChevronRight size={32} />
                    </button>

                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3">
                        {heroSlides.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentSlide(idx)}
                                className={`transition-all duration-300 rounded-full ${idx === currentSlide
                                    ? "w-10 h-3 bg-orange-500 shadow-lg shadow-orange-500/50"
                                    : "w-3 h-3 bg-white/50 hover:bg-white"
                                    }`}
                            />
                        ))}
                    </div>
                </section>

                {/* Danh mục dạng Viên thuốc (Pills) */}
                <div className="flex items-center gap-4 mb-12 overflow-x-auto no-scrollbar py-2">
                    <button
                        key="cat-all"
                        onClick={() => setSelectedCatId('all')}
                        className={`px-10 py-4 rounded-full text-sm font-black uppercase tracking-widest transition-all duration-300 focus:outline-none ${selectedCatId === 'all'
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
                                className={`px-10 py-4 rounded-full text-sm font-black uppercase tracking-widest transition-all duration-300 focus:outline-none ${selectedCatId === currentId
                                    ? 'bg-orange-500 text-white shadow-xl shadow-orange-200 scale-105'
                                    : 'bg-white text-yellow-800 hover:bg-yellow-50 shadow-sm border border-yellow-100'
                                    }`}
                            >
                                {cat.name}
                            </button>
                        );
                    })}
                </div>

                {/* Grid Sản phẩm */}
                {(() => {
                    const filteredItems = menuItems.filter(item => {
                        const matchesCategory = selectedCatId === 'all' || (() => {
                            const itemCatId = item.categoryId?._id || (item.categoryId as any)?.id || (typeof item.categoryId === 'string' ? item.categoryId : null);
                            return itemCatId === selectedCatId;
                        })();
                        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
                        return matchesCategory && matchesSearch;
                    });
                    if (filteredItems.length === 0) {
                        return (
                            <div className="py-20 flex flex-col items-center justify-center text-center w-full">
                                <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mb-6">
                                    <Search className="text-yellow-500" size={40} />
                                </div>
                                <h3 className="text-2xl font-black text-[#4A3728] mb-2">
                                    {searchTerm ? `Không tìm thấy sản phẩm "${searchTerm}"` : 'Danh mục này hiện chưa có sản phẩm'}
                                </h3>
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="mt-6 px-8 py-3 bg-orange-500 text-white font-bold rounded-full shadow-lg hover:bg-orange-600 transition-all"
                                >
                                    Xóa tìm kiếm
                                </button>
                            </div>
                        );
                    }
                    return (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
                            {filteredItems.map((item, index) => (
                                <div key={item._id || `item-${index}`} className="group bg-white rounded-[40px] p-6 shadow-xl shadow-yellow-800/5 hover:shadow-2xl transition-all duration-500 border border-yellow-50 flex flex-col justify-between">
                                    <div>
                                        <div className="relative aspect-square rounded-[32px] overflow-hidden mb-6 bg-[#FEF9E7] cursor-pointer" onClick={() => setSelectedItemForDetail(item)}>
                                            <img src={item.images.length > 0 ? IMAGE_URL(item.images[0]) : 'https://placehold.co/400x400'} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={item.name} />
                                            <div className="absolute top-4 left-4 bg-green-500 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-md">FRESH</div>
                                        </div>
                                        <div className="px-2">
                                            <h3 className="font-black text-2xl mb-2 text-[#4A3728] line-clamp-1 cursor-pointer hover:text-orange-500 transition-colors" onClick={() => setSelectedItemForDetail(item)}>{item.name}</h3>
                                            <p className="text-yellow-700/60 text-sm mb-4 line-clamp-2 h-10">{item.description}</p>
                                        </div>
                                    </div>
                                    <div className="px-2 flex flex-col gap-3">
                                        {item.options && item.options.length > 0 && (
                                            <div className="flex flex-wrap justify-center gap-2 mb-2">
                                                {item.options.map(opt => {
                                                    const isSelected = selectedOptionsMap[getItemId(item)]?.name === opt.name;
                                                    return (
                                                        <button 
                                                            key={opt.name} 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedOptionsMap(prev => ({
                                                                    ...prev,
                                                                    [getItemId(item)]: prev[getItemId(item)]?.name === opt.name ? null : opt
                                                                }));
                                                            }}
                                                            className={`px-3 py-1.5 rounded-full text-[12px] font-black uppercase tracking-tighter transition-all border-2 flex items-center justify-center ${isSelected ? 'bg-orange-500 border-orange-500 text-white shadow-md' : 'bg-white border-yellow-100 text-yellow-800 hover:border-orange-300'}`}
                                                        >
                                                            {opt.name} {opt.priceExtra > 0 && `(+${opt.priceExtra.toLocaleString()}đ)`}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        )}
                                        {(() => {
                                            const selectedOption = selectedOptionsMap[getItemId(item)];
                                            const displayPrice = item.price + (selectedOption?.priceExtra || 0);
                                            return (
                                                <>
                                                    <span className="text-3xl font-black text-orange-600 text-center block">{displayPrice.toLocaleString()}<small className="text-sm font-bold ml-1">đ</small></span>
                                                    <button onClick={() => addToCart(item, selectedOption)} className="h-14 bg-green-500 text-white rounded-[20px] flex items-center justify-center hover:bg-green-600 shadow-lg shadow-green-100 transition-all active:scale-90 w-full mt-2">
                                                        <ShoppingCart size={28} className="flex items-center" />
                                                        <span className="text-sm font-bold uppercase tracking-widest ml-2">Đặt ngay</span>
                                                    </button>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    );
                })()}
            </main>
            {/* =========================================
              FLOATING CART BUTTON (NÚT GIỎ HÀNG NỔI) 
              ========================================= */}
            <AnimatePresence>
                {cart.length > 0 && !isModalOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 50, scale: 0.8 }}
                        className="fixed bottom-8 right-6 md:bottom-10 md:right-10 z-50"
                    >
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="group flex items-center bg-orange-500 text-white rounded-full p-2 pr-6 shadow-2xl shadow-orange-500/40 hover:bg-orange-600 transition-all active:scale-95 border-4 border-white"
                        >
                            {/* Vùng icon có hiệu ứng rung nhẹ (wiggle/bounce) */}
                            <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center relative">
                                <ShoppingBag size={24} className="text-orange-500 group-hover:scale-110 transition-transform" />
                                {/* Badge số lượng món */}
                                <span className="absolute -top-1 -right-1 bg-green-500 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                                    {cart.length}
                                </span>
                            </div>

                            {/* Vùng text hiển thị tổng tiền */}
                            <div className="ml-4 flex flex-col items-start">
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Xem Giỏ Hàng</span>
                                <span className="text-lg font-black tracking-tight leading-none">
                                    {getCartTotal().toLocaleString()}đ
                                </span>
                            </div>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modal Thanh toán Kiosk (Organic Modal) */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-[#4A3728]/40 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>
                    <div className="relative bg-white w-full max-w-5xl rounded-[50px] overflow-hidden shadow-3xl flex flex-col md:flex-row h-[85vh] border-8 border-white">
                        {qrResponse ? (
                            <div className="w-full p-16 text-center flex flex-col items-center justify-center bg-[#FEF9E7]">
                                <h2 className="text-4xl font-black mb-4 text-green-600">Thanh toán ngay!</h2>
                                <img src={`data:image/png;base64,${qrResponse.qrBase64}`} className="w-72 h-72 shadow-2xl rounded-3xl mb-8 border-8 border-white" alt="QR" />
                                <div className="bg-orange-500 text-white px-8 py-4 rounded-2xl mb-10">
                                    <p className="text-xs font-bold uppercase tracking-widest mb-1">Nội dung chuyển khoản</p>
                                    <p className="text-3xl font-black font-mono">{qrResponse.paymentContent}</p>
                                </div>
                                <div className="flex flex-col items-center gap-3">
                                    <Loader2 className="animate-spin text-green-600 mb-2" size={36} />
                                    <p className="text-green-700 font-bold animate-pulse tracking-widest uppercase text-sm">Hệ thống đang chờ nhận tiền...</p>
                                    <button onClick={() => setQrResponse(null)} className="text-sm font-bold text-yellow-800/60 underline hover:text-yellow-800 mt-2">Đổi phương thức thanh toán</button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="flex-1 p-12 overflow-y-auto">
                                    <div className="flex justify-between items-center mb-10">
                                        <h2 className="text-4xl font-black text-orange-600">Giỏ hàng tươi</h2>
                                        <button onClick={() => setIsModalOpen(false)} className="p-3 bg-yellow-50 rounded-full text-yellow-800"><X /></button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6 mb-12">
                                        <button onClick={() => setOrderType('takeaway')} className={`p-8 rounded-[35px] border-4 transition-all flex flex-col items-center gap-4 ${orderType === 'takeaway' ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-yellow-50 text-yellow-300'}`}>
                                            <Package size={40} /> <b className="uppercase tracking-widest text-sm">Mang về</b>
                                        </button>
                                        <button onClick={() => setOrderType('delivery')} className={`p-8 rounded-[35px] border-4 transition-all flex flex-col items-center gap-4 ${orderType === 'delivery' ? 'border-green-500 bg-green-50 text-green-600' : 'border-yellow-50 text-yellow-300'}`}>
                                            <Truck size={40} /> <b className="uppercase tracking-widest text-sm">Giao hàng</b>
                                        </button>
                                    </div>

                                    <div className="space-y-6 mb-12">
                                        <input type="text" className="w-full px-8 py-5 bg-[#FEF9E7] border-none rounded-3xl focus:ring-4 focus:ring-orange-200 outline-none font-bold" placeholder="Tên khách hàng thân yêu" onChange={e => setCustomerInfo({ ...customerInfo, name: e.target.value })} />
                                        <input type="tel" className="w-full px-8 py-5 bg-[#FEF9E7] border-none rounded-3xl focus:ring-4 focus:ring-orange-200 outline-none font-bold" placeholder="Số điện thoại liên lạc" onChange={e => setCustomerInfo({ ...customerInfo, phone: e.target.value })} />
                                        {orderType === 'delivery' && <textarea className="w-full px-8 py-5 bg-[#FEF9E7] border-none rounded-3xl focus:ring-4 focus:ring-orange-200 outline-none font-bold" rows={2} placeholder="Địa chỉ giao hàng tận tay..." onChange={e => setCustomerInfo({ ...customerInfo, deliveryAddress: e.target.value })} />}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <button onClick={() => setPaymentMethod('transfer')} className={`p-5 rounded-3xl border-2 transition-all font-bold flex items-center gap-3 justify-center ${paymentMethod === 'transfer' ? 'border-orange-500 bg-orange-500 text-white' : 'border-yellow-100 text-yellow-800'}`}><CreditCard size={18} /> Chuyển khoản</button>
                                        <button onClick={() => setPaymentMethod('cash')} className={`p-5 rounded-3xl border-2 transition-all font-bold flex items-center gap-3 justify-center ${paymentMethod === 'cash' ? 'border-orange-500 bg-orange-500 text-white' : 'border-yellow-100 text-yellow-800'}`}><Banknote size={18} /> Tiền mặt</button>
                                    </div>
                                </div>

                                <div className="w-full md:w-[400px] bg-[#FEF9E7] p-12 flex flex-col border-l-4 border-white">
                                    <h3 className="font-black text-2xl mb-8 flex items-center gap-3 text-yellow-800"><ShoppingBag /> Tóm tắt</h3>
                                    <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
                                        {cart.map((item, idx) => {
                                            const cartItemId = `${getItemId(item)}${item.selectedOption ? `-${item.selectedOption.name}` : ''}`;
                                            return (
                                                <div key={`${cartItemId}-${idx}`} className="bg-white p-5 rounded-3xl shadow-sm border border-yellow-100 flex items-center gap-4 transition-all hover:shadow-md">
                                                    {/* Image + Price Container */}
                                                    <div className="flex flex-col items-center gap-1.5 shrink-0">
                                                        <div className="w-16 h-16 rounded-2xl overflow-hidden bg-yellow-50 border border-yellow-100">
                                                            <img
                                                                src={item.images.length > 0 ? IMAGE_URL(item.images[0]) : 'https://placehold.co/100x100'}
                                                                className="w-full h-full object-cover"
                                                                alt={item.name}
                                                            />
                                                        </div>
                                                        <p className="text-[10px] font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded-lg border border-orange-100 text-center">
                                                            {(item.price + (item.selectedOption?.priceExtra || 0)).toLocaleString()}đ
                                                        </p>
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-black text-sm text-[#4A3728] truncate">{item.name}</h4>
                                                        {item.selectedOption && (
                                                            <p className="text-[10px] text-orange-600 font-bold uppercase tracking-widest mt-0.5">• Size {item.selectedOption.name}</p>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center bg-orange-50 rounded-2xl p-1 border border-orange-100 shrink-0">
                                                        <button
                                                            onClick={() => updateQuantity(cartItemId, -1)}
                                                            className="w-8 h-8 flex items-center justify-center text-orange-600 hover:bg-white rounded-xl transition-all font-black"
                                                        >
                                                            -
                                                        </button>
                                                        <span className="w-8 text-center font-black text-sm text-[#4A3728]">{item.quantity}</span>
                                                        <button
                                                            onClick={() => updateQuantity(cartItemId, 1)}
                                                            className="w-8 h-8 flex items-center justify-center text-orange-600 hover:bg-white rounded-xl transition-all font-black"
                                                        >
                                                            +
                                                        </button>
                                                    </div>

                                                    <button
                                                        onClick={() => removeFromCart(cartItemId)}
                                                        className="p-3 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                        {cart.length === 0 && <p className="text-center text-yellow-800/30 font-bold py-20 uppercase tracking-widest text-xs">Chưa chọn món nào</p>}
                                    </div>
                                    <div className="border-t-4 border-white pt-8 mt-8">
                                        <div className="flex justify-between text-3xl font-black text-green-600 mb-10 tracking-tighter">
                                            <span>Tổng tiền</span>
                                            <span>{getCartTotal().toLocaleString()}đ</span>
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

            {/* Modal Chi Tiết Sản Phẩm */}
            <AnimatePresence>
                {selectedItemForDetail && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] flex items-center justify-center p-4"
                    >
                        <div className="absolute inset-0 bg-[#4A3728]/60 backdrop-blur-sm" onClick={() => setSelectedItemForDetail(null)}></div>
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative bg-white w-full max-w-4xl rounded-[50px] overflow-hidden shadow-3xl flex flex-col md:flex-row max-h-[90vh] border-8 border-white"
                        >
                            <button onClick={() => setSelectedItemForDetail(null)} className="absolute top-6 right-6 z-10 p-3 bg-yellow-50 hover:bg-yellow-100 rounded-full text-yellow-800 transition-all"><X size={24} /></button>
                            
                            <div className="w-full md:w-1/2 h-[300px] md:h-auto bg-[#FEF9E7] relative">
                                <img src={selectedItemForDetail.images?.length > 0 ? IMAGE_URL(selectedItemForDetail.images[0]) : 'https://placehold.co/600x600'} className="w-full h-full object-cover" alt="" />
                                <div className="absolute top-6 left-6 bg-green-500 text-white text-xs font-black px-4 py-2 rounded-full shadow-md tracking-wider">FRESH 100%</div>
                            </div>
                            
                            <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-white overflow-y-auto">
                                <h3 className="text-4xl font-black text-[#4A3728] mb-4 leading-tight">{selectedItemForDetail.name}</h3>
                                <p className="text-yellow-700/70 text-base mb-10 leading-relaxed max-w-sm">
                                    {selectedItemForDetail.description || "Hương vị thơm ngon, tươi mát đặc trưng, giải nhiệt mùa hè."}
                                </p>
                                
                                <div className="w-full mb-10">
                                    {/* Component lựa chọn Size tái sử dụng state chung */}
                                    {selectedItemForDetail.options && selectedItemForDetail.options.length > 0 && (
                                        <>
                                            <h4 className="font-black text-sm text-yellow-800 uppercase tracking-widest mb-4">Tùy chọn Kích Cỡ</h4>
                                            <div className="flex flex-wrap gap-3">
                                                {selectedItemForDetail.options.map(opt => {
                                                    const isSelected = selectedOptionsMap[getItemId(selectedItemForDetail)]?.name === opt.name;
                                                    return (
                                                        <button 
                                                            key={opt.name} 
                                                            onClick={() => {
                                                                setSelectedOptionsMap(prev => ({
                                                                    ...prev,
                                                                    [getItemId(selectedItemForDetail)]: prev[getItemId(selectedItemForDetail)]?.name === opt.name ? null : opt
                                                                }));
                                                            }}
                                                            className={`px-5 py-4 rounded-3xl text-sm font-black uppercase tracking-widest transition-all border-4 flex flex-col items-center justify-center min-w-[110px] ${isSelected ? 'bg-orange-500 border-orange-500 text-white shadow-xl shadow-orange-200 scale-105' : 'bg-white border-yellow-50 text-yellow-800 hover:border-orange-200'}`}
                                                        >
                                                            <span className="mb-1 text-lg">{opt.name}</span>
                                                            <span className="text-[10px] opacity-80">{opt.priceExtra > 0 ? `+${opt.priceExtra.toLocaleString()}đ` : 'Mặc định'}</span>
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </>
                                    )}
                                </div>
                                
                                {(() => {
                                    const selectedOption = selectedOptionsMap[getItemId(selectedItemForDetail)];
                                    const displayPrice = selectedItemForDetail.price + (selectedOption?.priceExtra || 0);
                                    return (
                                        <div className="mt-auto w-full pt-6 border-t-2 border-yellow-50 flex items-center justify-between gap-6">
                                            <div className="flex flex-col text-orange-600">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-yellow-600/70 mb-1">Thành tiền</span>
                                                <span className="text-4xl font-black tracking-tighter leading-none">{displayPrice.toLocaleString()}<small className="text-lg ml-1">đ</small></span>
                                            </div>
                                            
                                            <button 
                                                onClick={() => {
                                                    addToCart(selectedItemForDetail, selectedOption);
                                                    setSelectedItemForDetail(null);
                                                }} 
                                                className="flex-1 py-5 bg-green-500 text-white font-black rounded-3xl shadow-2xl shadow-green-200 hover:bg-green-600 transition-all active:scale-95 flex items-center justify-center gap-3 text-lg"
                                            >
                                                <ShoppingCart size={24} />
                                                CHỌN MÓN
                                            </button>
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
}


