import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, CalendarDays, Edit2, Trash2, X, CheckCircle2, CalendarRange, UtensilsCrossed } from 'lucide-react';
import axios from '@/src/lib/axiosClient';
import { toast } from 'react-toastify';
import { Button } from '../../../components/Button';
import { MenuItem } from '../../../types';
import { cn } from '../../../lib/cn';
import { getMenuItemCategoryName } from '../../../lib/menuHelpers';

type WeeklyMenuFormState = {
  title: string;
  startDate: string;
  endDate: string;
  status: 'draft' | 'active';
  menuItems: string[];
};

type WeeklyMenuRecord = {
  id?: string;
  _id?: string;
  title: string;
  startDate: string;
  endDate: string;
  status: 'draft' | 'active';
  menuItems: Array<string | { _id?: string; id?: string; name?: string }>;
};

const extractList = <T,>(payload: any): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  if (Array.isArray(payload?.data)) return payload.data as T[];
  if (Array.isArray(payload?.results)) return payload.results as T[];
  if (Array.isArray(payload?.weeklyMenus)) return payload.weeklyMenus as T[];
  if (Array.isArray(payload?.items)) return payload.items as T[];
  return [];
};

const toLocalDateTimeInput = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
};

export const AdminWeeklyMenuManagement = () => {
  const [weeklyMenus, setWeeklyMenus] = useState<WeeklyMenuRecord[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<WeeklyMenuRecord | null>(null);
  const [form, setForm] = useState<WeeklyMenuFormState>({
    title: '',
    startDate: '',
    endDate: '',
    status: 'draft',
    menuItems: [],
  });

  const fetchWeeklyMenus = () => {
    axios.get('/api/weekly-menu')
      .then(res => setWeeklyMenus(extractList<WeeklyMenuRecord>(res.data)))
      .catch(err => {
        console.error('Failed to fetch weekly menus:', err);
        toast.error('Không tải được danh sách thực đơn tuần.');
      });
  };

  const fetchMenuItems = () => {
    axios.get('/api/menu')
      .then(res => setMenuItems(extractList<MenuItem>(res.data)))
      .catch(err => {
        console.error('Failed to fetch menu items:', err);
        toast.error('Không tải được danh sách món.');
      });
  };

  useEffect(() => {
    fetchWeeklyMenus();
    fetchMenuItems();
  }, []);

  const openCreateForm = () => {
    setEditingMenu(null);
    setForm({
      title: '',
      startDate: '',
      endDate: '',
      status: 'draft',
      menuItems: [],
    });
    setIsFormOpen(true);
  };

  const openEditForm = (menu: WeeklyMenuRecord) => {
    setEditingMenu(menu);
    setForm({
      title: menu.title || '',
      startDate: toLocalDateTimeInput(menu.startDate),
      endDate: toLocalDateTimeInput(menu.endDate),
      status: menu.status || 'draft',
      menuItems: (menu.menuItems || []).map((item: any) => item?._id || item?.id || item).filter(Boolean),
    });
    setIsFormOpen(true);
  };

  const handleToggleMenuItem = (menuItemId: string) => {
    setForm(prev => ({
      ...prev,
      menuItems: prev.menuItems.includes(menuItemId)
        ? prev.menuItems.filter(id => id !== menuItemId)
        : [...prev.menuItems, menuItemId],
    }));
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error('Vui lòng nhập tên thực đơn tuần');
      return;
    }
    if (!form.startDate || !form.endDate) {
      toast.error('Vui lòng chọn ngày bắt đầu và ngày kết thúc');
      return;
    }
    if (form.menuItems.length === 0) {
      toast.error('Chọn ít nhất 1 món cho thực đơn tuần');
      return;
    }

    try {
      const payload = {
        title: form.title.trim(),
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        status: form.status,
        menuItems: form.menuItems,
      };

      const weeklyMenuId = editingMenu?.id || editingMenu?._id;
      if (editingMenu) {
        await axios.put(`/api/weekly-menu/${weeklyMenuId}`, payload);
        toast.success('Cập nhật thực đơn tuần thành công!');
      } else {
        await axios.post('/api/weekly-menu', payload);
        toast.success('Tạo thực đơn tuần thành công!');
      }

      setIsFormOpen(false);
      setEditingMenu(null);
      fetchWeeklyMenus();
    } catch (err: any) {
      console.error('Failed to save weekly menu:', err);
      const apiMessage = err?.response?.data?.error?.message || err?.response?.data?.message;
      toast.error(apiMessage || 'Không thể lưu thực đơn tuần!');
    }
  };

  const handleDelete = async (menu: WeeklyMenuRecord) => {
    if (!window.confirm(`Xoá thực đơn tuần "${menu.title}"?`)) return;
    try {
      await axios.delete(`/api/weekly-menu/${menu.id || menu._id}`);
      toast.success('Đã xoá thực đơn tuần!');
      fetchWeeklyMenus();
    } catch (err: any) {
      console.error('Failed to delete weekly menu:', err);
      const apiMessage = err?.response?.data?.error?.message || err?.response?.data?.message;
      toast.error(apiMessage || 'Không thể xoá thực đơn tuần!');
    }
  };

  const filteredMenus = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return weeklyMenus;
    return weeklyMenus.filter((menu) => {
      const title = menu.title?.toLowerCase() || '';
      const status = menu.status?.toLowerCase() || '';
      return title.includes(term) || status.includes(term);
    });
  }, [weeklyMenus, searchTerm]);

  const selectedMenuItems = menuItems.filter(item => form.menuItems.includes(item.id || item._id || ''));
  const selectedItemCount = form.menuItems.length;
  const activeCount = weeklyMenus.filter(menu => menu.status === 'active').length;
  const resolveMenuItemLabel = (item: string | { _id?: string; id?: string; name?: string; title?: string }) => {
    if (typeof item === 'object' && item) {
      return item.name || item.title || item._id || item.id || '';
    }

    const matchedItem = menuItems.find(menuItem => (menuItem.id || menuItem._id || '') === item);
    return matchedItem?.name || matchedItem?.title || item;
  };

  return (
    <div className="space-y-10 pb-12">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-gray-900 tracking-tight font-serif">Thực đơn tuần</h2>
          {/* <p className="text-gray-500 font-medium mt-1">Tạo lịch xuất bán món theo đúng API `/api/weekly-menu`</p> */}
        </div>
        <Button
          variant="secondary"
          size="lg"
          onClick={openCreateForm}
          className="bg-brand text-white hover:bg-brand-dark px-8 h-14 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-brand/20 border-none transition-all hover:-translate-y-1"
        >
          <Plus className="w-5 h-5 mr-2" /> Tạo lịch tuần
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="premium-card p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Tổng lịch</p>
          <div className="text-3xl font-black text-gray-900 mt-2">{weeklyMenus.length}</div>
        </div>
        <div className="premium-card p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Đang active</p>
          <div className="text-3xl font-black text-emerald-600 mt-2">{activeCount}</div>
        </div>
        <div className="premium-card p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Món trong form</p>
          <div className="text-3xl font-black text-amber-600 mt-2">{selectedItemCount}</div>
        </div>
      </div>

      <div className="relative max-w-xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Tìm lịch theo tên hoặc trạng thái..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white border border-gray-100 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-brand/20 shadow-sm transition-all"
        />
      </div>

      <div className="grid gap-6">
        <AnimatePresence>
          {filteredMenus.map((menu, i) => {
            const menuId = menu.id || menu._id || '';
            const itemNames = (menu.menuItems || []).map(resolveMenuItemLabel).filter(Boolean);
            return (
              <motion.div
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                key={menuId}
                className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100"
              >
                <div className="flex flex-col lg:flex-row lg:items-center gap-6 justify-between">
                  <div className="flex items-start gap-5">
                    <div className="w-16 h-16 bg-brand/10 rounded-2xl flex items-center justify-center text-brand border border-brand/10">
                      <CalendarDays className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-gray-900">{menu.title}</h3>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-500">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarRange className="w-4 h-4" />
                          {new Date(menu.startDate).toLocaleString('vi-VN')}
                        </span>
                        <span>→</span>
                        <span>{new Date(menu.endDate).toLocaleString('vi-VN')}</span>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-4">
                        {itemNames.slice(0, 6).map((itemName: string, idx: number) => (
                          <span key={`${itemName}-${idx}`} className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-full text-xs font-bold text-gray-600">
                            {itemName}
                          </span>
                        ))}
                        {itemNames.length > 6 && (
                          <span className="px-3 py-1.5 bg-brand/10 border border-brand/10 rounded-full text-xs font-black text-brand">
                            +{itemNames.length - 6}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 flex-wrap lg:justify-end">
                    <span className={cn(
                      "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border",
                      menu.status === 'active'
                        ? 'bg-emerald-100 text-emerald-600 border-emerald-200'
                        : 'bg-gray-100 text-gray-500 border-gray-200'
                    )}>
                      {menu.status === 'active' ? 'Active' : 'Draft'}
                    </span>
                    <span className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-gray-50 text-gray-500 border border-gray-100">
                      {itemNames.length} món
                    </span>
                    <button
                      onClick={() => openEditForm(menu)}
                      className="p-3 bg-gray-50 text-gray-500 rounded-xl hover:bg-gray-100 transition-all"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(menu)}
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

      {filteredMenus.length === 0 && (
        <div className="premium-card py-32 flex flex-col items-center justify-center text-center">
          <div className="w-24 h-24 bg-gray-50 rounded-[3rem] flex items-center justify-center mb-6">
            <CalendarDays className="w-10 h-10 text-gray-200" />
          </div>
          <h3 className="text-2xl font-black text-gray-900 font-serif mb-2">Chưa có thực đơn tuần</h3>
          <p className="text-gray-400 font-medium">Bấm “Tạo lịch tuần” để tạo tuần bán món đầu tiên</p>
        </div>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="bg-white w-full max-w-5xl rounded-[2.5rem] shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black text-gray-900">{editingMenu ? 'Sửa thực đơn tuần' : 'Tạo thực đơn tuần'}</h3>
                <p className="text-gray-500 mt-1">Chọn khoảng thời gian và các món được phép bán trong tuần.</p>
              </div>
              <button onClick={() => setIsFormOpen(false)} className="p-3 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 grid lg:grid-cols-2 gap-8 max-h-[75vh] overflow-y-auto">
              <div className="space-y-5">
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-1">Tên lịch tuần</label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                    className="mt-2 w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand/20"
                    placeholder="Thực đơn Tuần 1 - Tháng 4"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-1">Ngày bắt đầu</label>
                    <input
                      type="datetime-local"
                      value={form.startDate}
                      onChange={(e) => setForm(prev => ({ ...prev, startDate: e.target.value }))}
                      className="mt-2 w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand/20"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-1">Ngày kết thúc</label>
                    <input
                      type="datetime-local"
                      value={form.endDate}
                      onChange={(e) => setForm(prev => ({ ...prev, endDate: e.target.value }))}
                      className="mt-2 w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-1">Trạng thái</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value as WeeklyMenuFormState['status'] }))}
                    className="mt-2 w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand/20"
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                  </select>
                </div>

                <div className="bg-gray-50 rounded-3xl p-5 border border-gray-100">
                  <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Số món đã chọn</p>
                  <div className="text-3xl font-black text-brand">{selectedItemCount}</div>
                  <p className="text-sm text-gray-500 mt-2">Thực đơn tuần chỉ nhận món từ danh sách menu hiện có.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Chọn món cho tuần</p>
                  <span className="text-xs font-black text-brand">{form.menuItems.length} món đã chọn</span>
                </div>

                <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-1">
                  {menuItems.map(item => {
                    const itemId = item.id || item._id || '';
                    const checked = form.menuItems.includes(itemId);
                    return (
                      <label
                        key={itemId}
                        className={cn(
                          "flex items-center justify-between gap-4 p-4 rounded-2xl border cursor-pointer transition-all",
                          checked ? "bg-brand/5 border-brand/20" : "bg-white border-gray-100 hover:bg-gray-50"
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
                          className="w-5 h-5 accent-brand"
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
              <Button variant="secondary" className="flex-1 py-4 shadow-lg shadow-brand/20" onClick={handleSave}>
                <CheckCircle2 className="w-4 h-4" /> Lưu lịch tuần
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
