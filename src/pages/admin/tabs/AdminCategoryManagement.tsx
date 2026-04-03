import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowUpDown,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  Filter,
  Plus,
  Search,
  Sparkles,
  Tag,
  Trash2,
  WandSparkles,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { Button } from '../../../components/Button';
import { cn } from '../../../lib/cn';
import { Category } from '../../../types';

const STORAGE_KEY = 'qr-dine-admin-categories';

const seededCategories: Category[] = [
  {
    id: 'cat-001',
    name: 'Món Chính',
    displayOrder: 1,
    status: 'available',
    description: 'Nhóm món ăn chủ lực trên thực đơn.',
    slug: 'mon-chinh',
    createdAt: '2026-04-01T00:00:00.000Z',
  },
  {
    id: 'cat-002',
    name: 'Lẩu & Nướng',
    displayOrder: 2,
    status: 'available',
    description: 'Phù hợp các món dùng chung theo nhóm khách.',
    slug: 'lau-nuong',
    createdAt: '2026-04-01T00:00:00.000Z',
  },
  {
    id: 'cat-003',
    name: 'Đồ Uống Lạnh',
    displayOrder: 3,
    status: 'available',
    description: 'Nước ép, trà, soda và các món giải khát.',
    slug: 'do-uong-lanh',
    createdAt: '2026-04-01T00:00:00.000Z',
  },
  {
    id: 'cat-004',
    name: 'Món Phụ',
    displayOrder: 4,
    status: 'unavailable',
    description: 'Các món ăn kèm đang tạm ẩn khỏi menu khách.',
    slug: 'mon-phu',
    createdAt: '2026-04-01T00:00:00.000Z',
  },
];

type CategoryDraft = {
  name: string;
  displayOrder: number;
  status: Category['status'];
  description: string;
};

const createEmptyDraft = (): CategoryDraft => ({
  name: '',
  displayOrder: 1,
  status: 'available',
  description: '',
});

