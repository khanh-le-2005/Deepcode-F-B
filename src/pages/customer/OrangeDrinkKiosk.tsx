import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search, MapPin, User, Heart, ShoppingBag,
    ShoppingCart, ChevronRight, Truck,
    X, Loader2, Leaf, Sparkles, Star,
    Plus, ArrowRight,
    CheckCircle2,
    Minus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';
import { Autoplay, Pagination, Navigation } from 'swiper/modules';
import Footer from '@/src/components/ui/Footer';
import { toast } from 'react-toastify';
import { useCart } from '../../contexts/CartContext';
import axiosClient from '../../api/axiosClient';

// --- Cấu hình API động ---
const BASE_URL = `${axiosClient.defaults.baseURL ?? ""}/api`;
const IMAGE_URL = (id: string) => `${BASE_URL}/images/${id}`;

interface Category { _id: string; name: string; slug: string; }
interface MenuItem { _id: string; name: string; price: number; description: string; images: string[]; categoryId: { _id: string; name: string }; options?: any[]; addons?: any[]; }
interface CartItem extends MenuItem { quantity: number; selectedOption?: any; selectedAddons?: any[]; }

export default function SummerMenuKiosk() {
    const navigate = useNavigate();

    // ==========================================
    // KHU VỰC LOGIC NGHIỆP VỤ - GIỮ NGUYÊN 100%
    // ==========================================
    const {
        cart,
        addToCart: addToGlobalCart,
        clearCart: clearGlobalCart,
        totalPrice: globalTotalPrice,
        totalItems: globalTotalItems
    } = useCart();

    const [categories, setCategories] = useState<Category[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [combos, setCombos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCatId, setSelectedCatId] = useState<string>('all');
    const [selectedOptionsMap, setSelectedOptionsMap] = useState<Record<string, any>>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItemForDetail, setSelectedItemForDetail] = useState<MenuItem | null>(null);
    const [selectedComboForDetail, setSelectedComboForDetail] = useState<any | null>(null);
    const [selectedAddons, setSelectedAddons] = useState<any[]>([]);
    const [detailQuantity, setDetailQuantity] = useState(1);
    const [itemNote, setItemNote] = useState('');

    const [qrResponse, setQrResponse] = useState<{ qrBase64: string; paymentContent: string; orderId?: string; tableId?: string } | null>(null);
    const [currentSlide, setCurrentSlide] = useState(0);

    const [isHeaderSearchOpen, setIsHeaderSearchOpen] = useState(false);
    const headerSearchRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isHeaderSearchOpen && headerSearchRef.current) {
            headerSearchRef.current.focus();
        }
    }, [isHeaderSearchOpen]);

    // --- 6 SLIDE ĐƯỢC VIẾT DỰA TRÊN MENU THỰC TẾ CỦA "CHOÉN CHOÉN" ---
    const heroSlides = [
        {
            image: "https://i.postimg.cc/nrfFKJfz/ca612985-1b78-4b29-8467-fcb8c101b262.png", // Gắn link ảnh Trà Chanh của bạn vào đây
            badge: "Chỉ từ 12k",
            title1: "Trà Chanh",
            titleHighlight: "Tươi Mát",
            desc: "Trà chanh truyền thống chua chua ngọt ngọt, đánh bay cái nóng mùa hè tức thì chỉ với 12 cành."
        },
        {
            image: "https://i.postimg.cc/NFvs8cv0/22883c10-4f4f-427c-babf-05ce0adbbd55.png", // Gắn link ảnh Trà Tắc Xí Muội vào đây
            badge: "Đậm vị",
            title1: "Trà Tắc",
            titleHighlight: "Xí Muội",
            desc: "Sự kết hợp hoàn hảo giữa vị chua thơm của tắc tươi và vị mặn ngọt cuốn hút của xí muội."
        },
        {
            image: "https://i.postimg.cc/nrfFKJfM/96d81be4-8310-408d-82e1-ca5b3e75fc82.png", // Gắn link ảnh Trà Hoa Quả vào đây
            badge: "Best Seller",
            title1: "Trà",
            titleHighlight: "Hoa Quả",
            desc: "Tươi rói 100% với trái cây nhiệt đới cắt lát mix cùng trà thơm dịu, detox thanh lọc cơ thể."
        },
        {
            image: "https://i.postimg.cc/sfW1Mndn/59a3f43f-477a-4aad-912a-44605a88ed63.png", // Gắn link ảnh Trà Mãng Cầu vào đây
            badge: "Hot Trend",
            title1: "Trà",
            titleHighlight: "Mãng Cầu",
            desc: "Thịt mãng cầu tươi dầm dẻo chua ngọt, kết hợp nước cốt trà đậm đà tạo nên thức uống vạn người mê."
        },
        {
            image: "https://i.postimg.cc/L5F9kpF8/541e1e3d-2335-4636-9903-45ef4218c07d.png", // Gắn link ảnh Nước ép dứa vào đây
            badge: "Healthy",
            title1: "Nước Ép",
            titleHighlight: "Dứa Tươi",
            desc: "Ép nguyên chất 100% từ dứa tươi mọng nước, giàu Vitamin C, giúp giữ dáng đẹp da."
        },
        {
            image: "https://i.postimg.cc/XNsDbXpd/6b01c079-0b56-4d70-a370-14a54b66e4f2.png", // Gắn link ảnh Nước ép Dưa hấu vào đây
            badge: "Thanh mát",
            title1: "Nước Ép",
            titleHighlight: "Dưa Hấu",
            desc: "Vị ngọt thanh mát lạnh từ dưa hấu đỏ chín mọng, giải khát cực đã cho ngày hè oi bức."
        }
    ];

    // Cập nhật lại Banner Slides tương ứng với 6 ảnh trên
    // const bannerSlides = [
    //     { image: "https://i.postimg.cc/sfW1Mndn/59a3f43f-477a-4aad-912a-44605a88ed63.png" },
    //     { image: "https://i.postimg.cc/NFvs8cv0/22883c10-4f4f-427c-babf-05ce0adbbd55.png" },
    //     { image: "https://i.postimg.cc/2j6R78jG/c333a43e-36f4-4f4b-886b-2441b3922cd8.png" },
    //     { image: "https://i.postimg.cc/L5F9kpF8/541e1e3d-2335-4636-9903-45ef4218c07d.png" },
    //     { image: "https://i.postimg.cc/nrfFKJfM/96d81be4-8310-408d-82e1-ca5b3e75fc82.png" },
    //     { image: "https://i.postimg.cc/nrfFKJfz/ca612985-1b78-4b29-8467-fcb8c101b262.png" },
    // ];

    useEffect(() => {
        const timer = setInterval(() => setCurrentSlide((prev) => (prev + 1) % heroSlides.length), 5000);
        return () => clearInterval(timer);
    }, [heroSlides.length]);

    useEffect(() => {
        if (!qrResponse?.orderId) return;
        const interval = setInterval(async () => {
            try {
                const res = await axiosClient.get(`/api/orders/${qrResponse.orderId}/status`);
                const data = res.data;
                if (data && data.paymentStatus === 'paid') {
                    clearInterval(interval);
                    setQrResponse(null);
                    clearGlobalCart();
                    navigate(`/success?orderId=${qrResponse.orderId}`);
                }
            } catch (err) { console.error(err); }
        }, 3000);
        return () => clearInterval(interval);
    }, [qrResponse, navigate]);

    useEffect(() => {
        if (selectedItemForDetail) {
            setSelectedAddons([]);
            setDetailQuantity(1);
            setItemNote('');
        }
    }, [selectedItemForDetail]);

    useEffect(() => {
        if (selectedComboForDetail) {
            setDetailQuantity(1);
            setItemNote('');
        }
    }, [selectedComboForDetail]);

    useEffect(() => {
        const initData = async () => {
            try {
                setLoading(true);
                const [catRes, menuRes, comboRes] = await Promise.all([
                    axiosClient.get('/api/categories'),
                    axiosClient.get('/api/weekly-menu/active'),
                    axiosClient.get('/api/combos')
                ]);
                const catData = catRes.data;
                setCategories(catData || []);
                const menuData = menuRes.data;
                const comboData = comboRes.data;
                setCombos((comboData || []).filter((c: any) => c.status !== 'unavailable'));

                let items = [];
                if (menuData && menuData.menuItems) {
                    items = menuData.menuItems;
                } else {
                    const allMenuRes = await axiosClient.get('/api/menu');
                    items = allMenuRes.data;
                }

                setMenuItems(items);

                // Tự động chọn Size đầu tiên cho tất cả món
                const defaultOptions: Record<string, any> = {};
                items.forEach((item: any) => {
                    if (item.options && item.options.length > 0) {
                        defaultOptions[getItemId(item)] = item.options[0];
                    }
                });
                setSelectedOptionsMap(defaultOptions);

            } catch (err) { console.error("Lỗi API"); } finally { setLoading(false); }
        };
        initData();
    }, []);

    const getItemId = (item: any) => item._id || item.id;

    const [flyingItems, setFlyingItems] = useState<{ id: number, image: string, start: { x: number, y: number } }[]>([]);
    const cartRef = useRef<HTMLButtonElement>(null);

    const triggerFlyAnimation = (e: React.MouseEvent, image: string) => {
        const startX = e.clientX;
        const startY = e.clientY;
        const id = Date.now();
        setFlyingItems(prev => [...prev, { id, image, start: { x: startX, y: startY } }]);
        setTimeout(() => {
            setFlyingItems(prev => prev.filter(item => item.id !== id));
        }, 800);
    };

    const addToCart = (e: React.MouseEvent, item: MenuItem, selectedOption?: any, addons: any[] = [], quantity: number = 1, note: string = '') => {
        e.stopPropagation();
        const imageUrl = item.images?.length > 0 ? IMAGE_URL(item.images[0]) : 'https://placehold.co/400';
        triggerFlyAnimation(e, imageUrl);

        addToGlobalCart({
            menuItemId: getItemId(item),
            name: item.name,
            basePrice: item.price,
            quantity: quantity,
            totalPrice: (item.price + (selectedOption?.priceExtra || 0) + addons.reduce((sum, a) => sum + (a.price || 0), 0)) * quantity,
            selectedOption: selectedOption ? {
                name: selectedOption.name,
                priceExtra: selectedOption.priceExtra
            } : undefined,
            selectedAddons: addons.map(a => ({
                name: a.name,
                priceExtra: a.price || 0
            })),
            status: 'in_cart',
            image: imageUrl,
            category: item.categoryId?.name || 'Món ngon',
            note: note
        });
    };

    const addComboToCart = (e: React.MouseEvent, combo: any, quantity: number = 1, note: string = '') => {
        e.stopPropagation();
        const imageUrl = combo.image ? IMAGE_URL(combo.image) : (combo.menuItemIds?.[0]?.images?.length > 0 ? IMAGE_URL(combo.menuItemIds[0].images[0]) : 'https://placehold.co/400');
        triggerFlyAnimation(e, imageUrl);

        addToGlobalCart({
            menuItemId: combo._id || combo.id,
            name: combo.name,
            basePrice: combo.price,
            quantity: quantity,
            totalPrice: combo.price * quantity,
            status: 'in_cart',
            image: imageUrl,
            category: 'Combo ưu đãi',
            isCombo: true,
            note: note
        });
    };

    const categoryCounts = React.useMemo(() => {
        const counts: Record<string, number> = {};
        menuItems.forEach(item => {
            const catId = String((item.categoryId as any)?._id || (item.categoryId as any)?.id || item.categoryId || "");
            counts[catId] = (counts[catId] || 0) + 1;
        });
        return counts;
    }, [menuItems]);

    const filteredItems = React.useMemo(() => {
        return menuItems.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
            if (selectedCatId === 'all') return matchesSearch;

            const itemCatId = String(
                (item.categoryId as any)?._id ||
                (item.categoryId as any)?.id ||
                (typeof item.categoryId === 'string' ? item.categoryId : "")
            );
            return itemCatId === selectedCatId && matchesSearch;
        });
    }, [menuItems, selectedCatId, searchTerm]);

    const filteredCombos = React.useMemo(() => {
        if (selectedCatId !== 'combos' && selectedCatId !== 'all') return [];
        return combos.filter(combo => combo.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [combos, selectedCatId, searchTerm]);

    // ==========================================
    // KHU VỰC GIAO DIỆN (UI) ĐÃ ĐƯỢC LÀM SẠCH TỐI ƯU
    // ==========================================

    if (loading) return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-[#FDF9F1]">
            <div className="relative w-20 h-20 mb-6">
                <div className="absolute inset-0 border-4 border-orange-200 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-orange-500 rounded-full border-t-transparent animate-spin"></div>
                <Leaf className="absolute inset-0 m-auto text-orange-500 animate-pulse" size={24} />
            </div>
            <p className="font-bold text-orange-800 tracking-widest uppercase text-sm">Đang chuẩn bị Menu...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#FAF0E6] text-[#2C1810] font-sans">

            {/* FLYING ITEMS ANIMATION */}
            <div className="fixed inset-0 pointer-events-none z-[999]">
                <AnimatePresence>
                    {flyingItems.map(item => (
                        <motion.div
                            key={item.id}
                            initial={{ x: item.start.x - 20, y: item.start.y - 20, scale: 1, opacity: 1 }}
                            animate={{ x: window.innerWidth - 60, y: window.innerHeight - 60, scale: 0.1, opacity: 0.2 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.8, ease: [0.42, 0, 0.58, 1] }}
                            className="fixed w-12 h-12 rounded-full overflow-hidden border-2 border-orange-500 shadow-2xl bg-white z-[9999]"
                        >
                            <img src={item.image} className="w-full h-full object-cover" alt="" />
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* --- HEADER --- */}
            <header className="bg-white/90 backdrop-blur-xl sticky top-0 z-40 shadow-sm border-b border-gray-100">
                <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[10px] md:text-xs py-2 px-4 flex justify-center md:justify-between items-center font-bold">
                    <span className="flex items-center gap-2"><Truck size={14} /> FREESHIP CHO ĐƠN TỪ 200K!</span>
                    <div className="hidden md:flex items-center gap-4">
                        <span className="flex items-center gap-1 hover:text-orange-100 cursor-pointer"><User size={12} /> Tài khoản</span>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 md:h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setSelectedCatId('all'); setSearchTerm(''); }}>
                        <div className="w-10 h-10 bg-orange-500 rounded-xl rotate-3 flex items-center justify-center text-white shadow-md">
                            <Leaf size={22} />
                        </div>
                        <div>
                            <h1 className="text-xl md:text-2xl font-black tracking-tighter text-orange-600 leading-none">BTEC<span className="text-amber-500">TEA</span></h1>
                            <p className="text-[8px] md:text-[10px] font-bold text-emerald-600 uppercase tracking-widest mt-0.5 flex items-center gap-1"><Sparkles size={10} /> Tươi Mát Mỗi Ngày</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Thanh tìm kiếm mở rộng (Desktop) */}
                        <div className="hidden md:flex items-center justify-end transition-all duration-300 ease-in-out">
                            {isHeaderSearchOpen ? (
                                <div className="flex items-center bg-gray-50 rounded-full px-4 py-1.5 border border-gray-200 w-64 shadow-inner animate-in fade-in zoom-in-95 duration-200">
                                    <Search size={18} className="text-gray-400 mr-2 shrink-0" />
                                    <input
                                        ref={headerSearchRef}
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Tìm tên món..."
                                        className="bg-transparent border-none outline-none text-sm font-semibold text-gray-800 w-full placeholder-gray-400"
                                    />
                                    <button onClick={() => { setIsHeaderSearchOpen(false); setSearchTerm(''); }} className="text-gray-400 hover:text-orange-500 ml-2 shrink-0 transition-colors"><X size={16} /></button>
                                </div>
                            ) : (
                                <button onClick={() => setIsHeaderSearchOpen(true)} className="p-2.5 bg-gray-50 text-gray-600 hover:text-orange-500 hover:bg-orange-50 rounded-full transition-all">
                                    <Search size={20} />
                                </button>
                            )}
                        </div>
                        {/* <button onClick={() => navigate('/cart')} className="relative p-2.5 bg-gray-50 text-gray-600 hover:text-orange-500 hover:bg-orange-50 rounded-full transition-colors lg:hidden">
                            <ShoppingBag size={20} />
                            {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-sm">{globalTotalItems}</span>}
                        </button> */}
                        <button onClick={() => navigate('/cart')} className="hidden lg:flex bg-orange-500 text-white px-6 py-2.5 rounded-full text-sm font-bold items-center gap-2 hover:bg-orange-600 transition-all shadow-md active:scale-95">
                            <ShoppingCart size={18} /> ĐẶT HÀNG NGAY
                        </button>
                    </div>
                </div>
            </header>

            {/* --- HERO BANNER (Đã phục hồi nội dung CTA) --- */}
            <div className=" mx-auto px-4 md:px-6 mt-4 md:mt-6 mb-6 md:mb-10">
                <div className="w-full relative rounded-[24px] md:rounded-[32px] overflow-hidden shadow-lg border border-gray-100">
                    <Swiper
                        spaceBetween={0}
                        centeredSlides={true}
                        autoplay={{ delay: 4000, disableOnInteraction: false }}
                        pagination={{ clickable: true }}
                        modules={[Autoplay, Pagination]}
                        className="mySwiper w-full aspect-[16/9] md:aspect-[21/7] bg-[#FFF]"
                    >
                        {heroSlides.map((slide, index) => (
                            <SwiperSlide key={index}>
                                <div className="w-full h-full relative group bg-gray-100"> {/* Thêm bg-gray-100 làm nền tạm */}
                                    <img
                                        src={slide.image}
                                        alt={slide.title1}
                                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                        loading={index === 0 ? "eager" : "lazy"} // Ảnh đầu tiên tải ngay, các ảnh sau tải dần
                                        // @ts-ignore
                                        fetchPriority={index === 0 ? "high" : "low"} // Ưu tiên cao nhất cho ảnh đầu tiên
                                    />
                                    {/* Lớp phủ đen nhẹ để làm nổi chữ */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />

                                    <div className="absolute inset-0 flex flex-col justify-center px-8 md:px-16 text-white max-w-2xl">
                                        <span className="bg-orange-500 w-fit px-3 py-1 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-widest mb-3 md:mb-4">
                                            {slide.badge}
                                        </span>
                                        <h2 className="text-3xl md:text-5xl font-black mb-2 md:mb-4 leading-tight">
                                            {slide.title1} <span className="text-yellow-400">{slide.titleHighlight}</span>
                                        </h2>
                                        <p className="text-sm md:text-base text-gray-200 mb-6 line-clamp-2 md:line-clamp-none max-w-md">
                                            {slide.desc}
                                        </p>
                                        <button className="w-fit bg-white text-orange-600 px-6 py-2 md:px-8 md:py-3 rounded-full font-bold text-sm hover:bg-orange-50 transition-colors flex items-center gap-2">
                                            Khám phá <ArrowRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            </SwiperSlide>
                        ))}
                    </Swiper>
                    <style>{`
                        .swiper-pagination-bullet { background: white; opacity: 0.5; width: 6px; height: 6px; transition: all 0.3s; }
                        .swiper-pagination-bullet-active { background: #f97316; opacity: 1; width: 20px; border-radius: 4px; }
                    `}</style>
                </div>
            </div>

            {/* --- MAIN LAYOUT --- */}
            <main className="max-w-7xl mx-auto px-4 md:px-6 flex flex-col lg:flex-row gap-6 md:gap-8 pb-24">

                {/* === LEFT SIDEBAR (ĐÃ FIX UX CHO MOBILE) === */}
                <aside className="w-full lg:w-1/4 shrink-0 lg:sticky lg:top-24 h-fit z-10">

                    {/* Ô Tìm Kiếm (Luôn hiển thị) */}
                    <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex items-center relative group mb-4 lg:mb-6 mt-5">
                        <div className="pl-3 text-gray-400 group-focus-within:text-orange-500 transition-colors"><Search size={18} /></div>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Bạn muốn uống gì?"
                            className="w-full pl-3 pr-4 py-2.5 bg-transparent border-none text-sm font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-0"
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="absolute right-3 text-gray-400 hover:text-orange-500"><X size={16} /></button>
                        )}
                    </div>

                    {/* Danh Mục (Mobile: Cuộn ngang | Desktop: Cột dọc) */}
                    <div className="bg-transparent lg:bg-white lg:p-5 lg:rounded-[24px] lg:shadow-sm lg:border border-gray-100">
                        <h3 className="hidden lg:block font-bold text-xs mb-4 uppercase tracking-widest text-gray-400">Danh Mục Món</h3>

                        {/* Đã thêm các class ẩn scrollbar: [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] */}
                        <ul className="flex flex-row lg:flex-col gap-2 lg:gap-1 max-h-[60vh] overflow-x-auto lg:overflow-x-visible overflow-y-hidden lg:overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                            <li
                                onClick={() => setSelectedCatId('all')}
                                className={`shrink-0 flex items-center justify-between px-4 lg:px-4 py-2 lg:py-2.5 rounded-full lg:rounded-xl text-sm cursor-pointer transition-all border lg:border-none ${selectedCatId === 'all'
                                    ? 'bg-orange-500 text-white border-orange-500 font-bold shadow-md'
                                    : 'bg-white text-gray-600 border-gray-200 hover:bg-orange-50 hover:text-orange-600 font-medium'
                                    }`}
                            >
                                <span className="flex items-center gap-2 whitespace-nowrap">
                                    <ShoppingCart size={14} className="hidden lg:block" /> Tất cả món
                                </span>
                                <span className={`hidden lg:flex text-[10px] px-2 py-0.5 rounded-full font-bold ${selectedCatId === 'all' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                    {menuItems.length + combos.length}
                                </span>
                            </li>

                            {combos.length > 0 && (
                                <li
                                    onClick={() => setSelectedCatId('combos')}
                                    className={`shrink-0 flex items-center justify-between px-4 lg:px-4 py-2 lg:py-2.5 rounded-full lg:rounded-xl text-sm cursor-pointer transition-all border lg:border-none ${selectedCatId === 'combos'
                                        ? 'bg-orange-500 text-white border-orange-500 font-bold shadow-md'
                                        : 'bg-white text-gray-600 border-gray-200 hover:bg-orange-50 hover:text-orange-600 font-medium'
                                        }`}
                                >
                                    <span className="flex items-center gap-2 whitespace-nowrap">
                                        <Sparkles size={14} className="hidden lg:block text-amber-500" /> Combo ưu đãi
                                    </span>
                                    <span className={`hidden lg:flex text-[10px] px-2 py-0.5 rounded-full font-bold ${selectedCatId === 'combos' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                        {combos.length}
                                    </span>
                                </li>
                            )}

                            {categories.map((cat, idx) => {
                                const currentCatId = String(cat._id || (cat as any).id || `fallback-cat-${idx}`);
                                const count = categoryCounts[currentCatId] || 0;
                                const isSelected = selectedCatId === currentCatId;

                                return (
                                    <li
                                        key={currentCatId}
                                        onClick={() => setSelectedCatId(currentCatId)}
                                        className={`shrink-0 flex items-center justify-between px-4 lg:px-4 py-2 lg:py-2.5 rounded-full lg:rounded-xl text-sm cursor-pointer transition-all border lg:border-none ${isSelected
                                            ? 'bg-orange-500 text-white border-orange-500 font-bold shadow-md'
                                            : 'bg-white text-gray-600 border-gray-200 hover:bg-orange-50 hover:text-orange-600 font-medium'
                                            }`}
                                    >
                                        <span className="flex items-center gap-2 whitespace-nowrap">
                                            <Leaf size={14} className="hidden lg:block" /> {cat.name}
                                        </span>
                                        {count > 0 && (
                                            <span className={`hidden lg:flex text-[10px] px-2 py-0.5 rounded-full font-bold ${isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                                {count}
                                            </span>
                                        )}
                                    </li>
                                )
                            })}
                        </ul>
                    </div>
                </aside>

                {/* === RIGHT CONTENT (GRID SẢN PHẨM) === */}
                <div className="flex-1">
                    {/* PRODUCT GRID - CÓ CHỌN SIZE TRỰC TIẾP */}
                    {((selectedCatId === 'combos' && filteredCombos.length === 0) ||
                      (selectedCatId !== 'all' && selectedCatId !== 'combos' && filteredItems.length === 0) ||
                      (selectedCatId === 'all' && filteredCombos.length === 0 && filteredItems.length === 0)) ? (
                        <div className="flex flex-col items-center justify-center text-center py-20 bg-white rounded-[24px] border border-gray-100 shadow-sm mx-4">
                            <Search className="text-gray-300 w-12 h-12 mb-4" />
                            <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-2">
                                {selectedCatId === 'combos' ? 'Không tìm thấy combo nào' : 'Không tìm thấy món ăn nào'}
                            </h3>
                            <button onClick={() => { setSearchTerm(''); setSelectedCatId('all'); }} className="mt-4 px-6 py-2 bg-orange-100 text-orange-600 font-bold rounded-full hover:bg-orange-200 text-sm transition-colors">
                                Xóa bộ lọc
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5">
                            {/* 1. Render các Combo (hiển thị khi chọn 'all' hoặc 'combos') */}
                            {(selectedCatId === 'all' || selectedCatId === 'combos') && (
                                filteredCombos.map((combo, index) => (
                                    <div key={`combo-${combo._id || index}`} className="group bg-white rounded-[20px] shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col overflow-hidden border border-gray-100 animate-in fade-in duration-300">
                                        {/* --- KHỐI ẢNH --- */}
                                        <div className="relative aspect-square w-full bg-gray-50 cursor-pointer overflow-hidden" onClick={() => setSelectedComboForDetail(combo)}>
                                            <img
                                                src={combo.image ? IMAGE_URL(combo.image) : (combo.menuItemIds?.[0]?.images?.length > 0 ? IMAGE_URL(combo.menuItemIds[0].images[0]) : 'https://placehold.co/400')}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                alt={combo.name}
                                                loading="lazy"
                                            />
                                            <div className="absolute top-2 left-2 bg-gradient-to-r from-red-500 to-orange-500 text-white text-[8px] md:text-[9px] font-bold px-2 py-1 rounded-md uppercase tracking-wider z-10">
                                                Combo Tiết Kiệm
                                            </div>
                                        </div>

                                        {/* --- KHỐI THÔNG TIN CHÍNH --- */}
                                        <div className="p-2.5 md:p-4 flex-1 flex flex-col bg-white">
                                            <div className="flex flex-col gap-1.5 md:gap-2 mb-3">
                                                <h3 className="font-bold text-[13px] md:text-[15px] text-gray-800 cursor-pointer hover:text-orange-600 line-clamp-2 transition-colors leading-snug" onClick={() => setSelectedComboForDetail(combo)}>
                                                    {combo.name}
                                                </h3>
                                                <p className="text-gray-500 text-[10px] md:text-xs line-clamp-2">
                                                    {combo.description || (combo.menuItemIds?.map((m: any) => m.name).join(' + ') || '')}
                                                </p>
                                            </div>

                                            {/* --- KHỐI GIÁ TIỀN & NÚT THÊM GIỎ HÀNG --- */}
                                            <div className="mt-auto pt-2 border-t border-gray-50 flex items-center justify-between">
                                                <div className="text-orange-600 font-black text-[14px] sm:text-[15px] md:text-lg flex-1 truncate pr-1">
                                                    {combo.price.toLocaleString()}<span className="underline decoration-1 text-[10px] md:text-xs ml-0.5 font-bold">đ</span>
                                                </div>
                                                <button
                                                    onClick={(e) => addComboToCart(e, combo)}
                                                    className="w-7 h-7 md:w-9 md:h-9 bg-orange-500 text-white rounded-full flex items-center justify-center hover:bg-orange-600 transition-colors shadow-sm cursor-pointer shrink-0 active:scale-95"
                                                    title="Thêm vào giỏ"
                                                >
                                                    <Plus size={16} strokeWidth={2.5} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}

                            {/* 2. Render các Món ăn thường (hiển thị khi chọn khác 'combos') */}
                            {selectedCatId !== 'combos' && (
                                filteredItems.map((item, index) => (
                                    <div key={`item-${item._id || index}`} className="group bg-white rounded-[20px] shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col overflow-hidden border border-gray-100 animate-in fade-in duration-300">
                                        {/* --- KHỐI ẢNH --- */}
                                        <div className="relative aspect-square w-full bg-gray-50 cursor-pointer overflow-hidden" onClick={() => setSelectedItemForDetail(item)}>
                                            <img
                                                src={item.images?.length > 0 ? IMAGE_URL(item.images[0]) : 'https://placehold.co/400'}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                alt={item.name}
                                                loading="lazy"
                                            />
                                            <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-md text-white text-[8px] md:text-[9px] font-bold px-2 py-1 rounded-md uppercase tracking-wider z-10">
                                                {item.categoryId?.name || 'Món ngon'}
                                            </div>
                                        </div>

                                        {/* --- KHỐI THÔNG TIN CHÍNH --- */}
                                        <div className="p-2.5 md:p-4 flex-1 flex flex-col bg-white">
                                            <div className="flex flex-col gap-1.5 md:gap-2 mb-3">
                                                <h3 className="font-bold text-[13px] md:text-[15px] text-gray-800 cursor-pointer hover:text-orange-600 line-clamp-2 transition-colors leading-snug" onClick={() => setSelectedItemForDetail(item)}>
                                                    {item.name}
                                                </h3>
                                                {item.options && item.options.length > 0 && (
                                                    <div className="flex overflow-x-auto no-scrollbar gap-1.5 pb-0.5">
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
                                                                    className={`shrink-0 whitespace-nowrap px-2 py-1 rounded-md text-[9px] md:text-[10px] font-bold uppercase transition-colors border ${isSelected
                                                                        ? 'bg-orange-500 border-orange-500 text-white shadow-sm'
                                                                        : 'bg-white border-gray-200 text-gray-500 hover:border-orange-500 hover:text-orange-600'
                                                                        }`}
                                                                >
                                                                    {opt.name}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>

                                            {/* --- KHỐI GIÁ TIỀN & NÚT THÊM GIỎ HÀNG --- */}
                                            {(() => {
                                                const selectedOption = selectedOptionsMap[getItemId(item)];
                                                const displayPrice = item.price + (selectedOption?.priceExtra || 0);

                                                return (
                                                    <div className="mt-auto pt-2 border-t border-gray-50 flex items-center justify-between">
                                                        <div className="text-orange-600 font-black text-[14px] sm:text-[15px] md:text-lg flex-1 truncate pr-1">
                                                            {displayPrice.toLocaleString()}<span className="underline decoration-1 text-[10px] md:text-xs ml-0.5 font-bold">đ</span>
                                                        </div>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (item.options && item.options.length > 0 && !selectedOption) {
                                                                    toast.warning('Vui lòng chọn Size cho món ăn!');
                                                                    return;
                                                                }
                                                                addToCart(e, item, selectedOption);
                                                            }}
                                                            className="w-7 h-7 md:w-9 md:h-9 bg-orange-500 text-white rounded-full flex items-center justify-center hover:bg-orange-600 transition-colors shadow-sm cursor-pointer shrink-0 active:scale-95"
                                                            title="Thêm vào giỏ"
                                                        >
                                                            <Plus size={16} strokeWidth={2.5} />
                                                        </button>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* FLOATING CART CHO MOBILE & DESKTOP */}
            <AnimatePresence>
                {cart.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 50, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 50, scale: 0.8 }} className="fixed bottom-6 right-4 md:bottom-10 md:right-10 z-50">
                        <button
                            ref={cartRef}
                            onClick={() => navigate('/cart')}
                            className="flex items-center bg-orange-600 text-white rounded-full p-1.5 md:p-2 pr-5 md:pr-6 shadow-2xl shadow-orange-600/40 border-4 border-white transition-all hover:bg-orange-700 active:scale-95 group"
                        >
                            <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-full flex items-center justify-center relative">
                                <ShoppingBag size={20} className="text-orange-600 group-hover:scale-110 transition-transform" />
                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] md:text-[10px] font-bold w-4 h-4 md:w-5 md:h-5 flex items-center justify-center rounded-full border-2 border-white shadow-sm">{globalTotalItems}</span>
                            </div>
                            <div className="ml-3 flex flex-col items-start">
                                <span className="text-[8px] md:text-[9px] font-bold uppercase tracking-widest text-orange-200">Giỏ Hàng</span>
                                <span className="text-sm md:text-base font-black leading-none">{globalTotalPrice.toLocaleString()}đ</span>
                            </div>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* MODAL CHI TIẾT SẢN PHẨM (ĐÃ RESPONSIVE 100% MỌI THIẾT BỊ) */}
            <AnimatePresence>
                {selectedItemForDetail && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        // Mobile: Nằm sát đáy | Desktop: Nằm giữa màn hình
                        className="fixed inset-0 z-[120] flex items-end md:items-center justify-center md:p-6"
                    >
                        {/* Backdrop làm mờ mạnh hơn */}
                        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedItemForDetail(null)}></div>

                        <motion.div
                            initial={{ y: "100%", opacity: 0.5 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: "100%", opacity: 0 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            // Container chính: Cao tối đa 90vh (Mobile) và 85vh (Desktop)
                            className="relative w-full max-w-5xl bg-white rounded-t-[32px] md:rounded-[40px] overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh] md:max-h-[85vh] z-10"
                        >
                            {/* --- NÚT ĐÓNG (X) DẠNG KÍNH MỜ --- */}
                            {/* Nằm đè lên trên cùng để luôn bấm được */}
                            <button
                                onClick={() => setSelectedItemForDetail(null)}
                                className="absolute top-4 right-4 md:top-6 md:right-6 z-50 p-2 md:p-2.5 bg-black/30 hover:bg-black/50 text-white backdrop-blur-md rounded-full flex items-center justify-center transition-all active:scale-90 shadow-lg"
                            >
                                <X size={20} strokeWidth={2.5} className="md:w-6 md:h-6" />
                            </button>

                            {/* --- CỘT TRÁI: HÌNH ẢNH --- */}
                            {/* Mobile: Ảnh chữ nhật ngang (4:3) | Desktop: Cột chiếm 50% chiều rộng và full chiều cao */}
                            <div className="w-full md:w-1/2 shrink-0 aspect-[4/3] sm:aspect-[16/9] md:aspect-auto relative bg-gray-100 overflow-hidden">

                                {/* 1. Ảnh phụ zoom to làm mờ nền */}
                                <img
                                    src={selectedItemForDetail.images?.length > 0 ? IMAGE_URL(selectedItemForDetail.images[0]) : 'https://placehold.co/800x800'}
                                    className="absolute inset-0 w-full h-full object-cover filter blur-2xl scale-110 opacity-30 select-none pointer-events-none"
                                    alt=""
                                />

                                {/* 2. Ảnh chính hiển thị đầy đủ */}
                                <img
                                    src={selectedItemForDetail.images?.length > 0 ? IMAGE_URL(selectedItemForDetail.images[0]) : 'https://placehold.co/800x800'}
                                    className="absolute inset-0 w-full h-full object-contain relative z-10"
                                    alt={selectedItemForDetail.name}
                                />

                                {/* Gradient mờ */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent md:hidden z-20" />
                            </div>


                            {/* --- CỘT PHẢI: THÔNG TIN CHI TIẾT --- */}
                            {/* Flex-1 min-h-0 cực kỳ quan trọng để scrollbar hoạt động mượt bên trong */}
                            <div className="flex-1 flex flex-col bg-white relative z-20 -mt-8 md:mt-0 rounded-t-[32px] md:rounded-none min-h-0">

                                {/* Thanh gạt nhỏ trên Mobile (Vuốt để đóng) */}
                                <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3 mb-1 md:hidden" />

                                {/* --- KHOẢNG NỘI DUNG CUỘN (Scrollable Area) --- */}
                                <div className="flex-1 overflow-y-auto px-5 md:px-10 pt-5 md:pt-10 pb-6 custom-scrollbar">

                                    <div className="flex items-center gap-2 mb-2 md:mb-3">
                                        <span className="bg-orange-100 text-orange-600 text-[9px] md:text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-md">
                                            {selectedItemForDetail.categoryId?.name || 'Món ngon'}
                                        </span>
                                    </div>

                                    <h3 className="text-2xl md:text-4xl font-black text-gray-900 mb-3 md:mb-4 leading-tight tracking-tight pr-8 md:pr-0">
                                        {selectedItemForDetail.name}
                                    </h3>

                                    <p className="text-gray-500 text-xs md:text-base mb-6 md:mb-8 leading-relaxed">
                                        {selectedItemForDetail.description || 'Thức uống được pha chế đặc biệt, mang lại hương vị tươi mát và sảng khoái cho ngày dài năng động.'}
                                    </p>

                                    {/* KHOẢNG CHỌN TÙY CHỌN (OPTIONS) */}
                                    {selectedItemForDetail.options && selectedItemForDetail.options.length > 0 && (
                                        <div className="mb-4">
                                            <div className="flex items-center justify-between mb-3 md:mb-4 bg-gray-50 px-3 md:px-4 py-2 rounded-lg md:rounded-xl border border-gray-100">
                                                <h4 className="font-bold text-xs md:text-sm text-gray-800 uppercase tracking-widest">Chọn Size của bạn</h4>
                                                {/* <span className="text-[9px] md:text-[10px] font-black text-white bg-gray-400 px-2 py-1 rounded">BẮT BUỘC</span> */}
                                            </div>

                                            {/* Mobile: Grid 2 cột cho Option để tiết kiệm chỗ */}
                                            <div className="grid grid-cols-2 gap-2 md:gap-3">
                                                {selectedItemForDetail.options.map(opt => {
                                                    const isSelected = selectedOptionsMap[getItemId(selectedItemForDetail)]?.name === opt.name;
                                                    return (
                                                        <button
                                                            key={opt.name}
                                                            onClick={() => setSelectedOptionsMap(prev => ({ ...prev, [getItemId(selectedItemForDetail)]: prev[getItemId(selectedItemForDetail)]?.name === opt.name ? null : opt }))}
                                                            className={`relative p-3 md:p-4 rounded-xl md:rounded-2xl border-2 transition-all flex flex-col items-start gap-0.5 md:gap-1 ${isSelected
                                                                ? 'bg-orange-50 border-orange-500 shadow-sm'
                                                                : 'bg-white border-gray-100 hover:border-orange-200'
                                                                }`}
                                                        >
                                                            {/* Dấu tích V khi được chọn */}
                                                            {isSelected && (
                                                                <div className="absolute top-2 right-2 md:top-3 md:right-3 bg-orange-500 text-white rounded-full p-0.5">
                                                                    <CheckCircle2 size={12} className="md:w-3.5 md:h-3.5" />
                                                                </div>
                                                            )}
                                                            <span className={`font-black text-sm md:text-base ${isSelected ? 'text-orange-600' : 'text-gray-700'}`}>
                                                                {opt.name}
                                                            </span>
                                                            <span className={`text-[10px] md:text-xs font-semibold ${isSelected ? 'text-orange-500' : 'text-gray-400'}`}>
                                                                {opt.priceExtra > 0 ? `+ ${(opt.priceExtra).toLocaleString()}đ` : 'Giá mặc định'}
                                                            </span>
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* KHOẢNG CHỌN TOPPING (ADDONS) */}
                                    {selectedItemForDetail.addons && selectedItemForDetail.addons.length > 0 && (
                                        <div className="mb-4">
                                            <div className="flex items-center justify-between mb-3 md:mb-4 bg-gray-50 px-3 md:px-4 py-2 rounded-lg md:rounded-xl border border-gray-100">
                                                <h4 className="font-bold text-xs md:text-sm text-gray-800 uppercase tracking-widest flex items-center gap-2">
                                                    <Sparkles size={14} className="text-orange-500" /> Thêm Topping xịn
                                                </h4>
                                                <span className="text-[9px] md:text-[10px] font-black text-gray-400">CHỌN NHIỀU</span>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
                                                {selectedItemForDetail.addons.map((addon, idx) => {
                                                    const isSelected = selectedAddons.some(a => a.name === addon.name);
                                                    return (
                                                        <button
                                                            key={idx}
                                                            onClick={() => {
                                                                if (isSelected) {
                                                                    setSelectedAddons(prev => prev.filter(a => a.name !== addon.name));
                                                                } else {
                                                                    setSelectedAddons(prev => [...prev, addon]);
                                                                }
                                                            }}
                                                            className={`relative p-3 md:p-4 rounded-xl md:rounded-2xl border-2 transition-all flex items-center justify-between gap-2 ${isSelected
                                                                ? 'bg-orange-50 border-orange-500 shadow-sm'
                                                                : 'bg-white border-gray-100 hover:border-orange-200'
                                                                }`}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-orange-500 border-orange-500' : 'bg-white border-gray-300'}`}>
                                                                    {isSelected && <CheckCircle2 size={10} className="text-white" />}
                                                                </div>
                                                                <span className={`font-bold text-xs md:text-sm ${isSelected ? 'text-orange-600' : 'text-gray-700'}`}>
                                                                    {addon.name}
                                                                </span>
                                                            </div>
                                                            <span className={`text-[10px] md:text-xs font-semibold ${isSelected ? 'text-orange-500' : 'text-gray-400'}`}>
                                                                + {(addon.price || 0).toLocaleString()}đ
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* GHI CHÚ */}
                                    <div className="mb-4">
                                        <div className="flex items-center justify-between mb-3 md:mb-4 bg-gray-50 px-3 md:px-4 py-2 rounded-lg md:rounded-xl border border-gray-100">
                                            <h4 className="font-bold text-xs md:text-sm text-gray-800 uppercase tracking-widest">Ghi chú thêm</h4>
                                            <span className="text-[9px] md:text-[10px] font-black text-gray-400">KHÔNG BẮT BUỘC</span>
                                        </div>
                                        <textarea
                                            value={itemNote}
                                            onChange={(e) => setItemNote(e.target.value)}
                                            placeholder="Ghi chú thêm cho món này (VD: ít đá, ít đường...)"
                                            className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                                            rows={2}
                                        />
                                    </div>
                                </div>


                                {/* --- KHOẢNG THANH TOÁN DÍNH ĐÁY (Sticky Bottom Bar) --- */}
                                {/* Dùng shrink-0 để khối này luôn dính chặt xuống đáy, không bị thu nhỏ */}
                                {(() => {
                                    const selectedOption = selectedOptionsMap[getItemId(selectedItemForDetail)];
                                    const addonPrice = selectedAddons.reduce((sum, a) => sum + (a.price || 0), 0);
                                    const unitPrice = selectedItemForDetail.price + (selectedOption?.priceExtra || 0) + addonPrice;
                                    const displayPrice = unitPrice * detailQuantity;

                                    return (
                                        <div className="shrink-0 p-4 md:p-6 lg:p-8 bg-white border-t border-gray-100 shadow-[0_-10px_20px_rgba(0,0,0,0.03)] z-30">
                                            <div className="flex flex-col gap-4">
                                                {/* Bộ tăng giảm số lượng và Tạm tính */}
                                                <div className="flex items-center justify-between bg-gray-50 p-2 md:p-3 rounded-2xl border border-gray-100">
                                                    <div className="flex items-center gap-4">
                                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Số lượng</span>
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                onClick={() => setDetailQuantity(Math.max(1, detailQuantity - 1))}
                                                                className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-all active:scale-90"
                                                            >
                                                                <Minus size={16} />
                                                            </button>
                                                            <div className="w-10 md:w-12 text-center font-black text-lg text-gray-800">
                                                                {detailQuantity}
                                                            </div>
                                                            <button
                                                                onClick={() => setDetailQuantity(detailQuantity + 1)}
                                                                className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-all active:scale-90"
                                                            >
                                                                <Plus size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end mr-2">
                                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Tạm tính</span>
                                                        <span className="text-lg md:text-xl font-black text-orange-600">
                                                            {displayPrice.toLocaleString()}đ
                                                        </span>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={(e) => {
                                                        if (selectedItemForDetail.options && selectedItemForDetail.options.length > 0 && !selectedOption) {
                                                            toast.warning('Vui lòng chọn Size cho món ăn!');
                                                            return;
                                                        }
                                                        addToCart(e, selectedItemForDetail, selectedOption, selectedAddons, detailQuantity, itemNote);
                                                        setSelectedItemForDetail(null);
                                                    }}
                                                    className="w-full py-3.5 md:py-4 lg:py-5 bg-orange-500 text-white font-black rounded-xl md:rounded-[20px] shadow-lg shadow-orange-500/30 hover:bg-orange-600 transition-all flex items-center justify-center gap-2 text-sm md:text-base uppercase tracking-widest active:scale-95"
                                                >
                                                    <ShoppingCart size={18} className="md:w-5 md:h-5" />
                                                    Thêm {detailQuantity} Ly Vào Giỏ
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

            {/* MODAL CHI TIẾT COMBO */}
            <AnimatePresence>
                {selectedComboForDetail && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[120] flex items-end md:items-center justify-center md:p-6"
                    >
                        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedComboForDetail(null)}></div>

                        <motion.div
                            initial={{ y: "100%", opacity: 0.5 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: "100%", opacity: 0 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="relative w-full max-w-5xl bg-white rounded-t-[32px] md:rounded-[40px] overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh] md:max-h-[85vh] z-10"
                        >
                            <button
                                onClick={() => setSelectedComboForDetail(null)}
                                className="absolute top-4 right-4 md:top-6 md:right-6 z-50 p-2 md:p-2.5 bg-black/30 hover:bg-black/50 text-white backdrop-blur-md rounded-full flex items-center justify-center transition-all active:scale-90 shadow-lg"
                            >
                                <X size={20} strokeWidth={2.5} className="md:w-6 md:h-6" />
                            </button>

                            {/* CỘT TRÁI: HÌNH ẢNH */}
                            <div className="w-full md:w-1/2 shrink-0 aspect-[4/3] sm:aspect-[16/9] md:aspect-auto relative bg-gray-100 overflow-hidden">
                                <img
                                    src={selectedComboForDetail.image ? IMAGE_URL(selectedComboForDetail.image) : (selectedComboForDetail.menuItemIds?.[0]?.images?.length > 0 ? IMAGE_URL(selectedComboForDetail.menuItemIds[0].images[0]) : 'https://placehold.co/800x800')}
                                    className="absolute inset-0 w-full h-full object-cover filter blur-2xl scale-110 opacity-30 select-none pointer-events-none"
                                    alt=""
                                />
                                <img
                                    src={selectedComboForDetail.image ? IMAGE_URL(selectedComboForDetail.image) : (selectedComboForDetail.menuItemIds?.[0]?.images?.length > 0 ? IMAGE_URL(selectedComboForDetail.menuItemIds[0].images[0]) : 'https://placehold.co/800x800')}
                                    className="absolute inset-0 w-full h-full object-contain relative z-10"
                                    alt={selectedComboForDetail.name}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent md:hidden z-20" />
                            </div>

                            {/* CỘT PHẢI: THÔNG TIN CHI TIẾT */}
                            <div className="flex-1 flex flex-col bg-white relative z-20 -mt-8 md:mt-0 rounded-t-[32px] md:rounded-none min-h-0">
                                <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3 mb-1 md:hidden" />

                                <div className="flex-1 overflow-y-auto px-5 md:px-10 pt-5 md:pt-10 pb-6 custom-scrollbar">
                                    <div className="flex items-center gap-2 mb-2 md:mb-3">
                                        <span className="bg-gradient-to-r from-red-500 to-orange-500 text-white text-[9px] md:text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-md">
                                            Combo ưu đãi cực hời
                                        </span>
                                    </div>

                                    <h3 className="text-2xl md:text-4xl font-black text-gray-900 mb-3 md:mb-4 leading-tight tracking-tight pr-8 md:pr-0">
                                        {selectedComboForDetail.name}
                                    </h3>

                                    <p className="text-gray-500 text-xs md:text-base mb-6 md:mb-8 leading-relaxed">
                                        {selectedComboForDetail.description || 'Gói combo được thiết kế đặc biệt giúp bạn tiết kiệm tối đa chi phí mà vẫn thưởng thức đầy đủ các hương vị trứ danh.'}
                                    </p>

                                    {/* DANH SÁCH MÓN TRONG COMBO */}
                                    <div className="mb-6">
                                        <div className="flex items-center justify-between mb-4 bg-gray-50 px-3 md:px-4 py-2 rounded-lg md:rounded-xl border border-gray-100">
                                            <h4 className="font-bold text-xs md:text-sm text-gray-800 uppercase tracking-widest flex items-center gap-2">
                                                Các món trong combo
                                            </h4>
                                            <span className="text-[9px] md:text-[10px] font-black text-orange-500">{selectedComboForDetail.menuItemIds?.length || 0} MÓN ĂN</span>
                                        </div>

                                        <div className="flex flex-col gap-3">
                                            {selectedComboForDetail.menuItemIds?.map((m: any, idx: number) => (
                                                <div key={m._id || idx} className="flex items-center gap-4 bg-orange-50/50 p-3 rounded-2xl border border-orange-100/50">
                                                    <img
                                                        src={m.images?.length > 0 ? IMAGE_URL(m.images[0]) : 'https://placehold.co/100'}
                                                        className="w-12 h-12 rounded-xl object-cover border border-orange-200"
                                                        alt={m.name}
                                                    />
                                                    <div className="flex-1">
                                                        <h5 className="font-bold text-sm text-gray-800">{m.name}</h5>
                                                        <p className="text-[10px] md:text-xs text-gray-400 line-clamp-1">{m.description}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* GHI CHÚ COMBO */}
                                    <div className="mb-4">
                                        <div className="flex items-center justify-between mb-3 md:mb-4 bg-gray-50 px-3 md:px-4 py-2 rounded-lg md:rounded-xl border border-gray-100">
                                            <h4 className="font-bold text-xs md:text-sm text-gray-800 uppercase tracking-widest">Ghi chú thêm</h4>
                                            <span className="text-[9px] md:text-[10px] font-black text-gray-400">KHÔNG BẮT BUỘC</span>
                                        </div>
                                        <textarea
                                            value={itemNote}
                                            onChange={(e) => setItemNote(e.target.value)}
                                            placeholder="Ghi chú thêm (VD: món 1 ít đá, món 2 nhiều đường...)"
                                            className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                                            rows={2}
                                        />
                                    </div>
                                </div>

                                {/* THANH TOÁN DÍNH ĐÁY COMBO */}
                                {(() => {
                                    const displayPrice = selectedComboForDetail.price * detailQuantity;

                                    return (
                                        <div className="shrink-0 p-4 md:p-6 lg:p-8 bg-white border-t border-gray-100 shadow-[0_-10px_20px_rgba(0,0,0,0.03)] z-30">
                                            <div className="flex flex-col gap-4">
                                                <div className="flex items-center justify-between bg-gray-50 p-2 md:p-3 rounded-2xl border border-gray-100">
                                                    <div className="flex items-center gap-4">
                                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Số lượng</span>
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                onClick={() => setDetailQuantity(Math.max(1, detailQuantity - 1))}
                                                                className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-all active:scale-90"
                                                            >
                                                                <Minus size={16} />
                                                            </button>
                                                            <div className="w-10 md:w-12 text-center font-black text-lg text-gray-800">
                                                                {detailQuantity}
                                                            </div>
                                                            <button
                                                                onClick={() => setDetailQuantity(detailQuantity + 1)}
                                                                className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-all active:scale-90"
                                                            >
                                                                <Plus size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end mr-2">
                                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Tạm tính</span>
                                                        <span className="text-lg md:text-xl font-black text-orange-600">
                                                            {displayPrice.toLocaleString()}đ
                                                        </span>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={(e) => {
                                                        addComboToCart(e, selectedComboForDetail, detailQuantity, itemNote);
                                                        setSelectedComboForDetail(null);
                                                    }}
                                                    className="w-full py-3.5 md:py-4 lg:py-5 bg-orange-500 text-white font-black rounded-xl md:rounded-[20px] shadow-lg shadow-orange-500/30 hover:bg-orange-600 transition-all flex items-center justify-center gap-2 text-sm md:text-base uppercase tracking-widest active:scale-95"
                                                >
                                                    <ShoppingCart size={18} className="md:w-5 md:h-5" />
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
            <Footer />
        </div>
    );
}