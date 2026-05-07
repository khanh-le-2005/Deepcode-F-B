import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search, MapPin, User, History, Heart, ShoppingBag,
    ShoppingCart, ChevronRight, Truck, Package,
    CreditCard, Banknote, X, Loader2, ArrowRight, Leaf, Sparkles,
    ChevronLeft, Trash2, Star, Home,
    Sliders
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swiper, SwiperSlide } from 'swiper/react';
// Import Swiper styles
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';
// Import required modules
import { Autoplay, Pagination, Navigation } from 'swiper/modules';
import Footer from '@/src/components/ui/Footer';
import { useCart } from '../../contexts/CartContext';

// --- Cấu hình API theo tài liệu ---
const BASE_URL = 'http://localhost:3001/api';
const IMAGE_URL = (id: string) => `${BASE_URL}/images/${id}`;

interface Category { _id: string; name: string; slug: string; }
interface MenuItem { _id: string; name: string; price: number; description: string; images: string[]; categoryId: { _id: string; name: string }; options?: any[]; }
interface CartItem extends MenuItem { quantity: number; selectedOption?: any; }

export default function SummerMenuKiosk() {
    const navigate = useNavigate();

    // --- STATE ---
    const {
        cart,
        addToCart: addToGlobalCart,
        totalPrice: globalTotalPrice,
        totalItems: globalTotalItems
    } = useCart();

    const [categories, setCategories] = useState<Category[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCatId, setSelectedCatId] = useState<string>('all');
    const [selectedOptionsMap, setSelectedOptionsMap] = useState<Record<string, any>>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItemForDetail, setSelectedItemForDetail] = useState<MenuItem | null>(null);

    const [qrResponse, setQrResponse] = useState<{ qrBase64: string; paymentContent: string; orderId?: string; tableId?: string } | null>(null);

    const [currentSlide, setCurrentSlide] = useState(0);

    // --- DATA TĨNH ---
    const heroSlides = [
        { image: "https://i.postimg.cc/sfW1Mndn/59a3f43f-477a-4aad-912a-44605a88ed63.png", badge: "Trái cây tươi", title1: "Trà Chanh", titleHighlight: "Giải Nhiệt", desc: "Vị chua thanh mát của chanh vàng, hòa quyện mật ong." },
        { image: "https://i.postimg.cc/NFvs8cv0/22883c10-4f4f-427c-babf-05ce0adbbd55.png", badge: "Best Seller", title1: "Trà Đào", titleHighlight: "Cam Sả", desc: "Đậm đà vị trà đen nguyên bản, kết hợp lát đào giòn ngọt." },
        { image: "https://i.postimg.cc/2j6R78jG/c333a43e-36f4-4f4b-886b-2441b3922cd8.png", badge: "Mới ra mắt", title1: "Lục Trà", titleHighlight: "Dâu Tây", desc: "Sự bùng nổ hương vị từ dâu tây tươi chín mọng." }
    ];

    const bannerSlides = [
        { image: "https://i.postimg.cc/sfW1Mndn/59a3f43f-477a-4aad-912a-44605a88ed63.png" },
        { image: "https://i.postimg.cc/NFvs8cv0/22883c10-4f4f-427c-babf-05ce0adbbd55.png" },
        { image: "https://i.postimg.cc/L5F9kpF8/541e1e3d-2335-4636-9903-45ef4218c07d.png" },
        { image: "https://i.postimg.cc/nrfFKJfM/96d81be4-8310-408d-82e1-ca5b3e75fc82.png" },
        { image: "https://i.postimg.cc/nrfFKJfz/ca612985-1b78-4b29-8467-fcb8c101b262.png" },
    ];

    // --- EFFECTS ---
    useEffect(() => {
        const timer = setInterval(() => setCurrentSlide((prev) => (prev + 1) % heroSlides.length), 5000);
        return () => clearInterval(timer);
    }, [heroSlides.length]);

    useEffect(() => {
        if (!qrResponse?.orderId) return;
        const interval = setInterval(async () => {
            try {
                const res = await fetch(`${BASE_URL}/orders/${qrResponse.orderId}/status`);
                const data = await res.json();
                if (data && data.paymentStatus === 'paid') {
                    clearInterval(interval);
                    setQrResponse(null); setCart([]); setIsModalOpen(false);
                    setCustomerInfo({ name: '', phone: '', deliveryAddress: '', note: '' });
                    navigate(`/success?orderId=${qrResponse.orderId}`);
                }
            } catch (err) { console.error(err); }
        }, 3000);
        return () => clearInterval(interval);
    }, [qrResponse, navigate]);

    useEffect(() => {
        const initData = async () => {
            try {
                setLoading(true);
                const [catRes, menuRes] = await Promise.all([fetch(`${BASE_URL}/categories`), fetch(`${BASE_URL}/weekly-menu/active`)]);
                const catData = await catRes.json();
                setCategories(catData || []);
                const menuData = await menuRes.json();
                if (menuData && menuData.menuItems) setMenuItems(menuData.menuItems);
                else { const allMenuRes = await fetch(`${BASE_URL}/menu`); setMenuItems(await allMenuRes.json()); }
            } catch (err) { console.error("Lỗi API"); } finally { setLoading(false); }
        };
        initData();
    }, []);

    // --- FUNCTIONS ---
    const getItemId = (item: any) => item._id || item.id;

    const addToCart = (item: MenuItem, selectedOption?: any) => {
        // Transform MenuItem to OrderItem structure for global CartContext
        addToGlobalCart({
            menuItemId: getItemId(item),
            name: item.name,
            basePrice: item.price,
            quantity: 1,
            totalPrice: item.price + (selectedOption?.priceExtra || 0),
            selectedOption: selectedOption ? {
                name: selectedOption.name,
                priceExtra: selectedOption.priceExtra
            } : undefined,
            selectedAddons: [],
            status: 'in_cart',
            image: item.images?.length > 0 ? IMAGE_URL(item.images[0]) : 'https://placehold.co/400',
            category: item.categoryId?.name || 'Món ngon'
        });
    };



    // Lọc sản phẩm
    // --- LOGIC LỌC SẢN PHẨM ĐÃ SỬA LỖI ---
    const filteredItems = menuItems.filter(item => {
        // 1. Nếu chọn 'all' thì bỏ qua lọc danh mục
        if (selectedCatId === 'all') {
            return item.name.toLowerCase().includes(searchTerm.toLowerCase());
        }

        // 2. Lấy ID danh mục của món ăn (ép kiểu string cho an toàn)
        const itemCatId = String(item.categoryId?._id || item.categoryId?.id || item.categoryId || "");

        // 3. So sánh
        const matchesCategory = itemCatId === selectedCatId;
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());

        return matchesCategory && matchesSearch;
    });

    if (loading) return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-[#FEF9E7]">
            <Loader2 className="animate-spin text-orange-500 mb-4" size={48} />
            <p className="font-bold text-orange-800 tracking-widest uppercase">Đang tải Menu...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#FDFBF7] text-[#333] font-sans">
            {/* --- HEADER (Chỉ chứa Nav, luôn nổi trên cùng) --- */}
            <header className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm mb-4">
                <div className="max-w-7xl mx-auto px-4 md:px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white"><Leaf size={20} /></div>
                        <h1 className="text-xl md:text-2xl font-black tracking-tighter text-gray-900">BTEC<span className="text-orange-500">TEA</span></h1>
                    </div>
                    {/* 
                    <nav className="hidden lg:flex items-center gap-8 text-sm font-bold text-gray-600">
                        <span className="hover:text-orange-500 cursor-pointer">HOME +</span>
                        <span className="hover:text-orange-500 cursor-pointer">ABOUT +</span>
                        <span className="text-orange-500 cursor-pointer">MENU +</span>
                        <span className="hover:text-orange-500 cursor-pointer">PAGES +</span>
                        <span className="hover:text-orange-500 cursor-pointer">BLOG +</span>
                        <span className="hover:text-orange-500 cursor-pointer">CONTACT</span>
                    </nav> */}

                    <div className="flex items-center gap-3 md:gap-5">
                        <button className="hidden md:flex p-2 hover:bg-gray-100 rounded-full transition-colors"><Search size={20} /></button>
                        <button onClick={() => navigate('/cart')} className="relative p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <ShoppingBag size={20} />
                            {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full">{globalTotalItems}</span>}
                        </button>
                        <button onClick={() => navigate('/cart')} className="flex lg:flex hidden  bg-orange-500 text-white px-4 md:px-6 py-2 md:py-2.5 rounded text-xs md:text-sm font-bold flex items-center gap-2 hover:bg-orange-600 transition-colors">
                            <ShoppingCart size={16} /> ORDER NOW
                        </button>
                    </div>
                </div>
            </header>

            {/* --- HERO BANNER (Đã đưa xuống dưới Header) --- */}
            {/* --- HERO BANNER (Đã đưa xuống dưới Header) --- */}
            <div className="w-full bg-white relative">
                <Swiper
                    spaceBetween={0}
                    centeredSlides={true}
                    autoplay={{ delay: 3000, disableOnInteraction: false }}
                    pagination={{ clickable: true }}
                    navigation={false}
                    modules={[Autoplay, Pagination, Navigation]}
                    className="mySwiper w-full group"
                >
                    {bannerSlides.map((slide, index) => (
                        <SwiperSlide key={index}>
                            {/* CÁCH SỬA MỚI: Xóa chiều cao cố định, dùng tỷ lệ ảnh tự nhiên */}
                            <div className="w-full relative bg-[#F8F9FA] flex justify-center items-center">
                                <img
                                    src={slide.image}
                                    alt={`Banner ${index}`}
                                    // w-full h-auto giúp ảnh không bao giờ bị cắt, tự động thích ứng với mọi màn hình
                                    className="w-full h-auto max-h-[80vh] object-contain object-top"
                                />
                            </div>
                        </SwiperSlide>
                    ))}
                </Swiper>

                {/* Tùy chỉnh CSS cho mũi tên và dấu chấm gọn gàng hơn */}
                <style>{`
                    .swiper-button-next, .swiper-button-prev { 
                        color: #f97316; 
                        opacity: 0;
                        transition: opacity 0.3s ease;
                    }
                    .mySwiper:hover .swiper-button-next,
                    .mySwiper:hover .swiper-button-prev {
                        opacity: 1;
                    }
                    .swiper-pagination-bullet-active { 
                        background: #f97316 !important; 
                    }
                `}</style>
            </div>

            {/* --- PAGE TITLE / BREADCRUMB --- */}
            {/* <div className="bg-[#F8F2E8] py-8 md:py-12 relative overflow-hidden border-b border-[#F0E6D2]">
                <div className="max-w-7xl mx-auto px-6 relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h2 className="text-3xl md:text-4xl font-black text-gray-900 uppercase">Menu List</h2>
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-500 bg-white w-fit px-4 py-2 rounded-md shadow-sm">
                        <Home size={14} /> HOME <span className="text-orange-500">• MENU LIST</span>
                    </div>
                </div>
                <Leaf className="absolute top-4 right-20 text-orange-500/10 w-24 h-24 rotate-45" />
                <Leaf className="absolute -bottom-4 left-40 text-green-500/10 w-32 h-32 -rotate-12" />
            </div> */}

            {/* --- MAIN LAYOUT (SIDEBAR CỘNG GRID) --- */}
            <main className="max-w-7xl mx-auto px-4 md:px-6 py-12 flex flex-col lg:flex-row gap-8">

                {/* === LEFT SIDEBAR === */}
                <aside className="w-full lg:w-1/4 shrink-0 space-y-8">
                    {/* Search Box */}
                    <div className="bg-[#FAF7F0] p-6 rounded-xl border border-[#F0E6D2]">
                        <h3 className="font-black text-sm mb-4 uppercase tracking-widest text-gray-900">Search</h3>
                        <div className="relative">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Search here..."
                                className="w-full pl-4 pr-12 py-3 bg-white border border-gray-200 rounded text-sm focus:outline-none focus:border-orange-500"
                            />
                            <button className="absolute right-0 top-0 bottom-0 bg-[#8C2323] text-white px-3 rounded-r hover:bg-red-800 transition-colors">
                                <Search size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Categories Menu */}
                    <ul className="space-y-1">
                        {/* Nút TẤT CẢ */}
                        <li
                            onClick={() => setSelectedCatId('all')}
                            className={`flex items-center justify-between py-2 text-sm cursor-pointer border-b border-gray-100 last:border-0 transition-colors ${selectedCatId === 'all' ? 'text-orange-600 font-bold' : 'text-gray-600 hover:text-orange-500'}`}
                        >
                            <span className="flex items-center gap-2"><ChevronRight size={14} /> Tất cả</span>
                            <span className="text-gray-400 text-xs">({menuItems.length < 10 ? `0${menuItems.length}` : menuItems.length})</span>
                        </li>

                        {/* Danh sách danh mục */}
                        {categories.map((cat, idx) => {
                            // SỬA LỖI Ở ĐÂY: Ép kiểu String và dùng Fallback Index nếu API mất ID
                            const currentCatId = String(cat._id || cat.id || `fallback-cat-${idx}`);

                            // Đếm số món ăn
                            const count = menuItems.filter(i => {
                                const itemCatId = String((i.categoryId as any)?._id || (i.categoryId as any)?.id || i.categoryId || "");
                                return itemCatId === currentCatId;
                            }).length;

                            const isSelected = selectedCatId === currentCatId;

                            return (
                                <li
                                    key={currentCatId}
                                    onClick={() => setSelectedCatId(currentCatId)}
                                    className={`flex items-center justify-between py-2 text-sm cursor-pointer border-b border-gray-100 last:border-0 transition-colors ${isSelected ? 'text-orange-600 font-bold' : 'text-gray-600 hover:text-orange-500'}`}
                                >
                                    <span className="flex items-center gap-2"><ChevronRight size={14} /> {cat.name}</span>
                                    <span className="text-gray-400 text-xs">({count < 10 ? `0${count}` : count})</span>
                                </li>
                            )
                        })}
                    </ul>

                    {/* Popular Tags */}
                    <div className="bg-[#FAF7F0] p-6 rounded-xl border border-[#F0E6D2]">
                        <h3 className="font-black text-sm mb-4 uppercase tracking-widest text-gray-900">Popular Tags</h3>
                        <div className="flex flex-wrap gap-2">
                            {['Trà Xanh', 'Giải Nhiệt', 'Best Seller', 'Đá Xay', 'Mới Ra Mắt'].map(tag => (
                                <span key={tag} className="px-3 py-1 bg-white border border-gray-200 text-xs font-bold text-gray-500 rounded hover:text-orange-500 hover:border-orange-500 cursor-pointer transition-colors">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                </aside>

                {/* === RIGHT CONTENT (GRID SẢN PHẨM) === */}
                <div className="flex-1">
                    {filteredItems.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-xl border border-gray-100">
                            <Search className="mx-auto text-gray-300 w-16 h-16 mb-4" />
                            <h3 className="text-xl font-bold text-gray-800">Không tìm thấy sản phẩm</h3>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                            {filteredItems.map((item, index) => (
                                <div key={item._id || index} className="group bg-white rounded-[24px] shadow-sm hover:shadow-2xl transition-all duration-300 flex flex-col overflow-hidden border border-orange-50/50">

                                    {/* --- ẢNH SẢN PHẨM & BADGE --- */}
                                    <div className="relative aspect-square md:aspect-[4/3] bg-[#FEF9E7] cursor-pointer overflow-hidden" onClick={() => setSelectedItemForDetail(item)}>
                                        <img
                                            src={item.images?.length > 0 ? IMAGE_URL(item.images[0]) : 'https://placehold.co/400'}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                            alt={item.name}
                                        />
                                        {/* Overlay đen nhẹ khi hover */}
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />

                                        {/* Tag Danh Mục: Chuyển lên góc trên trái, làm mờ hiện đại */}
                                        <div className="absolute top-3 left-3 bg-orange-500/90 backdrop-blur-sm text-white text-[8px] md:text-[10px] font-black px-3 py-1.5 rounded-full shadow-sm uppercase tracking-widest z-10">
                                            {item.categoryId?.name || 'Món ngon'}
                                        </div>
                                    </div>

                                    {/* --- NỘI DUNG THÔNG TIN --- */}
                                    <div className="p-3 md:p-5 flex-1 flex flex-col">
                                        {/* Đánh giá sao (Màu vàng mềm mại hơn) */}
                                        <div className="flex gap-0.5 text-yellow-400 mb-1.5 md:mb-2">
                                            <Star size={12} fill="currentColor" /> <Star size={12} fill="currentColor" /> <Star size={12} fill="currentColor" /> <Star size={12} fill="currentColor" /> <Star size={12} fill="currentColor" />
                                        </div>

                                        <h3 className="font-black text-sm md:text-lg text-gray-900 mb-0.5 md:mb-1 cursor-pointer hover:text-orange-600 line-clamp-1 transition-colors " onClick={() => setSelectedItemForDetail(item)}>
                                            {item.name}
                                        </h3>

                                        <p className="text-gray-500 text-[11px] md:text-[13px] line-clamp-2 mb-2 md:mb-3 leading-snug">
                                            {item.description || 'Thức uống giải nhiệt mùa hè sảng khoái.'}
                                        </p>

                                        {/* --- CÁC TÙY CHỌN (OPTIONS) --- */}
                                        {item.options && item.options.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 md:gap-2 mb-3 md:mb-4">
                                                {item.options.map(opt => {
                                                    const isSelected = selectedOptionsMap[getItemId(item)]?.name === opt.name;
                                                    return (
                                                        <button
                                                            key={opt.name}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedOptionsMap(prev => ({ ...prev, [getItemId(item)]: prev[getItemId(item)]?.name === opt.name ? null : opt }));
                                                            }}
                                                            // Giao diện Option mềm mại hơn
                                                            className={`px-2.5 md:px-3 py-1 md:py-1.5 rounded-full text-[12px] md:text-[15px] font-bold transition-all ${isSelected
                                                                ? 'bg-orange-500 text-white shadow-md shadow-orange-200'
                                                                : 'bg-gray-50 text-gray-500 hover:bg-orange-50 hover:text-orange-600 cursor-pointer'
                                                                }`}
                                                        >
                                                            {opt.name} {opt.priceExtra > 0 && `(+${(opt.priceExtra / 1000)}k)`}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        )}

                                        {/* --- FOOTER: GIÁ & NÚT THÊM VÀO GIỎ --- */}
                                        {(() => {
                                            const selectedOption = selectedOptionsMap[getItemId(item)];
                                            const displayPrice = item.price + (selectedOption?.priceExtra || 0);
                                            return (
                                                <div className="mt-auto pt-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-0">
                                                    <div className="flex flex-col">
                                                        <span className="text-[8px] md:text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-0.5">Giá bán</span>
                                                        <div className="flex items-baseline text-orange-600">
                                                            <span className="font-black text-base md:text-xl leading-none">{displayPrice.toLocaleString()}</span>
                                                            <span className="font-bold text-[10px] md:text-xs ml-0.5">đ</span>
                                                        </div>
                                                    </div>

                                                    {/* Nút bấm dạng Circle Button xịn xò */}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation(); // Tránh click nhầm vào xem chi tiết
                                                            addToCart(item, selectedOption);
                                                        }}
                                                        className="w-full sm:w-9 sm:h-9 md:w-11 md:h-11 py-2.5 sm:py-0 bg-orange-500 text-white rounded-xl sm:rounded-full flex items-center justify-center hover:bg-orange-600 hover:scale-105 sm:hover:scale-110 sm:hover:-rotate-6 transition-all shadow-lg shadow-orange-200 cursor-pointer"
                                                    >
                                                        <ShoppingCart size={18} className="md:w-5 md:h-5" />
                                                        <span className="sm:hidden ml-2 font-black text-[10px] uppercase tracking-widest">Thêm vào giỏ</span>
                                                    </button>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* MODALS */}
            <AnimatePresence>
                {cart.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="fixed bottom-6 right-4 z-50">
                        <button onClick={() => navigate('/cart')} className="flex items-center bg-orange-500 text-white rounded-full p-2 pr-4 shadow-2xl border-2 border-white">
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center relative">
                                <ShoppingBag size={20} className="text-orange-500" />
                                <span className="absolute -top-1 -right-1 bg-[#B32626] text-white text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full">{globalTotalItems}</span>
                            </div>
                            <div className="ml-3 flex flex-col items-start">
                                <span className="text-[10px] font-black uppercase tracking-widest">Giỏ Hàng</span>
                                <span className="text-sm font-black">{globalTotalPrice.toLocaleString()}đ</span>
                            </div>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {selectedItemForDetail && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedItemForDetail(null)}></div>
                        <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="relative bg-white w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh]">
                            <button onClick={() => setSelectedItemForDetail(null)} className="absolute top-4 right-4 z-10 p-2 bg-white/80 backdrop-blur rounded-full text-gray-800 hover:bg-gray-100 shadow-sm"><X size={18} /></button>
                            <div className="w-full md:w-1/2 h-[250px] md:h-auto bg-gray-50">
                                <img src={selectedItemForDetail.images?.length > 0 ? IMAGE_URL(selectedItemForDetail.images[0]) : 'https://placehold.co/600x600'} className="w-full h-full object-cover" alt="" />
                            </div>
                            <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col bg-white overflow-y-auto">
                                <div className="text-yellow-400 mb-2 flex"><Star size={14} fill="currentColor" /> <Star size={14} fill="currentColor" /> <Star size={14} fill="currentColor" /> <Star size={14} fill="currentColor" /> <Star size={14} fill="currentColor" /></div>
                                <h3 className="text-2xl font-black text-gray-900 mb-2">{selectedItemForDetail.name}</h3>
                                <p className="text-gray-500 text-sm mb-6 leading-relaxed">{selectedItemForDetail.description}</p>

                                {selectedItemForDetail.options && selectedItemForDetail.options.length > 0 && (
                                    <div className="mb-6">
                                        <h4 className="font-bold text-xs text-gray-800 uppercase mb-3">Tùy chọn</h4>
                                        <div className="flex flex-wrap gap-2 cursor-pointer">
                                            {selectedItemForDetail.options.map(opt => {
                                                const isSelected = selectedOptionsMap[getItemId(selectedItemForDetail)]?.name === opt.name;
                                                return (
                                                    <button
                                                        key={opt.name}
                                                        onClick={() => setSelectedOptionsMap(prev => ({ ...prev, [getItemId(selectedItemForDetail)]: prev[getItemId(selectedItemForDetail)]?.name === opt.name ? null : opt }))}
                                                        className={`px-4 py-2 rounded text-xs font-bold uppercase transition-all border ${isSelected ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-orange-500'}`}
                                                    >
                                                        {opt.name} {opt.priceExtra > 0 && `(+${opt.priceExtra.toLocaleString()}đ)`}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}

                                {(() => {
                                    const selectedOption = selectedOptionsMap[getItemId(selectedItemForDetail)];
                                    const displayPrice = selectedItemForDetail.price + (selectedOption?.priceExtra || 0);
                                    return (
                                        <div className="mt-auto pt-6 border-t border-gray-100 flex items-center justify-between gap-4">
                                            <span className="text-3xl font-black text-orange-600">{displayPrice.toLocaleString()}đ</span>
                                            <button onClick={() => { addToCart(selectedItemForDetail, selectedOption); setSelectedItemForDetail(null); }} className="flex-1 py-3 bg-[#1A1A1A] text-white font-bold rounded-lg shadow-md hover:bg-orange-500 transition-colors flex items-center justify-center gap-2 text-sm uppercase">
                                                <ShoppingCart size={18} /> Add to Cart
                                            </button>
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