const createSlug = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const readInitialCategories = () => {
  if (typeof window === 'undefined') {
    return seededCategories;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return seededCategories;
    const parsed = JSON.parse(raw) as Category[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : seededCategories;
  } catch {
    return seededCategories;
  }
};

export const AdminCategoryManagement = () => {
  const [categories, setCategories] = useState<Category[]>(readInitialCategories);
  const [selectedStatus, setSelectedStatus] = useState<'all' | Category['status']>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CategoryDraft>(createEmptyDraft);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
  }, [categories]);

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name)),
    [categories],
  );

  const filteredCategories = useMemo(() => {
    return sortedCategories.filter((category) => {
      const matchesStatus = selectedStatus === 'all' || category.status === selectedStatus;
      const matchesSearch =
        category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (category.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (category.slug || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [searchTerm, selectedStatus, sortedCategories]);

  const stats = useMemo(
    () => ({
      total: categories.length,
      active: categories.filter((item) => item.status === 'available').length,
      hidden: categories.filter((item) => item.status === 'unavailable').length,
      nextOrder: categories.length > 0 ? Math.max(...categories.map((item) => item.displayOrder)) + 1 : 1,
    }),
    [categories],
  );

  const resetForm = () => {
    setEditingId(null);
    setDraft(createEmptyDraft());
  };

  const handleEdit = (category: Category) => {
    setEditingId(category.id);
    setDraft({
      name: category.name,
      displayOrder: category.displayOrder,
      status: category.status,
      description: category.description || '',
    });
  };

  const handleDuplicate = (category: Category) => {
    const duplicate: Category = {
      ...category,
      id: `cat-${Date.now()}`,
      name: `${category.name} (bản sao)`,
      slug: createSlug(`${category.name} ban sao`),
      displayOrder: stats.nextOrder,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setCategories((prev) => [...prev, duplicate]);
    toast.success('Đã nhân bản danh mục.');
  };

  const handleDelete = (categoryId: string) => {
    if (!window.confirm('Bạn có chắc muốn xoá danh mục này?')) return;
    setCategories((prev) => prev.filter((item) => item.id !== categoryId));
    if (editingId === categoryId) {
      resetForm();
    }
    toast.success('Đã xoá danh mục.');
  };

  const handleToggleStatus = (categoryId: string) => {
    setCategories((prev) =>
      prev.map((item) =>
        item.id === categoryId
          ? { ...item, status: item.status === 'available' ? 'unavailable' : 'available', updatedAt: new Date().toISOString() }
          : item,
      ),
    );
    toast.info('Đã cập nhật trạng thái danh mục.');
  };

  const handleSubmit = () => {
    if (!draft.name.trim()) {
      toast.error('Vui lòng nhập tên danh mục.');
      return;
    }

    const now = new Date().toISOString();
    const payload: Category = {
      id: editingId || `cat-${Date.now()}`,
      name: draft.name.trim(),
      displayOrder: Number(draft.displayOrder) || stats.nextOrder,
      status: draft.status,
      description: draft.description.trim(),
      slug: createSlug(draft.name),
      createdAt: editingId ? categories.find((item) => item.id === editingId)?.createdAt : now,
      updatedAt: now,
    };

    setCategories((prev) => {
      const next = editingId
        ? prev.map((item) => (item.id === editingId ? payload : item))
        : [...prev, payload];

      return [...next].sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));
    });

    toast.success(editingId ? 'Đã cập nhật danh mục.' : 'Đã thêm danh mục mới.');
    resetForm();
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-950 text-white p-8 lg:p-10 shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.24),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_25%)]" />
        <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-amber-200">
              <Sparkles className="h-3.5 w-3.5" />
              UI danh mục đang làm trước backend
            </div>
            <h2 className="mt-5 text-4xl font-black tracking-tight font-serif lg:text-6xl">Danh Mục</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 lg:text-base">
              Quản lý nhóm món hiển thị trên menu khách hàng. Trang này đang chạy bằng dữ liệu cục bộ để team frontend
              có thể dựng giao diện ngay trong lúc backend đang hoàn thiện.
            </p>
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
                  placeholder="Tìm theo tên, mô tả hoặc slug..."
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
              </div>
            </div>
          </div>

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
                            'flex h-12 w-12 items-center justify-center rounded-2xl border',
                            category.status === 'available'
                              ? 'border-amber-100 bg-amber-50 text-amber-600'
                              : 'border-gray-100 bg-gray-50 text-gray-400',
                          )}
                        >
                          <Tag className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-400">
                            Thứ tự hiển thị #{category.displayOrder}
                          </div>
                          <h3 className="mt-1 text-2xl font-black text-slate-900 font-serif">{category.name}</h3>
                        </div>
                      </div>

                      <p className="max-w-md text-sm leading-6 text-gray-500">
                        {category.description || 'Chưa có mô tả cho danh mục này.'}
                      </p>

                      <div className="flex flex-wrap gap-2">
                        <span
                          className={cn(
                            'inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em]',
                            category.status === 'available'
                              ? 'bg-emerald-50 text-emerald-600'
                              : 'bg-slate-100 text-slate-500',
                          )}
                        >
                          {category.status === 'available' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                          {category.status === 'available' ? 'Đang hiển thị' : 'Đang ẩn'}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                          Slug: {category.slug || createSlug(category.name)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div className="rounded-full bg-slate-950 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white">
                        ID {category.id}
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          onClick={() => handleEdit(category)}
                          className="rounded-2xl border border-gray-100 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition-all hover:border-brand/30 hover:text-brand"
                        >
                          Sửa
                        </button>
                        <button
                          onClick={() => handleDuplicate(category)}
                          className="rounded-2xl border border-gray-100 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition-all hover:border-brand/30 hover:text-brand"
                        >
                          <Copy className="mr-1 inline h-3.5 w-3.5" />
                          Nhân bản
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-between gap-3 rounded-[1.75rem] bg-slate-50 px-4 py-3">
                    <button
                      onClick={() => handleToggleStatus(category.id)}
                      className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 transition-colors hover:text-brand"
                    >
                      <ArrowUpDown className="h-3.5 w-3.5" />
                      Đổi trạng thái
                    </button>
                    <button
                      onClick={() => handleDelete(category.id)}
                      className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-rose-500 transition-colors hover:text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Xoá danh mục
                    </button>
                  </div>
                </motion.article>
              ))}
            </AnimatePresence>
          </div>

          {filteredCategories.length === 0 && (
            <div className="premium-card flex flex-col items-center justify-center px-6 py-24 text-center">
              <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-[2.5rem] bg-gray-50">
                <WandSparkles className="h-10 w-10 text-gray-200" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 font-serif">Không có danh mục phù hợp</h3>
              <p className="mt-2 max-w-md text-sm text-gray-400">
                Thử đổi bộ lọc hoặc tạo danh mục mới ở panel bên phải.
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
                  {editingId ? 'Chỉnh sửa danh mục' : 'Tạo danh mục mới'}
                </h3>
                <p className="mt-2 text-sm leading-6 text-gray-500">
                  Đây là form frontend tạm thời. Khi backend sẵn sàng, chỉ cần thay phần lưu bằng API là xong.
                </p>
              </div>
              <button
                onClick={resetForm}
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
                  value={draft.name}
                  onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
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
                    value={draft.displayOrder}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, displayOrder: Number(e.target.value) || 1 }))
                    }
                    type="number"
                    min={1}
                    className="w-full rounded-2xl border border-gray-100 bg-white px-4 py-4 text-sm shadow-card focus:outline-none focus:ring-2 focus:ring-brand/20"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-gray-400">
                    Trạng thái
                  </span>
                  <select
                    value={draft.status}
                    onChange={(e) => setDraft((prev) => ({ ...prev, status: e.target.value as Category['status'] }))}
                    className="w-full rounded-2xl border border-gray-100 bg-white px-4 py-4 text-sm shadow-card focus:outline-none focus:ring-2 focus:ring-brand/20"
                  >
                    <option value="available">Đang hiển thị</option>
                    <option value="unavailable">Đang ẩn</option>
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-gray-400">
                  Mô tả ngắn
                </span>
                <textarea
                  value={draft.description}
                  onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))}
                  rows={5}
                  placeholder="Mô tả ngắn cho nhóm món này trên menu..."
                  className="w-full rounded-3xl border border-gray-100 bg-white px-4 py-4 text-sm shadow-card focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
              </label>
            </div>

            <div className="mt-6 rounded-[1.75rem] bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                <Eye className="h-3.5 w-3.5" />
                Preview hiển thị
              </div>
              <div className="mt-4 rounded-[1.5rem] bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-gray-400">Slug</div>
                    <div className="mt-1 text-sm font-black text-slate-900">
                      {createSlug(draft.name) || 'slug-se-xuat-hien-o-day'}
                    </div>
                  </div>
                  <div
                    className={cn(
                      'rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em]',
                      draft.status === 'available' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500',
                    )}
                  >
                    {draft.status === 'available' ? 'Đang bật' : 'Đang ẩn'}
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-gray-500">
                  Danh mục này sẽ được hiển thị theo thứ tự <span className="font-black text-slate-900">{draft.displayOrder}</span>{' '}
                  trên giao diện khách hàng.
                </p>
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              className="mt-6 w-full rounded-2xl bg-brand text-white shadow-xl shadow-brand/20 hover:bg-brand-dark"
              size="lg"
            >
              <Plus className="h-4 w-4" />
              {editingId ? 'Cập nhật danh mục' : 'Thêm danh mục'}
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
};
