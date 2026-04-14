import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '@/src/lib/axiosClient';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, Minus, ShoppingCart, Table2,
  Trash2, ChevronRight, Settings, Scan,
  History, CreditCard, Save, ChevronUp, ChevronDown,
  LogOut, HandCoins, CheckCircle2, AlertCircle
} from 'lucide-react';
import { Button } from '../../components/Button';
import { useAuth } from '../../AuthContext';
import { MenuItem, Table } from '../../types';
import { getMenuItemCategoryName, getMenuItemId, getMenuItemImageUrl } from '../../lib/menuHelpers';

type StaffCartItem = {
  menuItemId: string;
  name: string;
  basePrice: number;
  quantity: number;
  category?: string;
  image?: string;
};

export const StaffPOSPage = () => {
  const [tables, setTables] = useState<Table[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [selectedTableId, setSelectedTableId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<StaffCartItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const selectedTable = tables.find(t => t.id === selectedTableId || (t as any)._id === selectedTableId);

  const [activeSession, setActiveSession] = useState<any>(null);

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
  const totalPrice = cart.reduce((sum, item) => sum + (item.basePrice * item.quantity), 0);

  const addToCart = (item: MenuItem) => {
    const itemId = getMenuItemId(item);
    setCart(prev => {
      const found = prev.find(x => x.menuItemId === itemId);
      if (found) {
        return prev.map(x => x.menuItemId === itemId ? { ...x, quantity: x.quantity + 1 } : x);
      }
      return [...prev, {
        menuItemId: itemId,
        name: item.name,
        basePrice: item.price,
        quantity: 1,
        category: getMenuItemCategoryName(item),
        image: getMenuItemImageUrl(item),
      }];
    });
  };

  const updateQuantity = (menuItemId: string, delta: number) => {
    setCart(prev => prev.map(item => item.menuItemId === menuItemId
      ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
    ));
  };

  const removeFromCart = (menuItemId: string) => {
    setCart(prev => prev.filter(item => item.menuItemId !== menuItemId));
  };

  const handleSubmitOrder = async () => {
    if (!selectedTableId) return toast.error('Chọn bàn trống trước khi đặt món');
    if (cart.length === 0) return toast.error('Giỏ hàng đang trống');
    setSubmitting(true);
    try {
      await axios.post('/api/orders/counter', {
        tableId: selectedTableId,
        items: cart.map(item => ({
          menuItemId: item.menuItemId,
          name: item.name,
          basePrice: item.basePrice,
          quantity: item.quantity,
          category: item.category || 'Chưa phân loại',
          image: item.image?.replace('/api/images/', '')
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

      {/* SIDEBAR TRÁI - DANH MỤC (NHƯ TRONG ẢNH) */}
      <aside className="w-24 bg-white flex flex-col items-center py-6 border-r border-gray-100 shadow-sm z-20">
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
                className="flex flex-col items-center gap-1 group"
              >
                <div className={`p-3 rounded-2xl transition-all duration-300 ${active ? 'bg-gradient-to-br from-[#ff6b6b] to-[#ff8e8e] text-white shadow-xl shadow-red-200' : 'text-gray-400 hover:bg-gray-50'}`}>
                  <Table2 className="w-6 h-6" />
                </div>
                <span className={`text-[10px] font-bold ${active ? 'text-[#ff6b6b]' : 'text-gray-400'}`}>{cat}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-auto flex flex-col gap-8 pb-4">
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
        </div>
      </aside>

      {/* NỘI DUNG CHÍNH (GIỮA) */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar Header */}
        <header className="px-8 py-6 flex items-center justify-between bg-transparent">
          <div>
            <h1 className="text-3xl font-extrabold text-[#2d3436]">Quầy nhân viên</h1>
            <p className="text-gray-400 text-sm font-medium">Cak Benu Food & Beverages</p>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative w-96 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-[#ff6b6b] transition-colors" />
              <input
                type="text"
                placeholder="Search or scan for items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border-none rounded-2xl py-3.5 pl-12 pr-4 shadow-sm focus:ring-2 focus:ring-[#ff6b6b]/20 outline-none transition-all text-sm"
              />
              <Scan className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
            </div>

            <div className="flex items-center gap-3 bg-[#ff6b6b] text-white px-4 py-2 rounded-2xl shadow-lg shadow-red-100">
              <div className="w-8 h-8 rounded-xl bg-white/20 overflow-hidden">
                <img src="https://ui-avatars.com/api/?name=Staff" alt="user" className="w-full h-full object-cover" />
              </div>
              <span className="font-bold text-sm">{user?.name || 'Boy Raka'}</span>
            </div>
            <button className="p-3 bg-white rounded-2xl shadow-sm text-gray-400 hover:text-[#ff6b6b] transition-colors">
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

        {/* Section: Chọn Bàn (Thay thế cho Choose Category) */}
        <div className="px-8 mb-6 flex items-center gap-8">
          <div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">Choose Table</span>
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-50">
              <span className="font-bold text-[#ff6b6b]">{selectedTable?.name || 'None'}</span>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </div>
          </div>
          <div className="flex-1 overflow-x-auto no-scrollbar py-2">
            <div className="flex gap-3">
              {tables.map(table => (
                <button
                  key={table.id}
                  onClick={() => setSelectedTableId(table.id)}
                  className={`px-6 py-2 rounded-xl font-bold whitespace-nowrap transition-all duration-300 ${selectedTableId === table.id ? 'bg-[#ff6b6b] text-white shadow-md' : 'bg-white text-gray-400 hover:shadow-sm border border-gray-50'}`}
                >
                  Bàn {table.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Menu Grid */}
        <div className="flex-1 overflow-y-auto px-8 pb-10 no-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
            {filteredMenu.map(item => (
              <motion.div
                key={item.id || item._id}
                whileHover={{ y: -5 }}
                className={`bg-white rounded-[2.5rem] p-4 relative shadow-sm border-2 transition-all cursor-pointer ${cart.find(x => x.menuItemId === (item.id || item._id)) ? 'border-[#ff6b6b]' : 'border-transparent'}`}
                onClick={() => addToCart(item)}
              >
                <div className="absolute top-6 left-6 z-10 bg-[#ff6b6b] text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-lg">
                  Rp {item.price.toLocaleString()}
                </div>

                {cart.find(x => x.menuItemId === (item.id || item._id)) && (
                  <div className="absolute bottom-20 right-6 z-10 bg-[#ff6b6b] text-white p-1 rounded-lg shadow-lg">
                    <Plus className="w-4 h-4" />
                  </div>
                )}

                <div className="h-44 rounded-[2rem] overflow-hidden mb-4 shadow-inner">
                  <img
                    src={item.images?.[0] ? `/api/images/${item.images[0]}` : '/placeholder.png'}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="px-2 pb-2">
                  <h3 className="font-bold text-[#2d3436] text-sm leading-tight mb-1">{item.name}</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter italic">Regular Portion</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </main>

      {/* GIỎ HÀNG BÊN PHẢI (NHƯ TRONG ẢNH) */}
      <aside className="w-[420px] bg-white flex flex-col border-l border-gray-100 shadow-2xl relative z-30">

        {/* Header Tabs */}
        <div className="flex items-center px-4 py-6 border-b border-gray-50">
          <button className="flex-1 flex items-center justify-center gap-2 text-[#ff6b6b] font-bold text-sm">
            <CreditCard className="w-4 h-4" /> Payment
          </button>
          {/* <button className="flex-1 flex items-center justify-center gap-2 text-gray-300 font-bold text-sm">
             <Plus className="w-4 h-4" /> Place Order
           </button>
           <button className="flex-1 flex items-center justify-center gap-2 text-gray-300 font-bold text-sm">
             <History className="w-4 h-4" /> History
           </button> */}
        </div>

        {/* New Order Header */}
        <div className={`px-8 py-6 m-4 rounded-[2rem] text-white shadow-lg ${activeSession ? 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-100' : 'bg-gradient-to-r from-[#ff6b6b] to-[#ff8e8e] shadow-red-100'}`}>
          <h2 className="text-xl font-bold">{activeSession ? 'Active Table' : 'New Order'}</h2>
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
                <span>Subtotal:</span>
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
                <div key={item.menuItemId} className="flex items-center gap-4">
                  <button onClick={() => removeFromCart(item.menuItemId)} className="p-2 text-red-300 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-[#2d3436] truncate">{item.name}</h4>
                    <p className="text-xs text-gray-400 mt-0.5">@ {item.basePrice.toLocaleString()}</p>
                  </div>
                  <div className="flex items-center border border-gray-100 rounded-lg overflow-hidden h-10">
                    <span className="w-10 text-center font-bold text-sm">{item.quantity}</span>
                    <div className="flex flex-col border-l border-gray-100">
                      <button onClick={() => updateQuantity(item.menuItemId, 1)} className="px-2 py-0.5 hover:bg-gray-50 bg-[#ff6b6b] text-white">
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button onClick={() => updateQuantity(item.menuItemId, -1)} className="px-2 py-0.5 hover:bg-gray-50 text-gray-400">
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="w-20 text-right font-bold text-sm text-[#2d3436]">
                    {(item.basePrice * item.quantity).toLocaleString()}
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
                disabled={submitting || !selectedTableId}
                className="w-full bg-[#111] hover:bg-slate-800 disabled:opacity-50 text-white rounded-2xl py-4 font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg"
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
      </aside>

      {/* Hide Scrollbar Style */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};
