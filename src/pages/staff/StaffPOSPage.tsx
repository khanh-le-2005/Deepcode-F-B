import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '@/src/api/axiosClient';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, Minus, ShoppingCart, Table2,
  Trash2, ChevronRight, Settings, Scan,
  History, CreditCard, Save, ChevronUp, ChevronDown,
  LogOut, HandCoins, CheckCircle2, AlertCircle, Menu, X,
  Bike, ShoppingBag
} from 'lucide-react';
import { Button } from '../../components/Button';
import { useAuth } from '../../AuthContext';
import { MenuItem, Table } from '../../types';
import { getMenuItemCategoryName, getMenuItemId, getMenuItemImageUrl } from '../../api/menuHelpers';
import { StaffItemDetailModal } from './StaffItemDetailModal';

type StaffCartItem = {
  cartItemId: string;
  menuItemId: string;
  name: string;
  basePrice: number;
  totalPrice?: number;
  quantity: number;
  category?: string;
  image?: string;
  selectedOption?: any;
  selectedAddons?: any[];
  note?: string;
};

export const StaffPOSPage = () => {
  const [tables, setTables] = useState<Table[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [selectedTableId, setSelectedTableId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(window.innerWidth >= 1280);
  const [tableFilter, setTableFilter] = useState<'all' | 'empty' | 'occupied'>('all');
  const [cart, setCart] = useState<StaffCartItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const selectedTable = tables.find(t => t.id === selectedTableId || (t as any)._id === selectedTableId);

  const [activeSession, setActiveSession] = useState<any>(null);

  const filteredTables = useMemo(() => {
    return tables.filter(t => tableFilter === 'all' ? true : t.status === tableFilter);
  }, [tables, tableFilter]);

  useEffect(() => {
    fetchTables();
    fetchMenu();
  }, []);

  const fetchTables = () => {
    axios.get('/api/tables')
      .then(res => {
        setTables(res.data || []);
      })
      .catch(err => console.error('Failed to fetch tables:', err));
  };

  const fetchActiveSession = async (tableSlugOrId: string) => {
    try {
      const res = await axios.get(`/api/orders/table/${tableSlugOrId}/active-session`);
      setActiveSession(res.data);
    } catch (error) {
      setActiveSession(null);
    }
  };

  useEffect(() => {
    if (selectedTableId) {
      const table = tables.find(t => t.id === selectedTableId || (t as any)._id === selectedTableId);
      if (table?.status === 'occupied') {
        fetchActiveSession(table.slug || table.id || (table as any)._id);
      } else {
        setActiveSession(null);
      }
    } else {
      setActiveSession(null);
    }
  }, [selectedTableId, tables]);

  const handleManualPayment = async () => {
    if (!activeSession) return;
    if (!window.confirm('Xác nhận thu tiền mặt cho bàn này?')) return;
    setSubmitting(true);
    try {
      await axios.post('/api/payments', {
        orderId: activeSession._id || activeSession.id,
        amount: activeSession.total,
        method: 'Tiền mặt'
      });
      toast.success('Thanh toán thành công!');
      fetchTables();
      setSelectedTableId('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi thanh toán');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMockPayment = async () => {
    if (!activeSession) return;
    if (!window.confirm('Xác nhận khách đã chuyển khoản thành công (Mock)?')) return;
    setSubmitting(true);
    try {
      await axios.post('/api/payments/mock', {
        orderId: activeSession._id
      });
      toast.success('Xác nhận chuyển khoản thành công!');
      fetchTables();
      setSelectedTableId('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi xác nhận');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveItems = async () => {
    if (!activeSession) return;
    setSubmitting(true);
    try {
      await axios.put(`/api/orders/${activeSession._id || activeSession.id}/approve-all`);
      toast.success('Đã duyệt tất cả món xuống bếp!');
      // Refresh dữ liệu bàn và session
      fetchTables();
      const table = tables.find(t => t.id === selectedTableId || (t as any)._id === selectedTableId);
      if (table) fetchActiveSession(table.slug || table.id || (table as any)._id);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi khi duyệt món');
    } finally {
      setSubmitting(false);
    }
  };

  const fetchMenu = () => {
    axios.get('/api/menu')
      .then(res => setMenu(res.data || []))
      .catch(err => console.error('Failed to fetch menu:', err));
  };

  const categories = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(
        menu
          .map(item => getMenuItemCategoryName(item).trim())
          .filter(Boolean)
      )
    );
    return ['Tất cả', ...uniqueCategories];
  }, [menu]);

  const filteredMenu = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return menu.filter(item => {
      const itemCategory = getMenuItemCategoryName(item).trim();
      const matchesCategory =
        selectedCategory === 'Tất cả' ||
        itemCategory.toLowerCase() === selectedCategory.toLowerCase();
      const matchesSearch =
        !term ||
        item.name.toLowerCase().includes(term) ||
        itemCategory.toLowerCase().includes(term);
      return matchesCategory && matchesSearch;
    });
  }, [menu, searchTerm, selectedCategory]);

  const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + (item.totalPrice || item.basePrice * item.quantity), 0);

  const handleAddToCartFromModal = (item: MenuItem, quantity: number, selectedOption?: any, selectedAddons?: any[], note?: string) => {
    const cartItemId = crypto.randomUUID();
    const optionsPrice = selectedOption ? (selectedOption.priceExtra || selectedOption.price || 0) : 0;
    const addonsPrice = selectedAddons ? selectedAddons.reduce((sum, a) => sum + (a.priceExtra || a.price || 0), 0) : 0;
    const unitPrice = item.price + optionsPrice + addonsPrice;

    setCart(prev => [...prev, {
      cartItemId,
      menuItemId: item.id || (item as any)._id as string,
      name: item.name,
      basePrice: item.price,
      totalPrice: unitPrice * quantity,
      quantity,
      category: getMenuItemCategoryName(item),
      image: getMenuItemImageUrl(item),
      selectedOption,
      selectedAddons,
      note
    }]);
    setSelectedMenuItem(null);
  };

  const updateQuantity = (cartItemId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.cartItemId === cartItemId) {
        const newQuantity = Math.max(1, item.quantity + delta);
        const unitPrice = item.totalPrice ? item.totalPrice / item.quantity : item.basePrice;
        return { ...item, quantity: newQuantity, totalPrice: unitPrice * newQuantity };
      }
      return item;
    }));
  };

  const removeFromCart = (cartItemId: string) => {
    setCart(prev => prev.filter(item => item.cartItemId !== cartItemId));
  };

  const handleSubmitOrder = async () => {
    if (!selectedTableId) return toast.error('Chọn bàn trống trước khi đặt món');
    if (cart.length === 0) return toast.error('Giỏ hàng đang trống');
    setSubmitting(true);
    try {
      await axios.post('/api/orders/counter', {
        tableId: selectedTableId,
        frontendUrl: window.location.origin, // ĐÃ THÊM: Để BE biết origin của app quản lý
        items: cart.map(item => ({
          menuItemId: item.menuItemId,
          name: item.name,
          basePrice: item.basePrice,
          quantity: item.quantity,
          totalPrice: item.totalPrice,
          category: item.category || 'Chưa phân loại',
          image: item.image?.replace('/api/images/', ''),
          selectedOption: item.selectedOption,
          selectedAddons: item.selectedAddons,
          note: item.note
        }))
      });
      toast.success('Đặt món thành công');
      setCart([]); setSelectedTableId(''); fetchTables();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Lỗi tạo đơn');
    } finally {
      setSubmitting(false);
    }
  };

  const isOrderDone = useMemo(() => {
    if (!activeSession || !activeSession.items || activeSession.items.length === 0) return false;
    // Kiểm tra tất cả món trong đơn đã được phục vụ (served) hoặc bị huỷ (cancelled) chưa
    return activeSession.items.every((i: any) => i.status === 'served' || i.status === 'cancelled');
  }, [activeSession]);

  const hasPendingItems = useMemo(() => {
    if (!activeSession || !activeSession.items) return false;
    return activeSession.items.some((i: any) => i.status === 'pending_approval');
  }, [activeSession]);

  // --- UI THEO ẢNH MẪU ---
  return (
    <div className="flex h-screen bg-[#f3f4f7] text-[#333] font-sans overflow-hidden">

      {/* SIDEBAR TRÁI - DANH MỤC (MÁY TÍNH) */}
      <aside className="hidden md:flex w-24 bg-white flex-col items-center py-6 border-r border-gray-100 shadow-sm z-20">
        <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-pink-500 rounded-2xl mb-10 flex items-center justify-center shadow-lg shadow-orange-200">
          <ShoppingCart className="text-white w-6 h-6" />
        </div>

        <div className="flex flex-col gap-8">
          {categories.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className="flex flex-col items-center gap-1 group cursor-pointer"
              >
                <div className={`p-3 rounded-2xl transition-all duration-300 ${active ? 'bg-gradient-to-br from-[#f97316] to-[#fb923c] text-white shadow-xl shadow-orange-200' : 'text-gray-400 hover:bg-gray-50'}`}>
                  <Table2 className="w-6 h-6" />
                </div>
                <span className={`text-[10px] font-bold ${active ? 'text-[#f97316]' : 'text-gray-400'}`}>{cat}</span>
              </button>
            );
          })}
        </div>

        {/* <div className="mt-auto flex flex-col gap-8 pb-4">
          <button
            onClick={() => navigate('/admin/payment-requests')}
            className="flex flex-col items-center gap-1 group"
            title="Yêu cầu thanh toán"
          >
            <div className="p-3 rounded-2xl text-orange-500 bg-orange-50 hover:bg-orange-100 transition-all duration-300">
              <HandCoins className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold text-orange-500">Thanh toán</span>
          </button>
        </div> */}
      </aside>

      {/* NỘI DUNG CHÍNH (GIỮA) */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar Header */}
        <header className="px-4 md:px-8 py-6 flex items-center justify-between bg-transparent gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2.5 bg-white rounded-xl shadow-sm text-gray-500 hover:text-[#f97316] cursor-pointer"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-[#2d3436]">Quầy POS</h1>
              <p className="text-gray-400 text-xs md:text-sm font-medium hidden sm:block">Cak Benu Food & Beverages</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative w-96 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-[#f97316] transition-colors" />
              <input
                type="text"
                placeholder="Tìm kiếm món ăn..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border-none rounded-2xl py-3.5 pl-12 pr-4 shadow-sm focus:ring-2 focus:ring-[#f97316]/20 outline-none transition-all text-sm"
              />
              <Scan className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
            </div>

            <div className="flex items-center gap-3 bg-[#f97316] text-white px-4 py-2 rounded-2xl shadow-lg shadow-orange-100">
              <div className="w-8 h-8 rounded-xl bg-white/20 overflow-hidden">
                <img src="https://ui-avatars.com/api/?name=Staff" alt="user" className="w-full h-full object-cover" />
              </div>
              <span className="font-bold text-sm">{user?.name || 'Nhân viên'}</span>
            </div>
            <button className="p-3 bg-white rounded-2xl shadow-sm text-gray-400 hover:text-[#f97316] transition-colors">
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={() => { logout?.(); navigate('/auth/login'); }}
              className="p-3 bg-rose-50 text-rose-500 rounded-2xl shadow-sm hover:bg-rose-500 hover:text-white transition-all duration-300"
              title="Đăng xuất"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Section: Chọn Bàn (Có bộ lọc) */}
        {/* MAIN CONTENT SPLIT (CHỌN BÀN & MENU) */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden px-4 md:px-8 pb-6 gap-6 md:gap-8">
          
          {/* CỘT TRÁI: CHỌN BÀN */}
          <div className="w-full lg:w-[320px] xl:w-[360px] shrink-0 flex flex-col gap-4 bg-white rounded-[2rem] p-5 shadow-sm border border-gray-100 overflow-hidden">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block">Chọn bàn</span>
            
            {/* Lọc bàn */}
            <div className="flex bg-gray-50 p-1 rounded-xl w-full shrink-0">
              <button onClick={() => setTableFilter('all')} className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${tableFilter === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>Tất cả</button>
              <button onClick={() => setTableFilter('empty')} className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${tableFilter === 'empty' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400 hover:text-emerald-500'}`}>Trống</button>
              <button onClick={() => setTableFilter('occupied')} className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${tableFilter === 'occupied' ? 'bg-white text-rose-500 shadow-sm' : 'text-gray-400 hover:text-rose-400'}`}>Phục vụ</button>
            </div>
            
            {/* Tên bàn đang chọn */}
            <div className="flex items-center justify-between bg-orange-50 px-4 py-2.5 rounded-xl border border-orange-100 shrink-0">
              <span className="font-bold text-[#f97316] text-sm">{selectedTable?.name ? `Bàn ${selectedTable.name}` : 'Chưa chọn bàn'}</span>
              <div className="w-2 h-2 rounded-full bg-[#f97316] animate-pulse"></div>
            </div>

            {/* Danh sách bàn cuộn dọc */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 mt-2">
              <div className="flex flex-col gap-6">
                {(() => {
                  const dineInTables = filteredTables.filter(t => !t.name.toLowerCase().includes('giao hàng') && !t.name.toLowerCase().includes('mang về'));
                  const takeawayTables = filteredTables.filter(t => t.name.toLowerCase().includes('giao hàng') || t.name.toLowerCase().includes('mang về'));

                  const renderTable = (table: Table) => {
                    const parts = table.name.split(' - ');
                    const isDelivery = parts[0].toLowerCase().includes('giao hàng');
                    const isTakeaway = parts[0].toLowerCase().includes('mang về');
                    const isDineIn = !isDelivery && !isTakeaway;
                    
                    const mainName = isDineIn ? `Bàn ${parts[0]}` : parts[0];
                    const subInfo = parts.slice(1).join(' - ');

                    const isSelected = selectedTableId === table.id;
                    const isOccupied = table.status === 'occupied';

                    return (
                      <button
                        key={table.id}
                        onClick={() => setSelectedTableId(table.id)}
                        className={`flex flex-col items-start p-3 md:p-4 rounded-2xl transition-all duration-300 cursor-pointer border-2 overflow-hidden ${
                          isSelected
                            ? 'bg-[#f97316] border-[#f97316] text-white shadow-lg shadow-orange-200 scale-[1.02]'
                            : isOccupied
                            ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100 shadow-sm'
                            : 'bg-white border-gray-100 text-gray-600 hover:border-gray-300 hover:bg-gray-50 shadow-sm'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1 w-full">
                          <div className={`p-1.5 rounded-lg shrink-0 ${isSelected ? 'bg-white/20' : isOccupied ? 'bg-rose-100 text-rose-500' : 'bg-gray-100 text-gray-500'}`}>
                            {isDelivery ? <Bike className="w-4 h-4" /> : isTakeaway ? <ShoppingBag className="w-4 h-4" /> : <Table2 className="w-4 h-4" />}
                          </div>
                          <span className="font-black text-xs md:text-sm truncate w-full text-left">{mainName}</span>
                        </div>
                        
                        {subInfo && (
                          <span className={`text-[10px] md:text-xs font-semibold w-full text-left truncate ${isSelected ? 'text-white/80' : 'text-gray-500'}`}>
                            {subInfo}
                          </span>
                        )}
                        
                        {/* Badge trạng thái */}
                        <div className="mt-auto pt-2 w-full text-left text-[9px] font-bold uppercase tracking-widest flex items-center justify-between">
                          {isSelected ? (
                            <span className="text-white flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Đang chọn</span>
                          ) : isOccupied ? (
                            <span className="text-rose-500 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span> Phục vụ</span>
                          ) : (
                            <span className="text-emerald-500">Trống</span>
                          )}
                        </div>
                      </button>
                    );
                  };

                  return (
                    <>
                      {dineInTables.length > 0 && (
                        <div>
                          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Table2 className="w-3.5 h-3.5" /> Ăn tại chỗ
                          </h4>
                          <div className="grid grid-cols-2 gap-3">
                            {dineInTables.map(renderTable)}
                          </div>
                        </div>
                      )}
                      
                      {takeawayTables.length > 0 && (
                        <div>
                          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <ShoppingBag className="w-3.5 h-3.5" /> Mang về & Giao hàng
                          </h4>
                          <div className="grid grid-cols-2 gap-3">
                            {takeawayTables.map(renderTable)}
                          </div>
                        </div>
                      )}

                      {filteredTables.length === 0 && <span className="text-gray-400 text-sm italic py-2">Không có bàn nào phù hợp.</span>}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: MENU GRID */}
          <div className="flex-1 overflow-y-auto no-scrollbar pb-20">
            <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
              {filteredMenu.map(item => (
                <motion.div
                  key={item.id || item._id}
                  whileHover={{ y: -5 }}
                  className={`bg-white rounded-[2.5rem] p-4 relative shadow-sm border-2 transition-all cursor-pointer group ${cart.find(x => x.menuItemId === (item.id || item._id)) ? 'border-[#f97316]' : 'border-transparent'}`}
                  onClick={() => handleAddToCartFromModal(item, 1, item.options?.[0], [], '')}
                >
                  <div className="absolute top-6 left-6 z-10 bg-[#f97316] text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-lg">
                    {item.price.toLocaleString()}đ
                  </div>

                  {cart.find(x => x.menuItemId === (item.id || item._id)) && (
                    <div className="absolute bottom-20 right-6 z-10 bg-[#f97316] text-white p-1 rounded-lg shadow-lg pointer-events-none">
                      <Plus className="w-4 h-4" />
                    </div>
                  )}

                  <div 
                    className="h-44 rounded-[2rem] overflow-hidden mb-4 shadow-inner relative z-20"
                    onClick={(e) => { e.stopPropagation(); setSelectedMenuItem(item); }}
                  >
                    <img
                      src={item.images?.[0] ? `/api/images/${item.images[0]}` : '/placeholder.png'}
                      alt={item.name}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                       <span className="bg-white/95 text-[#f97316] text-xs font-bold px-4 py-2 rounded-full shadow-lg">Tuỳ chỉnh món</span>
                    </div>
                  </div>
                  <div className="px-2 pb-2">
                    <h3 className="font-bold text-[#2d3436] text-sm leading-tight mb-1 group-hover:text-[#f97316] transition-colors">{item.name}</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter italic">Bấm để thêm nhanh</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

        </div>
      </main>

      {/* NÚT MỞ GIỎ HÀNG (MOBILE) */}
      {!isCartOpen && (
        <button
          onClick={() => setIsCartOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-[#f97316] text-white p-4 rounded-full shadow-2xl flex items-center justify-center hover:scale-105 transition-transform cursor-pointer"
        >
          <ShoppingCart className="w-6 h-6" />
          {cart.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-slate-900 text-white text-xs font-black w-6 h-6 flex items-center justify-center rounded-full shadow-md border-2 border-[#f3f4f7]">
              {cart.length}
            </span>
          )}
        </button>
      )}

      {/* GIỎ HÀNG BÊN PHẢI (NHƯ TRONG ẢNH) */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-black/50 z-[100] xl:hidden"
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              className="fixed inset-y-0 right-0 z-[101] w-[85%] max-w-[420px] bg-white flex flex-col border-l border-gray-100 shadow-2xl xl:relative xl:w-[420px] xl:z-30"
            >
              <button
                onClick={() => setIsCartOpen(false)}
                className="absolute top-6 right-6 z-50 p-2 bg-gray-100 rounded-full text-gray-500 hover:text-red-500 cursor-pointer shadow-sm"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Header Tabs */}
        <div className="flex items-center px-4 py-6 border-b border-gray-50">
          <button className="flex-1 flex items-center justify-center gap-2 text-[#f97316] font-bold text-sm">
            <CreditCard className="w-4 h-4" /> Thanh toán
          </button>
          {/* <button className="flex-1 flex items-center justify-center gap-2 text-gray-300 font-bold text-sm">
             <Plus className="w-4 h-4" /> Place Order
           </button>
           <button className="flex-1 flex items-center justify-center gap-2 text-gray-300 font-bold text-sm">
             <History className="w-4 h-4" /> History
           </button> */}
        </div>

        {/* New Order Header */}
        <div className={`px-8 py-6 m-4 rounded-[2rem] text-white shadow-lg ${activeSession ? 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-100' : 'bg-gradient-to-r from-[#f97316] to-[#fb923c] shadow-orange-100'}`}>
          <h2 className="text-xl font-bold">{activeSession ? 'Bàn đang dùng' : 'Đơn mới'}</h2>
          <p className="text-white/70 text-xs mt-1">
            {selectedTable ? `Bàn ${selectedTable.name}` : 'Chưa chọn bàn'} • {new Date().toLocaleTimeString()}
          </p>
        </div>

        {/* Existing Session Items (If occupied) */}
        {activeSession && (
          <div className="px-6 mb-4">
            <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
              <h3 className="text-xs font-black uppercase tracking-widest text-emerald-600 mb-3">Đã đặt ({activeSession.items.length} món)</h3>
              <div className="space-y-3 max-h-40 overflow-y-auto no-scrollbar">
                {activeSession.items.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-gray-600 font-bold">x{item.quantity} {item.name}</span>
                    <span className="text-emerald-600 font-bold">{(item.totalPrice || (item.basePrice * item.quantity)).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-emerald-100 flex justify-between font-black text-emerald-700">
                <span>Tạm tính:</span>
                <span>{activeSession.total?.toLocaleString()}đ</span>
              </div>
            </div>
          </div>
        )}

        {/* Items List (Current additions) */}
        <div className="flex-1 overflow-y-auto px-6 space-y-6 no-scrollbar">
          {cart.length === 0 ? (
            !activeSession && (
              <div className="h-full flex flex-col items-center justify-center opacity-20 py-20">
                <ShoppingCart className="w-16 h-16 mb-4" />
                <p className="font-bold">Chưa có món nào</p>
              </div>
            )
          ) : (
            <div className="space-y-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Món mới thêm</h3>
              {cart.map(item => (
                <div key={item.cartItemId} className="flex flex-col gap-2 border-b border-gray-50 pb-4">
                  <div className="flex items-start gap-4">
                    <button onClick={() => removeFromCart(item.cartItemId)} className="p-2 text-red-300 hover:text-red-500 transition-colors cursor-pointer mt-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-[#2d3436]">{item.name}</h4>
                      <div className="flex flex-col gap-0.5 mt-1">
                        <p className="text-xs text-gray-400 font-bold">@ {(item.totalPrice ? item.totalPrice / item.quantity : item.basePrice).toLocaleString()}đ</p>
                        {item.selectedOption && <p className="text-[10px] text-emerald-600 font-bold mt-1">+ Size {item.selectedOption.name}</p>}
                        {item.selectedAddons && item.selectedAddons.length > 0 && (
                          <p className="text-[10px] text-gray-500 font-bold leading-tight mt-0.5">+ Thêm: {item.selectedAddons.map(a => a.name).join(', ')}</p>
                        )}
                        {item.note && <p className="text-[10px] text-amber-500 font-bold italic mt-0.5">Ghi chú: {item.note}</p>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-3 mt-1">
                      <div className="w-24 text-right font-black text-sm text-[#2d3436]">
                        {(item.totalPrice || item.basePrice * item.quantity).toLocaleString()}đ
                      </div>
                      <div className="flex items-center border border-gray-100 rounded-lg overflow-hidden h-9 shadow-sm">
                        <button onClick={() => updateQuantity(item.cartItemId, -1)} className="w-8 h-full hover:bg-gray-50 text-gray-400 flex items-center justify-center cursor-pointer">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center font-bold text-xs text-slate-800">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.cartItemId, 1)} className="w-8 h-full hover:bg-gray-50 bg-gray-50 text-emerald-600 flex items-center justify-center cursor-pointer">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary Footer */}
        <div className="p-8 border-t border-gray-50 space-y-4">
          <div className="flex justify-between text-sm font-bold text-gray-400">
            <span>Tổng cộng (Bill hiện tại)</span>
            <span className="text-[#2d3436]">{(totalPrice + (activeSession?.total || 0)).toLocaleString()}đ</span>
          </div>

          <div className="flex flex-col gap-3">
            {/* Action Buttons */}
            {cart.length > 0 && (
              <button
                onClick={handleSubmitOrder}
                disabled={submitting}
                className="w-full bg-[#111] hover:bg-slate-800 disabled:opacity-50 text-white rounded-2xl py-4 font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer"
              >
                {activeSession ? 'Gửi món xuống bếp' : 'Gửi đơn xuống bếp'}
              </button>
            )}

            {activeSession && (
              <div className="space-y-3">
                {hasPendingItems && (
                  <button
                    onClick={handleApproveItems}
                    disabled={submitting}
                    className="w-full bg-brand hover:brightness-110 disabled:opacity-50 text-white rounded-2xl py-4 font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-100"
                  >
                    <CheckCircle2 className="w-5 h-5" /> Duyệt món xuống bếp
                  </button>
                )}

                {!isOrderDone && !hasPendingItems && (
                  <div className="flex items-center gap-2 p-4 bg-amber-50 rounded-2xl border border-amber-100 mb-2">
                    <AlertCircle className="w-5 h-5 text-amber-500 animate-pulse" />
                    <p className="text-[10px] font-black uppercase text-amber-600 tracking-widest leading-tight">
                      Món đang được đầu bếp xử lý...
                    </p>
                  </div>
                )}

                {isOrderDone && (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={handleManualPayment}
                      disabled={submitting}
                      className="bg-[#27ae60] hover:bg-[#219150] disabled:opacity-50 text-white rounded-2xl py-4 font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-100"
                    >
                      <CreditCard className="w-4 h-4" /> Tiền mặt
                    </button>
                    {/* <button
                      onClick={handleMockPayment}
                      disabled={submitting}
                      className="bg-brand hover:brightness-110 disabled:opacity-50 text-white rounded-2xl py-4 font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-100"
                    >
                      <Save className="w-4 h-4" /> Xác nhận CK
                    </button> */}
                  </div>
                )}

                {isOrderDone && (
                  <div className="flex items-center justify-center gap-2 text-emerald-600 font-black text-[10px] uppercase tracking-[0.2em] py-2">
                    <CheckCircle2 className="w-4 h-4" /> Đã xong tất cả món
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* MOBILE SIDEBAR (DANH MỤC) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/50 z-[100] md:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
              className="fixed top-0 left-0 bottom-0 w-72 bg-white shadow-2xl z-[101] flex flex-col py-6 md:hidden overflow-y-auto"
            >
              <div className="flex items-center justify-between px-6 mb-8">
                <h2 className="font-bold text-lg text-gray-800">DANH MỤC</h2>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-gray-400 hover:text-red-500 bg-gray-50 rounded-full cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex flex-col gap-2 px-4">
                {categories.map((cat) => {
                  const active = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => { setSelectedCategory(cat); setIsMobileMenuOpen(false); }}
                      className={`flex items-center gap-4 p-4 rounded-2xl transition-all cursor-pointer ${active ? 'bg-gradient-to-r from-[#f97316] to-[#fb923c] text-white shadow-lg shadow-orange-200' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                      <Table2 className="w-6 h-6 opacity-80" />
                      <span className="font-bold text-sm tracking-wide">{cat}</span>
                    </button>
                  );
                })}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Hide Scrollbar Style */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #fee2e2; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #fca5a5; }
      `}</style>

      {/* Cửa sổ bật lên chi tiết món */}
      <AnimatePresence>
        {selectedMenuItem && (
          <StaffItemDetailModal
            item={selectedMenuItem}
            onClose={() => setSelectedMenuItem(null)}
            onAddToCart={handleAddToCartFromModal}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
