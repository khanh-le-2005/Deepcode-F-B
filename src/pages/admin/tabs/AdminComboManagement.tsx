import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Search, Plus, Edit2, Trash2, X, CheckCircle2 } from 'lucide-react';
import axios from '@/src/lib/axiosClient';
import { toast } from 'react-toastify';
import { Combo, MenuItem } from '../../../types';
import { Button } from '../../../components/Button';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getMenuItemCategoryName } from '../../../lib/menuHelpers';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type ComboFormState = {
  name: string;
  description: string;
  price: number;
  status: 'available' | 'unavailable';
  menuItemIds: string[];
};

export const AdminComboManagement = () => {
  const [combos, setCombos] = useState<Combo[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCombo, setEditingCombo] = useState<Combo | null>(null);
  const [form, setForm] = useState<ComboFormState>({
    name: '',
    description: '',
    price: 0,
    status: 'available',
    menuItemIds: [],
  });

  useEffect(() => {
    fetchCombos();
    fetchMenuItems();
  }, []);

  const fetchCombos = () => {
    axios.get('/api/combos')
      .then(res => setCombos(res.data || []))
      .catch(err => console.error('Failed to fetch combos:', err));
  };

  const fetchMenuItems = () => {
    axios.get('/api/menu')
      .then(res => setMenuItems(res.data || []))
      .catch(err => console.error('Failed to fetch menu items:', err));
  };

  const openCreateForm = () => {
    setEditingCombo(null);
    setForm({
      name: '',
      description: '',
      price: 0,
      status: 'available',
      menuItemIds: [],
    });
    setIsFormOpen(true);
  };

  const openEditForm = (combo: Combo) => {
    setEditingCombo(combo);
    setForm({
      name: combo.name || '',
      description: combo.description || '',
      price: combo.price || 0,
      status: combo.status || 'available',
      menuItemIds: (combo.menuItemIds || []).map((item: any) => item?._id || item?.id || item).filter(Boolean),
    });
    setIsFormOpen(true);
  };

  const handleToggleMenuItem = (menuItemId: string) => {
    setForm(prev => ({
      ...prev,
      menuItemIds: prev.menuItemIds.includes(menuItemId)
        ? prev.menuItemIds.filter(id => id !== menuItemId)
        : [...prev.menuItemIds, menuItemId],
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Vui lòng nhập tên combo');
      return;
    }

    if (form.menuItemIds.length === 0) {
      toast.error('Chọn ít nhất 1 món cho combo');
      return;
    }

    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        status: form.status,
        menuItemIds: form.menuItemIds,
      };

      if (editingCombo) {
        await axios.put(`/api/combos/${editingCombo.id || editingCombo._id}`, payload);
        toast.success('Cập nhật combo thành công!');
      } else {
        await axios.post('/api/combos', payload);
        toast.success('Tạo combo mới thành công!');
      }

      setIsFormOpen(false);
      setEditingCombo(null);
      fetchCombos();
    } catch (err) {
      console.error('Failed to save combo:', err);
      toast.error('Không thể lưu combo!');
    }
  };

  const handleDelete = async (combo: Combo) => {
    if (!window.confirm(`Xoá combo "${combo.name}"?`)) return;
    try {
      await axios.delete(`/api/combos/${combo.id || combo._id}`);
      toast.success('Đã xoá combo!');
      fetchCombos();
    } catch (err) {
      console.error('Failed to delete combo:', err);
      toast.error('Không thể xoá combo!');
    }
  };

  const filteredCombos = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return combos;
    return combos.filter(combo => {
      const comboName = combo.name?.toLowerCase() || '';
      const comboDesc = combo.description?.toLowerCase() || '';
      return comboName.includes(term) || comboDesc.includes(term);
    });
  }, [combos, searchTerm]);

  const selectedMenuItems = menuItems.filter(item => form.menuItemIds.includes(item.id || item._id || ''));
  const comboTotal = selectedMenuItems.reduce((sum, item) => sum + (item.price || 0), 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Quản lý combo</h2>
          {/* <p className="text-gray-500 font-medium mt-1">Tạo và quản lý các gói món theo đúng API `/api/combos`</p> */}
        </div>
        <Button variant="secondary" size="lg" onClick={openCreateForm} className="shadow-xl shadow-amber-500/20">
          <Plus className="w-5 h-5" /> Thêm combo
        </Button>
      </div>

      <div className="relative max-w-xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Tìm kiếm combo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white border border-gray-100 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-sm transition-all"
        />
      </div>

      <div className="grid gap-6">
        <AnimatePresence>
          {filteredCombos.map((combo, i) => {
            const comboItems = (combo.menuItemIds || []).map((item: any) => item?.name || item?.title || item).filter(Boolean);
            return (
              <motion.div
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                key={combo.id || combo._id}
                className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100"
              >
                <div className="flex flex-col lg:flex-row lg:items-center gap-6 justify-between">
                  <div className="flex items-start gap-5">
                    <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 border border-amber-100">
                      <Package className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-gray-900">{combo.name}</h3>
                      <p className="text-gray-500 mt-1 max-w-2xl">{combo.description || 'Không có mô tả'}</p>
                      <div className="flex flex-wrap gap-2 mt-4">
                        {comboItems.slice(0, 6).map((itemName: string, idx: number) => (
                          <span key={`${itemName}-${idx}`} className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-full text-xs font-bold text-gray-600">
                            {itemName}
                          </span>
                        ))}
                        {comboItems.length > 6 && (
                          <span className="px-3 py-1.5 bg-amber-50 border border-amber-100 rounded-full text-xs font-black text-amber-600">
                            +{comboItems.length - 6}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs font-black uppercase tracking-widest text-gray-400">Giá combo</p>
                      <p className="text-3xl font-black text-amber-600">{Number(combo.price || 0).toLocaleString()}đ</p>
                    </div>
                    <span className={cn(
                      "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border",
                      combo.status === 'available'
                        ? 'bg-emerald-100 text-emerald-600 border-emerald-200'
                        : 'bg-gray-100 text-gray-500 border-gray-200'
                    )}>
                      {combo.status === 'available' ? 'Đang bán' : 'Tạm ẩn'}
                    </span>
                    <button
                      onClick={() => openEditForm(combo)}
                      className="p-3 bg-gray-50 text-gray-500 rounded-xl hover:bg-gray-100 transition-all"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(combo)}
                      className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black text-gray-900">{editingCombo ? 'Sửa combo' : 'Thêm combo mới'}</h3>
                <p className="text-gray-500 mt-1">Chọn nhiều món từ menu để tạo combo.</p>
              </div>
              <button onClick={() => setIsFormOpen(false)} className="p-3 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 grid lg:grid-cols-2 gap-8 max-h-[75vh] overflow-y-auto">
              <div className="space-y-5">
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-1">Tên combo</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                    className="mt-2 w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    placeholder="Combo 3 món siêu lời"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-1">Mô tả</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                    className="mt-2 w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/20 min-h-32 resize-none"
                    placeholder="Mô tả ngắn cho combo"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-1">Giá combo</label>
                    <input
                      type="number"
                      value={form.price}
                      onChange={(e) => setForm(prev => ({ ...prev, price: Number(e.target.value) }))}
                      className="mt-2 w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-1">Trạng thái</label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value as ComboFormState['status'] }))}
                      className="mt-2 w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    >
                      <option value="available">Đang bán</option>
                      <option value="unavailable">Tạm ẩn</option>
                    </select>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-3xl p-5 border border-gray-100">
                  <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Tổng giá món đã chọn</p>
                  <div className="text-3xl font-black text-amber-600">{comboTotal.toLocaleString()}đ</div>
                  <p className="text-sm text-gray-500 mt-2">
                    Combo có thể được định giá thấp hơn tổng giá lẻ của từng món.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Chọn món trong combo</p>
                  <span className="text-xs font-black text-amber-600">{form.menuItemIds.length} món đã chọn</span>
                </div>

                <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-1">
                  {menuItems.map(item => {
                    const itemId = item.id || item._id || '';
                    const checked = form.menuItemIds.includes(itemId);
                    return (
                      <label
                        key={itemId}
                        className={cn(
                          "flex items-center justify-between gap-4 p-4 rounded-2xl border cursor-pointer transition-all",
                          checked ? "bg-amber-50 border-amber-200" : "bg-white border-gray-100 hover:bg-gray-50"
                        )}
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 truncate">{item.name}</p>
                          <p className="text-xs text-gray-500">{getMenuItemCategoryName(item)} • {Number(item.price || 0).toLocaleString()}đ</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggleMenuItem(itemId)}
                          className="w-5 h-5 accent-amber-500"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-8 bg-gray-50 border-t border-gray-100 flex gap-4">
              <Button variant="outline" className="flex-1 py-4" onClick={() => setIsFormOpen(false)}>
                Huỷ
              </Button>
              <Button variant="secondary" className="flex-1 py-4 shadow-lg shadow-amber-500/20" onClick={handleSave}>
                <CheckCircle2 className="w-4 h-4" /> Lưu combo
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
