import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Upload, Image as ImageIcon, Plus, Trash2, 
  ChevronLeft, Save, AlertCircle, CheckCircle2, Search,
  Loader2, Sparkles, Wand2
} from 'lucide-react';
import axios from '@/src/lib/axiosClient';
import { toast } from 'react-toastify';
import { MenuItem, MenuItemOption, MenuItemAddon, Category } from '../../../types';
import { Button } from '../../../components/Button';
import { getCategoryId, getMenuItemId } from '../../../lib/menuHelpers';
import { cn } from '../../../lib/cn';

interface FormState {
  name: string;
  price: number;
  categoryId: string;
  description: string;
  status: 'available' | 'unavailable';
  previewImages: string[];
  options: MenuItemOption[];
  addons: MenuItemAddon[];
}

export const AdminMenuEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState<FormState>({
    name: '',
    price: 0,
    categoryId: '',
    description: '',
    status: 'available',
    previewImages: [],
    options: [],
    addons: [],
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [galleryImageIds, setGalleryImageIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(isEditMode);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Image Suggestion Logic ---
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchCategories();
    if (isEditMode) {
      fetchItemDetails();
    }
  }, [id]);

  const fetchCategories = async () => {
    try {
      const res = await axios.get('/api/categories');
      const payload = res.data;
      const list = Array.isArray(payload) ? payload : (payload.data || payload.categories || []);
      setCategories(list.map((cat: any) => ({
        id: cat._id || cat.id,
        name: cat.name,
      })));
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const fetchItemDetails = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`/api/menu/${id}`);
      const item = res.data;
      if (item) {
        const ids = item.images || [];
        setGalleryImageIds(ids);
        const existingImages = ids.map((imageId: string) => `/api/images/${imageId}`);
        setFormData({
          name: item.name,
          price: item.price,
          categoryId: getCategoryId(item.categoryId),
          description: item.description || '',
          status: item.status || 'available',
          previewImages: existingImages,
          options: item.options ?? [],
          addons: item.addons ?? [],
        });
      }
    } catch (err) {
      console.error('Failed to fetch item details:', err);
      toast.error('Không tìm thấy món ăn!');
      navigate('/admin/menu');
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced Image Search
  useEffect(() => {
    if (!formData.name.trim() || formData.name.length < 2) {
      setSuggestions([]);
      return;
    }

    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    searchTimerRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await axios.get(`/api/images/suggest?keyword=${encodeURIComponent(formData.name)}`);
        if (res.data?.success || Array.isArray(res.data)) {
          const docs = res.data?.data || res.data || [];
          setSuggestions(docs);
        }
      } catch (err) {
        console.error("Image suggestion error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 600);

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [formData.name]);

  const selectSuggestedImage = (img: any) => {
    const imgId = img._id || img.id;
    if (galleryImageIds.includes(imgId)) return;
    
    if (galleryImageIds.length + selectedFiles.length >= 5) {
      toast.warning('Tối đa 5 ảnh cho mỗi món.');
      return;
    }
    
    setGalleryImageIds(prev => [...prev, imgId]);
    setFormData(prev => ({
      ...prev,
      previewImages: [...prev.previewImages, `/api/images/${imgId}`]
    }));
    setSuggestions([]);
    toast.success('Đã chọn ảnh từ thư viện ✨');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (files.length + galleryImageIds.length + selectedFiles.length > 5) {
      toast.warning('Tối đa 5 ảnh cho mỗi món.');
      return;
    }

    const validFiles = files.filter(file => file.type.startsWith('image/'));
    setSelectedFiles(prev => [...prev, ...validFiles]);

    Promise.all(
      validFiles.map(file => new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      }))
    ).then(previews => {
      setFormData(prev => ({ ...prev, previewImages: [...prev.previewImages, ...previews] }));
    });
  };

  const removePreview = (index: number) => {
    const totalGallery = galleryImageIds.length;
    if (index < totalGallery) {
      setGalleryImageIds(prev => prev.filter((_, i) => i !== index));
    } else {
      setSelectedFiles(prev => prev.filter((_, i) => i !== (index - totalGallery)));
    }
    setFormData(prev => ({
      ...prev,
      previewImages: prev.previewImages.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    if (!formData.name || !formData.categoryId || formData.price <= 0) {
      toast.error('Vui lòng điền đầy đủ thông tin bắt buộc (Tên, Loại, Giá)');
      return;
    }

    setIsSaving(true);
    try {
      const { previewImages, ...rest } = formData;
      const dataToSave = {
        ...rest,
        images: galleryImageIds,
        options: rest.options.filter(o => o.name.trim() !== ''),
        addons: rest.addons.filter(a => a.name.trim() !== ''),
      };

      const submitData = new FormData();
      submitData.append('data', JSON.stringify(dataToSave));
      selectedFiles.forEach(file => submitData.append('images', file));

      if (isEditMode) {
        await axios.put(`/api/menu/${id}`, submitData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Cập nhật món ăn thành công!');
      } else {
        await axios.post('/api/menu', submitData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Thêm món mới thành công!');
      }
      navigate('/admin/menu');
    } catch (err: any) {
      console.error('Lưu lỗi:', err);
      const msg = err.response?.data?.error?.message || 'Có lỗi xảy ra khi lưu món ăn';
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-12 h-12 text-brand animate-spin" />
        <p className="text-gray-500 font-bold uppercase tracking-widest animate-pulse">Đang tải dữ liệu...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/admin/menu')}
            className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-brand hover:border-brand shadow-card transition-all"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h2 className="text-4xl font-black text-gray-900 tracking-tight font-serif">
              {isEditMode ? 'Sửa Món Ăn' : 'Thêm Món Mới'}
            </h2>
            <p className="text-gray-500 font-medium mt-1">Cung cấp thông tin chi tiết cho sản phẩm của bạn</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="lg" onClick={() => navigate('/admin/menu')} className="rounded-2xl px-8 h-14 font-black text-xs uppercase tracking-widest">
            Hủy bỏ
          </Button>
          <Button 
            variant="secondary" 
            size="lg" 
            disabled={isSaving}
            onClick={handleSave}
            className="bg-brand text-white hover:bg-brand-dark px-10 h-14 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-brand/20 transition-all active:scale-95"
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
            {isEditMode ? 'Lưu thay đổi' : 'Tạo món ngay'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Form Info */}
        <div className="lg:col-span-2 space-y-8">
          {/* Main Info Card */}
          <div className="premium-card p-8 sm:p-10 space-y-8">
            <h3 className="text-xl font-black text-gray-900 flex items-center gap-3">
              <span className="w-8 h-8 bg-brand/10 text-brand rounded-lg flex items-center justify-center text-sm italic">01</span>
              Thông tin cơ bản
            </h3>
            
            <div className="space-y-6">
              <div className="space-y-2 relative">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Tên món ăn <span className="text-danger">*</span></label>
                <input
                  type="text"
                  placeholder="Ví dụ: Phở Bò Tái Lăn..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 focus:outline-none focus:ring-2 focus:ring-brand/20 text-lg font-bold placeholder:text-gray-300 transition-all"
                />

                {/* Smart Image Suggestions - Full Width in Page Mode */}
                <AnimatePresence>
                  {(isSearching || suggestions.length > 0) && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.98, y: -5 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98, y: -5 }}
                      className="absolute top-full left-0 right-0 mt-3 bg-white border border-gray-100 rounded-[2rem] shadow-2xl z-50 p-6 overflow-hidden"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand flex items-center gap-2">
                          {isSearching ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Wand2 className="w-4 h-4" />
                          )}
                          {isSearching ? 'Đang tìm ảnh phù hợp...' : `Gợi ý ảnh cho "${formData.name}"`}
                        </p>
                        <button 
                          onClick={() => {
                            setSuggestions([]);
                            setIsSearching(false);
                          }} 
                          className="text-gray-400 hover:text-danger"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      {/* Content Area */}
                      {!isSearching && suggestions.length === 0 ? (
                        <div className="py-6 flex flex-col items-center justify-center text-gray-400 gap-2 bg-slate-50 rounded-2xl border border-dashed border-gray-100">
                          <ImageIcon className="w-8 h-8 opacity-20" />
                          <p className="text-[10px] font-black uppercase tracking-widest italic opacity-40">Không tìm thấy ảnh phù hợp</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3">
                          {suggestions.map((img, i) => (
                            <motion.div
                              key={img._id || img.id || i}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => selectSuggestedImage(img)}
                              className="aspect-square rounded-2xl overflow-hidden cursor-pointer hover:ring-4 hover:ring-brand/40 transition-all group relative border border-gray-100"
                            >
                              <img src={`/api/images/${img._id || img.id}`} alt={img.name} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-brand/20 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white backdrop-blur-[1px]">
                                <Plus className="w-6 h-6 stroke-[3px]" />
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Giá bán (VNĐ) <span className="text-danger">*</span></label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="0"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                      className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 focus:outline-none focus:ring-2 focus:ring-brand/20 text-lg font-bold placeholder:text-gray-300 transition-all"
                    />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-gray-400 italic">VNĐ</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Danh mục món <span className="text-danger">*</span></label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 focus:outline-none focus:ring-2 focus:ring-brand/20 text-lg font-bold appearance-none transition-all"
                  >
                    <option value="">-- Chọn danh mục --</option>
                    {categories.map((cat: any) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Mô tả món ăn</label>
                <textarea
                  rows={4}
                  placeholder="Nêu bật những nét đặc sắc của món ăn..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 focus:outline-none focus:ring-2 focus:ring-brand/20 text-base font-medium placeholder:text-gray-300 resize-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Config Card: Options & Addons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="premium-card p-8 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-amber-500" /> Tuỳ chọn (Size/Vị)
                </h3>
                <button 
                  onClick={() => setFormData(prev => ({ ...prev, options: [...prev.options, { name: '', priceExtra: 0 }] }))}
                  className="p-2 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-100 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                {formData.options.map((opt, i) => (
                  <div key={i} className="flex gap-2 group">
                    <input
                      placeholder="Tên tùy chọn"
                      value={opt.name}
                      onChange={(e) => {
                        const newOpts = [...formData.options];
                        newOpts[i].name = e.target.value;
                        setFormData({ ...formData, options: newOpts });
                      }}
                      className="flex-1 bg-white border border-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-bold"
                    />
                    <input
                      type="number"
                      placeholder="+Giá"
                      value={opt.priceExtra}
                      onChange={(e) => {
                        const newOpts = [...formData.options];
                        newOpts[i].priceExtra = Number(e.target.value);
                        setFormData({ ...formData, options: newOpts });
                      }}
                      className="w-24 bg-white border border-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-black text-brand"
                    />
                    <button 
                      onClick={() => setFormData(prev => ({ ...prev, options: prev.options.filter((_, idx) => idx !== i) }))}
                      className="p-3 text-gray-300 hover:text-danger hover:bg-danger/5 rounded-xl transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="premium-card p-8 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-brand" /> Topping / Addon
                </h3>
                <button 
                  onClick={() => setFormData(prev => ({ ...prev, addons: [...prev.addons, { name: '', priceExtra: 0 }] }))}
                  className="p-2 bg-brand/10 text-brand rounded-xl hover:bg-brand/20 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                {formData.addons.map((addon, i) => (
                  <div key={i} className="flex gap-2 group">
                    <input
                      placeholder="Tên topping"
                      value={addon.name}
                      onChange={(e) => {
                        const newAdds = [...formData.addons];
                        newAdds[i].name = e.target.value;
                        setFormData({ ...formData, addons: newAdds });
                      }}
                      className="flex-1 bg-white border border-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 font-bold"
                    />
                    <input
                      type="number"
                      placeholder="+Giá"
                      value={addon.priceExtra}
                      onChange={(e) => {
                        const newAdds = [...formData.addons];
                        newAdds[i].priceExtra = Number(e.target.value);
                        setFormData({ ...formData, addons: newAdds });
                      }}
                      className="w-24 bg-white border border-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 font-black text-brand"
                    />
                    <button 
                      onClick={() => setFormData(prev => ({ ...prev, addons: prev.addons.filter((_, idx) => idx !== i) }))}
                      className="p-3 text-gray-300 hover:text-danger hover:bg-danger/5 rounded-xl transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Media & Status */}
        <div className="space-y-8">
          {/* Images Card */}
          <div className="premium-card p-8 space-y-6 sticky top-28">
            <h3 className="text-lg font-black text-gray-900 flex items-center gap-3">
              <ImageIcon className="w-5 h-5 text-gray-400" /> Hình ảnh ({formData.previewImages.length}/5)
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <AnimatePresence>
                {formData.previewImages.map((src, idx) => (
                  <motion.div
                    key={`${src}-${idx}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    className="relative aspect-square group rounded-[1.5rem] overflow-hidden border border-gray-100"
                  >
                    <img src={src} className="w-full h-full object-cover" alt="Preview" />
                    <button
                      onClick={() => removePreview(idx)}
                      className="absolute top-2 right-2 p-2 bg-danger text-white rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-all active:scale-90"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {idx === 0 && (
                      <div className="absolute bottom-2 left-2 px-3 py-1 bg-brand text-white text-[8px] font-black uppercase tracking-widest rounded-lg shadow-sm">
                        Ảnh bìa
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {formData.previewImages.length < 5 && (
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square bg-slate-50 border-2 border-dashed border-gray-200 rounded-[1.5rem] flex flex-col items-center justify-center cursor-pointer hover:border-brand hover:bg-brand/5 transition-all text-gray-400 hover:text-brand gap-2"
                >
                  <Upload className="w-8 h-8 opacity-20" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Tải ảnh lên</span>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept="image/*" 
                    multiple 
                    className="hidden" 
                  />
                </motion.div>
              )}
            </div>

            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-gray-400 mt-0.5" />
              </div>
              <div className="h-px bg-gray-100 w-full" />
              <div className="space-y-4">
                <label className="text-xs font-black text-gray-900 uppercase tracking-widest block">Trạng thái món ăn</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setFormData({ ...formData, status: 'available' })}
                    className={cn(
                      "py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                      formData.status === 'available' 
                        ? "bg-emerald-50 text-emerald-600 border-emerald-500 shadow-sm" 
                        : "bg-white text-gray-400 border-gray-100 hover:border-gray-300"
                    )}
                  >
                    Còn món
                  </button>
                  <button
                    onClick={() => setFormData({ ...formData, status: 'unavailable' })}
                    className={cn(
                      "py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                      formData.status === 'unavailable' 
                        ? "bg-rose-50 text-rose-600 border-rose-500 shadow-sm" 
                        : "bg-white text-gray-400 border-gray-100 hover:border-gray-300"
                    )}
                  >
                    Hết món
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
