import { useEffect, useState, FormEvent } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { BankAccount } from '../../../types';
import { Button } from '../../../components/Button';
import { Plus, Edit2, Trash2, Star, CheckCircle2 } from 'lucide-react';

const emptyForm = {
  bankName: '',
  bin: '',
  accountNo: '',
  accountName: '',
  phone: '',
  password: '',
  isDefault: false,
  isActive: true,
};

export const AdminBankAccounts = () => {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const normalizeAccounts = (data: unknown): BankAccount[] => {
    if (Array.isArray(data)) return data as BankAccount[];
    if (data && typeof data === 'object') {
      const maybeAccounts = (data as { accounts?: unknown; data?: unknown }).accounts;
      if (Array.isArray(maybeAccounts)) return maybeAccounts as BankAccount[];
      const maybeData = (data as { accounts?: unknown; data?: unknown }).data;
      if (Array.isArray(maybeData)) return maybeData as BankAccount[];
    }
    return [];
  };

  const fetchAccounts = () => {
    axios.get('/api/bank-accounts')
      .then(res => setAccounts(normalizeAccounts(res.data)))
      .catch(err => console.error('Failed to fetch bank accounts:', err));
  };

  const resetForm = () => {
    setEditingAccount(null);
    setForm({ ...emptyForm });
  };

  const startEdit = (account: BankAccount) => {
    setEditingAccount(account);
    setForm({
      bankName: account.bankName || '',
      bin: account.bin || '',
      accountNo: account.accountNo || '',
      accountName: account.accountName || '',
      phone: account.phone || '',
      password: account.password || '',
      isDefault: !!account.isDefault,
      isActive: !!account.isActive,
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingAccount) {
        await axios.put(`/api/bank-accounts/${editingAccount.id || editingAccount._id}`, form);
        toast.success('Cập nhật tài khoản ngân hàng thành công');
      } else {
        await axios.post('/api/bank-accounts', form);
        toast.success('Tạo tài khoản ngân hàng thành công');
      }
      fetchAccounts();
      resetForm();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Không thể lưu tài khoản ngân hàng');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (account: BankAccount) => {
    const id = account.id || account._id;
    if (!id) return;
    if (!window.confirm(`Xóa tài khoản ${account.bankName} - ${account.accountNo}?`)) return;

    try {
      await axios.delete(`/api/bank-accounts/${id}`);
      toast.success('Đã xóa tài khoản ngân hàng');
      fetchAccounts();
      if (editingAccount && (editingAccount.id === id || editingAccount._id === id)) {
        resetForm();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Không thể xóa tài khoản');
    }
  };

  const handleToggleDefault = async (account: BankAccount) => {
    const id = account.id || account._id;
    if (!id) return;
    try {
      await axios.put(`/api/bank-accounts/${id}`, { ...account, isDefault: true });
      toast.success('Đã đặt làm tài khoản mặc định');
      fetchAccounts();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Không thể cập nhật tài khoản mặc định');
    }
  };

  return (
    <div className="space-y-10 pb-12">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-gray-900 tracking-tight font-serif">Ngân Hàng</h2>
          <p className="text-gray-500 font-medium mt-1">Quản lý tài khoản nhận tiền và cấu hình QR thanh toán</p>
        </div>
        <Button
          variant="secondary"
          size="lg"
          onClick={resetForm}
          className="bg-brand text-white hover:bg-brand-dark px-8 h-14 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-brand/20 border-none transition-all hover:-translate-y-1"
        >
          <Plus className="w-5 h-5 mr-2" /> Thêm tài khoản
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-8">
        <form onSubmit={handleSubmit} className="premium-card p-8 space-y-5 h-fit">
          <div>
            <h3 className="text-xl font-black tracking-tight">{editingAccount ? 'Sửa tài khoản' : 'Thêm tài khoản mới'}</h3>
            <p className="text-sm text-gray-500 mt-1">Dữ liệu này sẽ dùng cho QR và đồng bộ sang dịch vụ thanh toán.</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Tên ngân hàng</label>
            <input className="w-full bg-white border border-gray-100 rounded-2xl px-4 py-3" value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">BIN</label>
              <input className="w-full bg-white border border-gray-100 rounded-2xl px-4 py-3" value={form.bin} onChange={(e) => setForm({ ...form, bin: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Số tài khoản</label>
              <input className="w-full bg-white border border-gray-100 rounded-2xl px-4 py-3" value={form.accountNo} onChange={(e) => setForm({ ...form, accountNo: e.target.value })} required />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Tên chủ tài khoản</label>
            <input className="w-full bg-white border border-gray-100 rounded-2xl px-4 py-3" value={form.accountName} onChange={(e) => setForm({ ...form, accountName: e.target.value })} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Số điện thoại</label>
              <input className="w-full bg-white border border-gray-100 rounded-2xl px-4 py-3" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Mật khẩu</label>
              <input type="password" className="w-full bg-white border border-gray-100 rounded-2xl px-4 py-3" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </div>
          </div>

          <label className="flex items-center gap-3 text-sm font-bold text-gray-700">
            <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} />
            Đặt làm mặc định
          </label>
          <label className="flex items-center gap-3 text-sm font-bold text-gray-700">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
            Đang kích hoạt
          </label>

          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1" disabled={loading}>
              <CheckCircle2 className="w-4 h-4" />
              {loading ? 'Đang lưu...' : 'Lưu'}
            </Button>
            <Button type="button" variant="outline" className="flex-1" onClick={resetForm}>
              Hủy
            </Button>
          </div>
        </form>

        <div className="premium-card p-0 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-xl font-black tracking-tight">Danh sách tài khoản</h3>
            <p className="text-sm text-gray-500 mt-1">Tài khoản mặc định sẽ được dùng khi tạo QR thanh toán.</p>
          </div>
          <div className="divide-y divide-gray-100">
            {accounts.length > 0 ? accounts.map(account => {
              const id = account.id || account._id || '';
              return (
                <div key={id} className="p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-lg font-black text-gray-900">{account.bankName}</h4>
                      {account.isDefault && (
                        <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                          <Star className="w-3 h-3" /> Mặc định
                        </span>
                      )}
                      {!account.isActive && (
                        <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-500 text-[10px] font-black uppercase tracking-widest">
                          Ngưng hoạt động
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      {account.accountName} - {account.accountNo}
                    </p>
                    <p className="text-xs text-gray-400 mt-1 break-all">
                      BIN: {account.bin} | Phone: {account.phone}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {!account.isDefault && (
                      <Button variant="outline" onClick={() => handleToggleDefault(account)}>
                        Đặt mặc định
                      </Button>
                    )}
                    <Button variant="outline" onClick={() => startEdit(account)}>
                      <Edit2 className="w-4 h-4" />
                      Sửa
                    </Button>
                    <Button variant="outline" onClick={() => handleDelete(account)} className="text-rose-600 border-rose-200 hover:bg-rose-50">
                      <Trash2 className="w-4 h-4" />
                      Xóa
                    </Button>
                  </div>
                </div>
              );
            }) : (
              <div className="p-12 text-center text-gray-400 font-medium">Chưa có tài khoản ngân hàng nào.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
