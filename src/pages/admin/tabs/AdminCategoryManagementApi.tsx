import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowUpDown,
  CheckCircle2,
  Edit2,
  Eye,
  EyeOff,
  Filter,
  Image as ImageIcon,
  Plus,
  Search,
  Sparkles,
  Tag,
  Trash2,
  Upload,
  WandSparkles,
} from 'lucide-react';
import axios from '@/src/lib/axiosClient';
import { toast } from 'react-toastify';
import { Button } from '../../../components/Button';
import { cn } from '../../../lib/cn';
import { Category } from '../../../types';

type CategoryFormState = {
  name: string;
  displayOrder: number;
  status: Category['status'];
  imageFile: File | null;
  imagePreview: string;
};

const emptyForm = (): CategoryFormState => ({
  name: '',
  displayOrder: 0,
  status: 'available',
  imageFile: null,
  imagePreview: '',
});

const normalizeCategory = (item: any): Category => ({
  id: item._id || item.id,
  _id: item._id || item.id,
  name: item.name || '',
  image: item.image || '',
  displayOrder: Number(item.displayOrder || 0),
  status: item.status === 'unavailable' ? 'unavailable' : 'available',
  slug: item.slug || '',
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
});

const categoryImageUrl = (category: Category) => (category.image ? `/api/images/${category.image}` : '');

const extractList = (payload: any) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.categories)) return payload.categories;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

