import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Filter, Edit2, Trash2, Eye, EyeOff, Image as ImageIcon, UtensilsCrossed, ChevronRight, CheckCircle2, Clock, X } from 'lucide-react';
import axios from '@/src/lib/axiosClient';
import { toast } from 'react-toastify';
import { MenuItem } from '../../../types';
import { Button } from '../../../components/Button';
import { AdminMenuModal } from '../modals/AdminMenuModal';
import { cn } from '../../../lib/cn';
import { getMenuItemCategoryName, getMenuItemImageUrl, getMenuItemId } from '../../../lib/menuHelpers';

export const AdminMenuManagement = () => {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');

  useEffect(() => {
    fetchMenu();
  }, []);

  const fetchMenu = () => {
    // Weekly Menu v2: Admin fetches ALL items (including unpublished ones)
    axios.get('/api/menu/admin/all')
      .then(res => {
        setMenu(res.data);
      })
      .catch(err => console.error("Failed to fetch menu:", err));
  };

  const handleSave = async (data: any, files: File[] | null) => {
    try {
      const formData = new FormData();
      formData.append('data', JSON.stringify(data));
      if (files && files.length > 0) {
        files.slice(0, 5).forEach(file => formData.append('images', file));
      }

      const itemId = editingItem?._id || editingItem?.id;

      if (editingItem) {
        await axios.put(`/api/menu/${itemId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await axios.post('/api/menu', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      fetchMenu();
      setIsModalOpen(false);
      toast.success(editingItem ? 'Cập nhật món ăn thành công!' : 'Thêm món ăn mới thành công!');
    } catch (err) {
      console.error('Lỗi khi lưu:', err);
      toast.error('Không thể lưu thay đổi!');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xoá món này?')) {
      try {
        await axios.delete(`/api/menu/${id}`);
        fetchMenu();
        toast.success('Đã xoá món ăn!');
      } catch (err) {
        console.error("Failed to delete menu item:", err);
        toast.error('Lỗi khi xoá món ăn!');
      }
    }
  };

  const toggleStatus = async (item: MenuItem) => {
    const newStatus = item.status === 'available' ? 'unavailable' : 'available';
    try {
      const itemId = (item as any)._id || item.id;
      await axios.put(`/api/menu/${itemId}`, { status: newStatus });
      fetchMenu();
      toast.info(`Đã chuyển trạng thái sang: ${newStatus === 'available' ? 'Còn món' : 'Hết món'}`);
    } catch (err) {
      console.error('Failed to toggle status:', err);
      toast.error('Lỗi khi đổi trạng thái!');
    }
  };

  const handleToggleSelection = (id: string) => {
    setSelectedItemIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handlePublishWeekly = async () => {
    if (selectedItemIds.length === 0) return;
    try {
      await axios.patch('/api/menu/publish-weekly', { itemIds: selectedItemIds });
      toast.success(`Đã xuất bán ${selectedItemIds.length} món cho tuần tới!`);
      setSelectedItemIds([]);
      fetchMenu();
    } catch (err) {
      toast.error("Xuất bản thất bại");
    }
  };

  const handleUnpublish = async (id: string) => {
    if (!confirm("Bạn có chắc muốn gỡ món này khỏi thực đơn tuần?")) return;
    try {
      await axios.patch(`/api/menu/${id}/unpublish`);
      toast.info("Đã gỡ món khỏi thực đơn tuần");
      fetchMenu();
    } catch (err) {
      toast.error("Gỡ bỏ thất bại");
    }
  };

  const handleRenew = async (id: string) => {
    try {
      await axios.patch('/api/menu/publish-weekly', { itemIds: [id] });
      toast.success("Đã gia hạn thêm 7 ngày cho món này!");
      fetchMenu();
    } catch (err) {
      toast.error("Gia hạn thất bại");
    }
  };

  const isPublished = (item: MenuItem) => {
    if (!item.availableUntil) return false;
    return new Date(item.availableUntil) > new Date();
  };

  const categories = ['Tất cả', ...new Set(menu.map(item => getMenuItemCategoryName(item)))];
  const filteredMenu = menu.filter(item => {
    const normalizedCategory = getMenuItemCategoryName(item);
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Tất cả' || normalizedCategory === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-10 pb-12">
      {/* Header Area */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-gray-900 tracking-tight font-serif">Thực Đơn</h2>
          <p className="text-gray-500 font-medium mt-1">Cập nhật danh mục món ăn và đồ uống của nhà hàng</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Button
            variant="secondary"
            size="lg"
            onClick={() => {
              setEditingItem(null);
              setIsModalOpen(true);
            }}
            className="bg-brand text-white hover:bg-brand-dark px-8 h-14 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-brand/20 border-none transition-all hover:-translate-y-1"
          >
            <Plus className="w-5 h-5 mr-2" /> Thêm món mới
          </Button>
        </div>
      </div>

      {/* Selection Control & Actions */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4 p-4 bg-slate-50 border border-gray-100 rounded-3xl">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              if (selectedItemIds.length === filteredMenu.length) {
                setSelectedItemIds([]);
              } else {
                setSelectedItemIds(filteredMenu.map(m => getMenuItemId(m)));
              }
            }}
            className="px-6 py-2 bg-white border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-900 hover:border-brand hover:text-brand transition-all flex items-center gap-2"
          >
            <CheckCircle2 className={cn("w-4 h-4", selectedItemIds.length === filteredMenu.length ? "text-brand" : "text-gray-300")} />
            {selectedItemIds.length === filteredMenu.length ? "Bỏ chọn tất cả" : "Chọn tất cả món đang lọc"}
          </button>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            Đã chọn: <span className="text-brand">{selectedItemIds.length}</span> món
          </span>
        </div>

        {selectedItemIds.length > 0 && (
          <button
            onClick={handlePublishWeekly}
            className="w-full lg:w-auto px-10 py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all flex items-center justify-center gap-3"
          >
            <Plus className="w-4 h-4" /> Xuất bán tuần cho các món đã chọn
          </button>
        )}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="relative group lg:max-w-md w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-brand transition-colors" />
          <input
            type="text"
            placeholder="Tìm món ăn..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-gray-100 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-brand/20 shadow-card transition-all"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {categories.map((cat, index) => (
            <button
              key={`${cat}-${index}`}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border shrink-0",
                selectedCategory === cat
                  ? "bg-slate-900 text-white border-slate-900 shadow-xl shadow-slate-900/10"
                  : "bg-white text-gray-500 border-gray-100 hover:border-brand/40 hover:text-brand shadow-card"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        <AnimatePresence mode="popLayout">
          {filteredMenu.map((item, i) => {
            const itemId = getMenuItemId(item);
            return (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05 }}
                key={itemId}
                className={cn(
                  "premium-card overflow-hidden group/card relative transition-all duration-300",
                  item.status === 'unavailable' && "opacity-80 grayscale-[0.3]",
                  selectedItemIds.includes(itemId) && "ring-2 ring-brand ring-offset-4"
                )}
              >
                {/* Checkbox Overlay */}
                <div 
                  onClick={() => handleToggleSelection(itemId)}
                  className={cn(
                    "absolute top-4 right-4 z-20 w-8 h-8 rounded-xl border-2 flex items-center justify-center cursor-pointer transition-all",
                    selectedItemIds.includes(itemId) 
                      ? "bg-brand border-brand text-white" 
                      : "bg-white/20 backdrop-blur-md border-white/40 text-transparent hover:border-white"
                  )}
                >
                  <Plus className={cn("w-4 h-4 transition-transform", selectedItemIds.includes(itemId) ? "rotate-45" : "rotate-0")} />
                </div>

                {/* Image Section */}
                <div className="relative h-56 overflow-hidden bg-gray-50">
                  <img
                    src={getMenuItemImageUrl(item) || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&h=400&fit=crop&q=80'}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-110"
                    alt={item.name}
                  />

                  {/* Category Badge on Image */}
                  <div className="absolute top-4 left-4">
                    <span className="bg-white/90 backdrop-blur-md px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest text-slate-900 shadow-sm border border-white/20">
                      {getMenuItemCategoryName(item, 'Món chính')}
                    </span>
                    {isPublished(item) && (
                      <div className="flex items-center gap-1 group/badge">
                        <span className="ml-2 bg-emerald-500 text-white px-3 py-1 rounded-lg text-[8px] font-bold uppercase tracking-widest shadow-sm flex items-center gap-1">
                          Đang bán tuần
                        </span>
                        <div className="flex opacity-0 group-hover/badge:opacity-100 transition-opacity gap-1">
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleRenew(itemId); }}
                            className="bg-amber-500 text-white p-1 rounded-md hover:bg-amber-600 shadow-sm"
                            title="Gia hạn 7 ngày"
                          >
                            <Clock className="w-3 h-3" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleUnpublish(itemId); }}
                            className="bg-rose-500 text-white p-1 rounded-md hover:bg-rose-600 shadow-sm"
                            title="Gỡ khỏi tuần"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Quick Actions Overlay */}
                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3 backdrop-blur-[2px]">
                    <button
                      onClick={() => {
                        setEditingItem(item);
                        setIsModalOpen(true);
                      }}
                      className="w-12 h-12 bg-white text-slate-900 rounded-2xl flex items-center justify-center shadow-2xl hover:scale-110 transition-transform active:scale-95"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(itemId)}
                      className="w-12 h-12 bg-rose-500 text-white rounded-2xl flex items-center justify-center shadow-2xl hover:scale-110 transition-transform active:scale-95"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  {item.status === 'unavailable' && (
                    <div className="absolute inset-x-0 bottom-0 py-2 bg-slate-950/80 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-[0.2em] text-center">
                      Hết món
                    </div>
                  )}
                </div>

                {/* Content Section */}
                <div className="p-6 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <h4 className="font-serif font-black text-xl text-gray-900 leading-tight group-hover/card:text-brand transition-colors">{item.name}</h4>
                    <button
                      onClick={() => toggleStatus(item)}
                      className={cn(
                        "w-10 h-10 rounded-xl transition-all flex items-center justify-center shrink-0 border",
                        item.status === 'available'
                          ? "text-emerald-500 bg-emerald-50 border-emerald-100"
                          : "text-gray-400 bg-gray-50 border-gray-100"
                      )}
                    >
                      {item.status === 'available' ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                  </div>

                  {item.description && (
                    <p className="text-gray-400 text-xs line-clamp-2 leading-relaxed">{item.description}</p>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                    <span className="text-2xl font-black text-slate-900 tracking-tight">{item.price.toLocaleString()}đ</span>
                    <button className="text-[10px] font-black uppercase tracking-widest text-brand flex items-center gap-1 group/btn">
                      Chi tiết <ChevronRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {filteredMenu.length === 0 && (
        <div className="premium-card py-32 flex flex-col items-center justify-center text-center">
          <div className="w-24 h-24 bg-gray-50 rounded-[3rem] flex items-center justify-center mb-6">
            <UtensilsCrossed className="w-10 h-10 text-gray-200" />
          </div>
          <h3 className="text-2xl font-black text-gray-900 font-serif mb-2">Không tìm thấy món ăn</h3>
          <p className="text-gray-400 font-medium">Bạn có thể thêm món mới bằng nút "Thêm món mới" phía trên</p>
        </div>
      )}

      <AdminMenuModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        item={editingItem}
      />
    </div>
  );
};
