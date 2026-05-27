import React, { useEffect, useMemo, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image as ImageIcon, Search, Plus, Edit2, Trash2, X, CheckCircle2, Upload, Calendar, Link as LinkIcon, Eye, EyeOff } from 'lucide-react';
import axios from '@/src/api/axiosClient';
import { toast } from 'react-toastify';
import { Banner } from '../../../types';
import { Button } from '../../../components/Button';
import { cn } from '../../../api/cn';

type BannerFormState = {
  title: string;
  subtitle: string;
  link: string;
  displayOrder: number;
  status: 'active' | 'inactive';
  startDate: string;
  endDate: string;
};

const toLocalDateTimeInput = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
};

export const AdminBannerManagement = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [form, setForm] = useState<BannerFormState>({
    title: '',
    subtitle: '',
    link: '',
    displayOrder: 0,
    status: 'active',
    startDate: '',
    endDate: '',
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchBanners = () => {
    axios.get('/api/banners')
      .then(res => {
        const payload = res.data;
        // Kiểm tra kỹ lưỡng các cấu trúc dữ liệu có thể trả về từ API
        const list = Array.isArray(payload) 
          ? payload 
          : (payload && Array.isArray(payload.data) 
            ? payload.data 
            : (payload && Array.isArray(payload.banners) ? payload.banners : []));
        setBanners(list);
      })
      .catch(err => {
        console.error('Failed to fetch banners:', err);
        toast.error('Không tải được danh sách banner.');
        setBanners([]); // Đảm bảo luôn là mảng rỗng khi gặp lỗi
      });
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const openCreateForm = () => {
    setEditingBanner(null);
    setForm({
      title: '',
      subtitle: '',
      link: '',
      displayOrder: 0,
      status: 'active',
      startDate: '',
      endDate: '',
    });
    setSelectedFile(null);
    setPreviewImage(null);
    setIsFormOpen(true);
  };

  const openEditForm = (banner: Banner) => {
    setEditingBanner(banner);
    setForm({
      title: banner.title || '',
      subtitle: banner.subtitle || '',
      link: banner.link || '',
      displayOrder: banner.displayOrder || 0,
      status: banner.status || 'active',
      startDate: banner.startDate ? toLocalDateTimeInput(banner.startDate) : '',
      endDate: banner.endDate ? toLocalDateTimeInput(banner.endDate) : '',
    });
    setSelectedFile(null);
    setPreviewImage(banner.image ? `/api/images/${banner.image}` : null);
    setIsFormOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file hình ảnh hợp lệ.');
      return;
    }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleToggleStatus = async (banner: Banner) => {
    const newStatus = banner.status === 'active' ? 'inactive' : 'active';
    try {
      const bannerId = banner.id || banner._id;
      await axios.put(`/api/banners/${bannerId}`, {
        ...banner,
        status: newStatus
      });
      toast.success(`Đã chuyển trạng thái sang: ${newStatus === 'active' ? 'Hiển thị' : 'Tạm ẩn'}`);
      fetchBanners();
    } catch (err: any) {
      console.error('Failed to toggle banner status:', err);
      toast.error('Lỗi khi đổi trạng thái banner.');
    }
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error('Vui lòng nhập tiêu đề banner');
      return;
    }

    if (!editingBanner && !selectedFile) {
      toast.error('Vui lòng tải lên hình ảnh cho banner');
      return;
    }

    setIsSaving(true);
    try {
      const dataToSave = {
        title: form.title.trim(),
        subtitle: form.subtitle.trim(),
        link: form.link.trim(),
        displayOrder: Number(form.displayOrder),
        status: form.status,
        startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
        endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
      };

      const submitData = new FormData();
      submitData.append('data', JSON.stringify(dataToSave));
      if (selectedFile) {
        submitData.append('image', selectedFile);
      }

      const headers = { 'Content-Type': 'multipart/form-data' };
      const bannerId = editingBanner?.id || editingBanner?._id;

      if (editingBanner) {
        await axios.put(`/api/banners/${bannerId}`, submitData, { headers });
        toast.success('Cập nhật banner thành công!');
      } else {
        await axios.post('/api/banners', submitData, { headers });
        toast.success('Tạo banner mới thành công!');
      }

      setIsFormOpen(false);
      setEditingBanner(null);
      setSelectedFile(null);
      setPreviewImage(null);
      fetchBanners();
    } catch (err: any) {
      console.error('Failed to save banner:', err);
      const apiMessage = err?.response?.data?.error?.message || err?.response?.data?.message;
      toast.error(apiMessage || 'Không thể lưu banner!');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (banner: Banner) => {
    if (!window.confirm(`Xoá banner "${banner.title}"?`)) return;
    try {
      await axios.delete(`/api/banners/${banner.id || banner._id}`);
      toast.success('Đã xoá banner!');
      fetchBanners();
    } catch (err: any) {
      console.error('Failed to delete banner:', err);
      toast.error('Không thể xoá banner!');
    }
  };

  const filteredBanners = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    const bannersArray = Array.isArray(banners) ? banners : [];
    if (!term) return bannersArray;
    return bannersArray.filter(banner => {
      const title = banner.title?.toLowerCase() || '';
      const subtitle = banner.subtitle?.toLowerCase() || '';
      return title.includes(term) || subtitle.includes(term);
    });
  }, [banners, searchTerm]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Quản lý banner</h2>
          <p className="text-gray-500 font-medium mt-1">Thiết lập các banner khuyến mãi, giới thiệu sản phẩm nổi bật ở trang chủ</p>
        </div>
        <Button variant="secondary" size="lg" onClick={openCreateForm} className="shadow-xl shadow-brand/20 cursor-pointer bg-brand text-white">
          <Plus className="w-5 h-5" /> Thêm banner
        </Button>
      </div>

      <div className="relative max-w-xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Tìm kiếm banner..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white border border-gray-100 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-brand/20 shadow-sm transition-all"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {filteredBanners.map((banner, i) => (
            <motion.div
              layout
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: i * 0.04 }}
              key={banner.id || banner._id}
              className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-gray-100 flex flex-col justify-between group hover:shadow-md transition-all duration-300"
            >
              {/* Banner Image */}
              <div className="relative aspect-[16/9] w-full bg-slate-100 overflow-hidden border-b border-gray-50">
                {banner.image ? (
                  <img
                    src={`/api/images/${banner.image}`}
                    alt={banner.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <ImageIcon className="w-12 h-12" />
                  </div>
                )}
                {/* Status and Order Badges */}
                <div className="absolute top-4 left-4 flex gap-2">
                  <span className={cn(
                    "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border",
                    banner.status === 'active'
                      ? 'bg-emerald-500/90 text-white border-emerald-400 backdrop-blur-sm'
                      : 'bg-slate-900/90 text-white border-slate-700 backdrop-blur-sm'
                  )}>
                    {banner.status === 'active' ? 'Đang bật' : 'Tạm ẩn'}
                  </span>
                  <span className="bg-white/90 text-slate-900 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-white/20 shadow-sm">
                    Độ ưu tiên: {banner.displayOrder}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-gray-900 line-clamp-1 group-hover:text-brand transition-colors">
                    {banner.title}
                  </h3>
                  {banner.subtitle && (
                    <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">
                      {banner.subtitle}
                    </p>
                  )}
                </div>

                <div className="space-y-2 pt-2 border-t border-gray-50">
                  {banner.link && (
                    <div className="flex items-center gap-2 text-xs text-brand font-medium truncate">
                      <LinkIcon className="w-3.5 h-3.5" />
                      <span>{banner.link}</span>
                    </div>
                  )}
                  {(banner.startDate || banner.endDate) && (
                    <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
                      <Calendar className="w-3.5 h-3.5" />
                      <span className="truncate">
                        {banner.startDate ? new Date(banner.startDate).toLocaleDateString('vi-VN') : 'Sớm'} → {banner.endDate ? new Date(banner.endDate).toLocaleDateString('vi-VN') : 'Vô hạn'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => handleToggleStatus(banner)}
                    className={cn(
                      "flex-1 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                      banner.status === 'active'
                        ? "bg-slate-50 text-slate-600 border-gray-100 hover:bg-slate-100"
                        : "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100"
                    )}
                  >
                    {banner.status === 'active' ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" /> Ẩn đi
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" /> Hiển thị
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => openEditForm(banner)}
                    className="p-2.5 bg-slate-50 border border-gray-100 text-gray-500 hover:text-brand hover:bg-amber-50 hover:border-amber-100 rounded-xl transition-all cursor-pointer"
                  >
                    <Edit2 className="w-4.5 h-4.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(banner)}
                    className="p-2.5 bg-rose-50 border border-rose-100 text-rose-500 hover:bg-rose-100 rounded-xl transition-all cursor-pointer"
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredBanners.length === 0 && (
        <div className="premium-card py-32 flex flex-col items-center justify-center text-center">
          <div className="w-24 h-24 bg-gray-50 rounded-[3rem] flex items-center justify-center mb-6">
            <ImageIcon className="w-10 h-10 text-gray-200" />
          </div>
          <h3 className="text-2xl font-black text-gray-900 mb-2">Chưa có banner nào</h3>
          <p className="text-gray-400 font-medium">Bấm “Thêm banner” phía trên để tạo banner quảng cáo đầu tiên</p>
        </div>
      )}

      {/* Modal Form */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black text-gray-900">{editingBanner ? 'Sửa banner' : 'Thêm banner mới'}</h3>
                <p className="text-gray-500 mt-1">Đăng hình ảnh và cấu hình các thuộc tính hiển thị cho banner.</p>
              </div>
              <button onClick={() => setIsFormOpen(false)} className="p-3 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 grid lg:grid-cols-2 gap-8 max-h-[70vh] overflow-y-auto">
              {/* Cột trái: Tải ảnh */}
              <div className="space-y-6">
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-1 block mb-3">Hình ảnh banner (tỷ lệ 16:9 khuyên dùng)</label>
                  <div className="space-y-4">
                    {previewImage ? (
                      <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden border border-gray-100 group">
                        <img src={previewImage} className="w-full h-full object-cover" alt="Preview" />
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFile(null);
                            setPreviewImage(null);
                          }}
                          className="absolute top-3 right-3 p-2 bg-red-500 hover:bg-red-600 text-white rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="aspect-[16/9] w-full bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-brand hover:bg-brand/5 transition-all text-gray-400 hover:text-brand gap-2"
                      >
                        <Upload className="w-10 h-10 opacity-20" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Tải ảnh lên</span>
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          accept="image/*"
                          className="hidden"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-3xl p-5 border border-gray-100 space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-1">Độ ưu tiên hiển thị</label>
                    <input
                      type="number"
                      value={form.displayOrder}
                      onChange={(e) => setForm(prev => ({ ...prev, displayOrder: Number(e.target.value) }))}
                      className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand/20 font-bold"
                      placeholder="0"
                    />
                    <p className="text-[10px] text-gray-400 italic ml-1">Số càng nhỏ, banner sẽ hiển thị ở vị trí đầu tiên.</p>
                  </div>
                </div>
              </div>

              {/* Cột phải: Nhập liệu */}
              <div className="space-y-5">
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-1">Tiêu đề banner *</label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                    className="mt-2 w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand/20 font-bold"
                    placeholder="Đại tiệc trà sữa"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-1">Phụ đề / Mô tả ngắn</label>
                  <textarea
                    value={form.subtitle}
                    onChange={(e) => setForm(prev => ({ ...prev, subtitle: e.target.value }))}
                    className="mt-2 w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand/20 min-h-24 resize-none"
                    placeholder="Đồng giá 29K mọi size nước"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-1">Đường dẫn liên kết (Link)</label>
                  <input
                    value={form.link}
                    onChange={(e) => setForm(prev => ({ ...prev, link: e.target.value }))}
                    className="mt-2 w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand/20"
                    placeholder="/menu hoặc ID món ăn hoặc đường dẫn ngoài"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-1 font-bold">Ngày bắt đầu</label>
                    <input
                      type="datetime-local"
                      value={form.startDate}
                      onChange={(e) => setForm(prev => ({ ...prev, startDate: e.target.value }))}
                      className="mt-2 w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand/20"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-1 font-bold">Ngày kết thúc</label>
                    <input
                      type="datetime-local"
                      value={form.endDate}
                      onChange={(e) => setForm(prev => ({ ...prev, endDate: e.target.value }))}
                      className="mt-2 w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-1">Trạng thái mặc định</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value as BannerFormState['status'] }))}
                    className="mt-2 w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand/20"
                  >
                    <option value="active">Hiển thị ngay (Active)</option>
                    <option value="inactive">Tạm ẩn (Inactive)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="p-8 bg-gray-50 border-t border-gray-100 flex gap-4 mt-auto">
              <Button variant="outline" className="flex-1 py-4 cursor-pointer hover:bg-red-500 hover:text-white" onClick={() => setIsFormOpen(false)}>
                Huỷ
              </Button>
              <Button variant="secondary" className="flex-1 py-4 shadow-lg shadow-brand/20 hover:bg-brand/90 text-white cursor-pointer" disabled={isSaving} onClick={handleSave}>
                {isSaving ? 'Đang lưu...' : <><CheckCircle2 className="w-4 h-4" /> Lưu banner</>}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