export const AdminCategoryManagement = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | Category['status']>('all');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryFormState>(emptyForm);

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      const res = await axios.get('/api/categories');
      const list = extractList(res.data).map(normalizeCategory);
      if (!Array.isArray(list)) {
        throw new Error('Categories API did not return an array');
      }
      setCategories(list);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      toast.error('Không tải được danh mục từ backend.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const stats = useMemo(() => ({
    total: categories.length,
    active: categories.filter((item) => item.status === 'available').length,
    hidden: categories.filter((item) => item.status === 'unavailable').length,
    nextOrder: categories.length > 0 ? Math.max(...categories.map((item) => item.displayOrder || 0)) + 1 : 1,
  }), [categories]);

  const filteredCategories = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return categories.filter((category) => {
      const matchesStatus = selectedStatus === 'all' || category.status === selectedStatus;
      const matchesSearch =
        !term ||
        category.name.toLowerCase().includes(term) ||
        (category.slug || '').toLowerCase().includes(term) ||
        String(category.displayOrder || '').includes(term);
      return matchesStatus && matchesSearch;
    }).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0) || a.name.localeCompare(b.name));
  }, [categories, searchTerm, selectedStatus]);

  const openCreate = () => {
    setEditingCategory(null);
    setForm({
      ...emptyForm(),
      displayOrder: stats.nextOrder,
    });
  };

  const openEdit = (category: Category) => {
    setEditingCategory(category);
    setForm({
      name: category.name,
      displayOrder: category.displayOrder || stats.nextOrder,
      status: category.status,
      imageFile: null,
      imagePreview: categoryImageUrl(category),
    });
  };

  const handleImageChange = (file?: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({
        ...prev,
        imageFile: file,
        imagePreview: typeof reader.result === 'string' ? reader.result : '',
      }));
    };
    reader.readAsDataURL(file);
  };

  const persistCategory = async () => {
    if (!form.name.trim()) {
      toast.error('Vui lòng nhập tên danh mục.');
      return;
    }

    try {
      const payload = {
        name: form.name.trim(),
        displayOrder: Number(form.displayOrder || 0),
        status: form.status,
      };

      const body = new FormData();
      body.append('data', JSON.stringify(payload));
      if (form.imageFile) body.append('image', form.imageFile);

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };
      if (editingCategory) {
        await axios.put(`/api/categories/${editingCategory.id}`, body, config);
        toast.success('Cập nhật danh mục thành công!');
      } else {
        await axios.post('/api/categories', body, config);
        toast.success('Thêm danh mục mới thành công!');
      }

      setEditingCategory(null);
      setForm(emptyForm());
      await fetchCategories();
    } catch (error) {
      console.error('Failed to save category:', error);
      toast.error('Không thể lưu danh mục vào database.');
    }
  };

  const handleDelete = async (category: Category) => {
    if (!window.confirm(`Xoá danh mục "${category.name}"?`)) return;
    try {
      await axios.delete(`/api/categories/${category.id}`);
      toast.success('Đã xoá danh mục.');
      await fetchCategories();
    } catch (error) {
      console.error('Failed to delete category:', error);
      toast.error('Không thể xoá danh mục khỏi database.');
    }
  };

  const handleToggleStatus = async (category: Category) => {
    try {
      const nextStatus = category.status === 'available' ? 'unavailable' : 'available';
      const body = new FormData();
      body.append('data', JSON.stringify({
        name: category.name,
        displayOrder: category.displayOrder,
        status: nextStatus,
      }));
      await axios.put(`/api/categories/${category.id}`, body, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.info('Đã cập nhật trạng thái danh mục.');
      await fetchCategories();
    } catch (error) {
      console.error('Failed to toggle category status:', error);
      toast.error('Không thể đổi trạng thái danh mục trong database.');
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-950 p-8 text-white shadow-2xl lg:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.26),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_28%)]" />
        <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <h2 className="mt-5 text-4xl font-black tracking-tight font-serif lg:text-6xl">Danh Mục</h2>
          </div>

          <div className="grid grid-cols-3 gap-3 lg:min-w-[360px]">
            {[
              { label: 'Tổng', value: stats.total },
              { label: 'Đang bật', value: stats.active },
              { label: 'Đang ẩn', value: stats.hidden },
            ].map((item) => (
              <div key={item.label} className="rounded-[1.75rem] border border-white/10 bg-white/5 p-4 text-center backdrop-blur">
                <div className="text-3xl font-black leading-none">{item.value}</div>
                <div className="mt-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6 xl:flex-row">
        <div className="flex-1 space-y-6">
          <div className="premium-card p-6 lg:p-7">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-xl">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  type="text"
                  placeholder="Tìm theo tên, slug, thứ tự..."
                  className="w-full rounded-2xl border border-gray-100 bg-white py-4 pl-12 pr-4 text-sm shadow-card focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'all', label: 'Tất cả' },
                  { key: 'available', label: 'Đang bật' },
                  { key: 'unavailable', label: 'Đang ẩn' },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setSelectedStatus(item.key as typeof selectedStatus)}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all',
                      selectedStatus === item.key
                        ? 'border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/10'
                        : 'border-gray-100 bg-white text-gray-500 hover:border-brand/40 hover:text-brand',
                    )}
                  >
                    <Filter className="h-3.5 w-3.5" />
                    {item.label}
                  </button>
                ))}
                <Button onClick={openCreate} className="rounded-2xl px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em]">
                  <Plus className="h-3.5 w-3.5" />
                  Thêm danh mục
                </Button>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="premium-card flex items-center justify-center py-24 text-sm font-bold text-gray-400">
              Đang tải danh mục...
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
              <AnimatePresence mode="popLayout">
                {filteredCategories.map((category, index) => (
                  <motion.article
                    key={category.id}
                    layout
                    initial={{ opacity: 0, y: 16, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 12, scale: 0.98 }}
                    transition={{ delay: index * 0.04 }}
                    className={cn(
                      'overflow-hidden rounded-[2rem] border bg-white p-6 shadow-card',
                      category.status === 'unavailable' && 'opacity-80',
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border',
                              category.status === 'available'
                                ? 'border-amber-100 bg-amber-50 text-amber-600'
                                : 'border-gray-100 bg-gray-50 text-gray-400',
                            )}
                          >
                            {category.image ? (
                              <img src={categoryImageUrl(category)} alt={category.name} className="h-full w-full object-cover" />
                            ) : (
                              <Tag className="h-5 w-5" />
                            )}
                          </div>
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-400">
                              Thứ tự hiển thị #{category.displayOrder}
                            </div>
                            <h3 className="mt-1 text-2xl font-black text-slate-900 font-serif">{category.name}</h3>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <span className={cn(
                            'inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em]',
                            category.status === 'available' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500',
                          )}>
                            {category.status === 'available' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                            {category.status === 'available' ? 'Đang hiển thị' : 'Đang ẩn'}
                          </span>
                          <span className="inline-flex items-center rounded-full bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                            Slug: {category.slug || 'auto-generated'}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <div className="rounded-full bg-slate-950 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white">
                          ID {category.id}
                        </div>
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            onClick={() => openEdit(category)}
                            className="rounded-2xl border border-gray-100 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition-all hover:border-brand/30 hover:text-brand"
                          >
                            <Edit2 className="mr-1 inline h-3.5 w-3.5" />
                            Sửa
                          </button>
                          <button
                            onClick={() => handleToggleStatus(category)}
                            className="rounded-2xl border border-gray-100 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition-all hover:border-brand/30 hover:text-brand"
                          >
                            <ArrowUpDown className="mr-1 inline h-3.5 w-3.5" />
                            Đổi trạng thái
                          </button>
                          <button
                            onClick={() => handleDelete(category)}
                            className="rounded-2xl border border-gray-100 bg-white px-3 py-2 text-xs font-bold text-rose-500 transition-all hover:border-rose-200 hover:text-rose-600"
                          >
                            <Trash2 className="mr-1 inline h-3.5 w-3.5" />
                            Xoá
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 rounded-[1.75rem] bg-slate-50 p-4">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                        <Eye className="h-3.5 w-3.5" />
                        Preview
                      </div>
                      <p className="mt-2 text-sm leading-6 text-gray-500">
                        {category.image ? 'Danh mục đang có ảnh đại diện.' : 'Danh mục này chưa có ảnh đại diện.'}
                      </p>
                    </div>
                  </motion.article>
                ))}
              </AnimatePresence>
            </div>
          )}

          {!isLoading && filteredCategories.length === 0 && (
            <div className="premium-card flex flex-col items-center justify-center px-6 py-24 text-center">
              <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-[2.5rem] bg-gray-50">
                <WandSparkles className="h-10 w-10 text-gray-200" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 font-serif">Không có danh mục phù hợp</h3>
              <p className="mt-2 max-w-md text-sm text-gray-400">
                Thử đổi bộ lọc hoặc thêm danh mục mới.
              </p>
            </div>
          )}
        </div>

        <aside className="xl:w-[420px]">
          <div className="premium-card sticky top-28 p-6 lg:p-7">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-brand">Bảng điều khiển</div>
                <h3 className="mt-2 text-2xl font-black text-slate-900 font-serif">
                  {editingCategory ? 'Chỉnh sửa danh mục' : 'Tạo danh mục mới'}
                </h3>
                <p className="mt-2 text-sm leading-6 text-gray-500">
                  Dùng đúng `POST/PUT /api/categories` của backend, có upload ảnh danh mục.
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingCategory(null);
                  setForm(emptyForm());
                }}
                className="rounded-2xl border border-gray-100 bg-white px-3 py-2 text-xs font-black uppercase tracking-widest text-gray-500 transition-colors hover:border-brand/30 hover:text-brand"
              >
                Reset
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-gray-400">
                  Tên danh mục
                </span>
                <input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  type="text"
                  placeholder="Ví dụ: Đồ Uống Lạnh"
                  className="w-full rounded-2xl border border-gray-100 bg-white px-4 py-4 text-sm shadow-card focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
              </label>

              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-gray-400">
                    Thứ tự
                  </span>
                  <input
                    value={form.displayOrder}
                    onChange={(e) => setForm((prev) => ({ ...prev, displayOrder: Number(e.target.value) || 0 }))}
                    type="number"
                    min={0}
                    className="w-full rounded-2xl border border-gray-100 bg-white px-4 py-4 text-sm shadow-card focus:outline-none focus:ring-2 focus:ring-brand/20"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-gray-400">
                    Trạng thái
                  </span>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as Category['status'] }))}
                    className="w-full rounded-2xl border border-gray-100 bg-white px-4 py-4 text-sm shadow-card focus:outline-none focus:ring-2 focus:ring-brand/20"
                  >
                    <option value="available">Đang hiển thị</option>
                    <option value="unavailable">Đang ẩn</option>
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-gray-400">
                  Ảnh danh mục(nếu có)
                </span>
                <div className="overflow-hidden rounded-[1.75rem] border border-dashed border-gray-200 bg-white">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageChange(e.target.files?.[0] || null)}
                    className="hidden"
                    id="category-image-input"
                  />
                  <label htmlFor="category-image-input" className="flex cursor-pointer flex-col items-center justify-center gap-3 px-4 py-8 text-center">
                    {form.imagePreview ? (
                      <img src={form.imagePreview} alt="Preview" className="h-40 w-full rounded-[1.25rem] object-cover" />
                    ) : (
                      <>
                        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gray-50 text-gray-300">
                          <ImageIcon className="h-7 w-7" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">Chọn ảnh đại diện</p>
                          <p className="mt-1 text-xs text-gray-400">PNG, JPG hoặc WebP</p>
                        </div>
                      </>
                    )}
                    <span className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white">
                      <Upload className="h-3.5 w-3.5" />
                      Tải ảnh lên
                    </span>
                  </label>
                </div>
              </label>
            </div>

            <Button
              onClick={persistCategory}
              className="mt-6 w-full rounded-2xl bg-brand text-white shadow-xl shadow-brand/20 hover:bg-brand-dark"
              size="lg"
            >
              <Plus className="h-4 w-4" />
              {editingCategory ? 'Cập nhật danh mục' : 'Thêm danh mục'}
            </Button>

            {editingCategory && (
              <button
                onClick={() => {
                  setEditingCategory(null);
                  setForm(emptyForm());
                }}
                className="mt-3 w-full rounded-2xl border border-gray-100 bg-white px-4 py-3 text-xs font-black uppercase tracking-widest text-gray-500 transition-colors hover:border-brand/30 hover:text-brand"
              >
                Tạo mới thay vì sửa
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};
