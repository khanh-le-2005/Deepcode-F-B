import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Edit2,
  Trash2,
  Plus,
  Search,
  User as UserIcon,
  Shield,
  Filter,
  WandSparkles,
  Eye,
  EyeOff
} from 'lucide-react';
import axios from '@/src/lib/axiosClient';
import { toast } from 'react-toastify';
import { Button } from '../../../components/Button';
import { cn } from '../../../lib/cn';


// Based on the user API expectations
type User = {
  id: string;
  email: string;
  name: string;
  role: 'staff' | 'chef';
  createdAt?: string;
  updatedAt?: string;
};

type UserFormState = {
  email: string;
  password?: string;
  name: string;
  role: User['role'];
};

const emptyForm = (): UserFormState => ({
  email: '',
  password: '',
  name: '',
  role: 'staff',
});

const normalizeUser = (item: any): User => ({
  id: item._id || item.id,
  email: item.email || '',
  name: item.name || '',
  role: item.role || 'staff',
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
});

const extractList = (payload: any) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.users)) return payload.users;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

export const AdminUserManagement = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<'all' | User['role']>('all');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<UserFormState>(emptyForm);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const res = await axios.get('/api/users');
      const list = extractList(res.data).map(normalizeUser);
      setUsers(list);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Không tải được danh sách người dùng.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const stats = useMemo(() => ({
    total: users.length,
    staff: users.filter((u) => u.role === 'staff').length,
    kitchen: users.filter((u) => u.role === 'chef').length,
  }), [users]);

  const filteredUsers = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return users.filter((user) => {
      const matchesRole = selectedRole === 'all' || user.role === selectedRole;
      const matchesSearch =
        !term ||
        user.name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term);
      return matchesRole && matchesSearch;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [users, searchTerm, selectedRole]);

  const openCreate = () => {
    setEditingUser(null);
    setForm(emptyForm());
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setForm({
      email: user.email,
      password: '', // Blank password implies no change usually
      name: user.name,
      role: user.role,
    });
  };

  const persistUser = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error('Vui lòng nhập tên và email.');
      return;
    }
    if (!editingUser && !form.password) {
      toast.error('Vui lòng nhập mật khẩu cho người dùng mới.');
      return;
    }

    try {
      const payload: Partial<UserFormState> = {
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
      };

      if (form.password && form.password.trim().length > 0) {
        payload.password = form.password;
      }

      if (editingUser) {
        await axios.put(`/api/users/${editingUser.id}`, payload);
        toast.success('Cập nhật người dùng thành công!');
      } else {
        await axios.post('/api/users', payload);
        toast.success('Thêm người dùng mới thành công!');
      }

      setEditingUser(null);
      setForm(emptyForm());
      await fetchUsers();
    } catch (error: any) {
      console.error('Failed to save user:', error);
      const apiMessage = error.response?.data?.message || error.response?.data?.error || 'Không thể lưu người dùng.';
      toast.error(typeof apiMessage === 'string' ? apiMessage : 'Lỗi hệ thống');
    }
  };

  const handleDelete = async (user: User) => {
    if (!window.confirm(`Xoá người dùng "${user.name}"? Hành động này có thể không khôi phục được.`)) return;
    try {
      await axios.delete(`/api/users/${user.id}`);
      toast.success('Đã xoá người dùng.');
      await fetchUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
      toast.error('Không thể xoá người dùng.');
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-950 p-8 text-white shadow-2xl lg:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.26),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_28%)]" />
        <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <h2 className="mt-5 text-4xl font-black tracking-tight font-serif lg:text-6xl">Nhân Viên</h2>
          </div>

          <div className="grid grid-cols-4 gap-3 lg:min-w-[420px]">
            <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-4 text-center backdrop-blur">
              <div className="text-3xl font-black leading-none">{stats.total}</div>
              <div className="mt-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Tổng</div>
            </div>
            <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-4 text-center backdrop-blur">
              <div className="text-3xl font-black leading-none text-rose-400">{stats.admins}</div>
              <div className="mt-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Admin</div>
            </div>
            <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-4 text-center backdrop-blur">
              <div className="text-3xl font-black leading-none text-emerald-400">{stats.staff}</div>
              <div className="mt-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Staff</div>
            </div>
            <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-4 text-center backdrop-blur">
              <div className="text-3xl font-black leading-none text-amber-400">{stats.kitchen}</div>
              <div className="mt-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Bếp</div>
            </div>
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
                  placeholder="Tìm theo tên, email..."
                  className="w-full rounded-2xl border border-gray-100 bg-white py-4 pl-12 pr-4 text-sm shadow-card focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'all', label: 'Tất cả' },
                  { key: 'admin', label: 'Admin' },
                  { key: 'staff', label: 'Staff' },
                  { key: 'chef', label: 'Bếp' },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setSelectedRole(item.key as typeof selectedRole)}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all',
                      selectedRole === item.key
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
                  Thêm ND
                </Button>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="premium-card flex items-center justify-center py-24 text-sm font-bold text-gray-400">
              Đang tải danh sách người dùng...
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
              <AnimatePresence mode="popLayout">
                {filteredUsers.map((user, index) => (
                  <motion.article
                    key={user.id}
                    layout
                    initial={{ opacity: 0, y: 16, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 12, scale: 0.98 }}
                    transition={{ delay: index * 0.04 }}
                    className="overflow-hidden rounded-[2rem] border bg-white p-6 shadow-card"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border',
                              user.role === 'admin' ? 'bg-rose-50 border-rose-100 text-rose-500' :
                                user.role === 'chef' ? 'bg-amber-50 border-amber-100 text-amber-500' :
                                  'bg-emerald-50 border-emerald-100 text-emerald-500'
                            )}
                          >
                            <UserIcon className="h-6 w-6" />
                          </div>
                          <div>
                            <div className={cn(
                              "text-[10px] font-black uppercase tracking-[0.22em]",
                              user.role === 'admin' ? 'text-rose-500' :
                                user.role === 'chef' ? 'text-amber-500' :
                                  'text-emerald-500'
                            )}>
                              {user.role}
                            </div>
                            <h3 className="mt-1 text-2xl font-black text-slate-900 font-serif line-clamp-1">{user.name}</h3>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <span className="inline-flex items-center rounded-full bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                            Email: {user.email}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <div className="flex flex-wrap justify-end gap-2 mt-2">
                          <button
                            onClick={() => openEdit(user)}
                            className="rounded-2xl border border-gray-100 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition-all hover:border-brand/30 hover:text-brand"
                          >
                            <Edit2 className="mr-1 inline h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(user)}
                            className="rounded-2xl border border-gray-100 bg-white px-3 py-2 text-xs font-bold text-rose-500 transition-all hover:border-rose-200 hover:text-rose-600"
                          >
                            <Trash2 className="mr-1 inline h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.article>
                ))}
              </AnimatePresence>
            </div>
          )}

          {!isLoading && filteredUsers.length === 0 && (
            <div className="premium-card flex flex-col items-center justify-center px-6 py-24 text-center">
              <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-[2.5rem] bg-gray-50">
                <WandSparkles className="h-10 w-10 text-gray-200" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 font-serif">Không có người dùng phù hợp</h3>
              <p className="mt-2 max-w-md text-sm text-gray-400">
                Hãy thử kiểm tra lại từ khóa hoặc bộ lọc.
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
                  {editingUser ? 'Chỉnh sửa nhân viên' : 'Thêm nhân viên mới'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setEditingUser(null);
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
                  Họ và tên
                </span>
                <input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  type="text"
                  placeholder="Ví dụ: Nguyễn Văn A"
                  className="w-full rounded-2xl border border-gray-100 bg-white px-4 py-4 text-sm shadow-card focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-gray-400">
                  Email đăng nhập
                </span>
                <input
                  value={form.email}
                  disabled={!!editingUser}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  type="email"
                  placeholder="nhanvien@domain.com"
                  className="w-full rounded-2xl border border-gray-100 bg-white px-4 py-4 text-sm shadow-card focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:bg-gray-50 disabled:text-gray-400"
                />
                {editingUser && <p className="text-[10px] mt-1 text-gray-400 italic">Không thể sửa email sau khi tạo r.</p>}
              </label>

              <label className="block">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-gray-400">
                  Mật khẩu {editingUser && '(để trống nếu không đổi)'}
                </span>

                <div className="relative">
                  <input
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    type={showPassword ? "text" : "password"}
                    placeholder="Mật khẩu bí mật"
                    className="w-full rounded-2xl border border-gray-100 bg-white px-4 py-4 pr-12 text-sm shadow-card focus:outline-none focus:ring-2 focus:ring-brand/20"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-gray-400">
                  Phân quyền chức vụ (Role)
                </span>
                <select
                  value={form.role}
                  onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value as UserFormState['role'] }))}
                  className="w-full rounded-2xl border border-gray-100 bg-white px-4 py-4 text-sm shadow-card focus:outline-none focus:ring-2 focus:ring-brand/20"
                >
                  <option value="staff">Staff (Nhân viên phục vụ/Cashier)</option>
                  <option value="chef">Kitchen (Đầu bếp)</option>
                </select>
              </label>
            </div>

            <Button
              onClick={persistUser}
              className="mt-6 w-full rounded-2xl bg-brand text-white shadow-xl shadow-brand/20 hover:bg-brand-dark"
              size="lg"
            >
              <Shield className="h-4 w-4" />
              {editingUser ? 'Cập nhật tài khoản' : 'Tạo tài khoản'}
            </Button>

            {editingUser && (
              <button
                onClick={() => {
                  setEditingUser(null);
                  setForm(emptyForm());
                }}
                className="mt-3 w-full rounded-2xl border border-gray-100 bg-white px-4 py-3 text-xs font-black uppercase tracking-widest text-gray-500 transition-colors hover:border-brand/30 hover:text-brand"
              >
                Hủy và Tạo mới
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};
