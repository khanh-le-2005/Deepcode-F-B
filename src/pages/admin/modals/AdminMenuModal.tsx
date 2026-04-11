import { useState, useEffect, useRef } from 'react';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Image as ImageIcon, Plus, Trash2 } from 'lucide-react';
import axios from '@/src/lib/axiosClient';
import { MenuItem, MenuItemOption, MenuItemAddon, Category } from '../../../types';
import { Button } from '../../../components/Button';
import { getCategoryId, getMenuItemImageUrl } from '../../../lib/menuHelpers';

interface FormState {
  name: string;
  price: number;
  categoryId: string;
  description: string;
  status: 'available' | 'unavailable';
  /** preview URL (base64) hoặc URL ảnh hiện tại */
  previewImages: string[];
  options: MenuItemOption[];
  addons: MenuItemAddon[];
}

export const AdminMenuModal = ({
  isOpen,
  onClose,
  onSave,
  item
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any, files: File[] | null) => void;
  item: MenuItem | null;
}) => {
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Image Suggestion Logic ---
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [galleryImageIds, setGalleryImageIds] = useState<string[]>([]);

  useEffect(() => {
    if (item) {
      const ids = item.images || [];
      setGalleryImageIds(ids);
      const existingImages = ids.map((imageId) => `/api/images/${imageId}`);
      setFormData({
        name: item.name,
        price: item.price,
        categoryId: getCategoryId(item.categoryId),
        description: item.description,
        status: item.status,
        previewImages: existingImages,
        options: item.options ?? [],
        addons: item.addons ?? [],
      });
      setSelectedFiles([]);
    } else {
      setFormData({
        name: '',
        price: 0,
        categoryId: '',
        description: '',
        status: 'available',
        previewImages: [],
        options: [],
        addons: [],
      });
      setSelectedFiles([]);
      setGalleryImageIds([]);
    }
  }, [item, isOpen]);

  useEffect(() => {
    if (!formData.name.trim() || formData.name.length < 2 || item) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await axios.get(`/api/images/suggest?keyword=${encodeURIComponent(formData.name)}`);
        if (res.data?.success) {
          setSuggestions(res.data.data || []);
        }
      } catch (err) {
        console.error("Image suggestion error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [formData.name, item]);

  const selectSuggestedImage = (img: any) => {
    const imgId = img._id || img.id;
    if (galleryImageIds.includes(imgId)) return;
    
    setGalleryImageIds(prev => [...prev, imgId]);
    setFormData(prev => ({
      ...prev,
      previewImages: [...prev.previewImages, `/api/images/${imgId}`]
    }));
    setSuggestions([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (files.length + galleryImageIds.length > 5) {
      alert('Tối đa 5 ảnh cho mỗi món.');
      return;
    }

    const validFiles = files.filter((file) => (file as File).type.startsWith('image/')) as File[];
    setSelectedFiles(prev => [...prev, ...validFiles]);

    Promise.all(
      validFiles.map(file => new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : '');
        reader.readAsDataURL(file);
      }))
    ).then(previews => {
      setFormData(prev => ({ ...prev, previewImages: [...prev.previewImages, ...previews] }));
    });
  };

  const removePreview = (index: number) => {
    setFormData(prev => {
      const newPreviews = [...prev.previewImages];
      newPreviews.splice(index, 1);
      return { ...prev, previewImages: newPreviews };
    });

    // Nếu ảnh là từ gallery, xoá khỏi IDs
    const totalGallery = galleryImageIds.length;
    if (index < totalGallery) {
      setGalleryImageIds(prev => prev.filter((_, i) => i !== index));
    } else {
      // Nếu là file upload, xoá khỏi selectedFiles
      setSelectedFiles(prev => prev.filter((_, i) => i !== (index - totalGallery)));
    }
  };

  // --- Options helpers ---
  const addOption = () => setFormData(prev => ({ ...prev, options: [...prev.options, { name: '', priceExtra: 0 }] }));
  const updateOption = (i: number, field: keyof MenuItemOption, val: string | number) =>
    setFormData(prev => { const o = [...prev.options]; o[i] = { ...o[i], [field]: val }; return { ...prev, options: o }; });
  const removeOption = (i: number) => setFormData(prev => ({ ...prev, options: prev.options.filter((_, idx) => idx !== i) }));

  // --- Addons helpers ---
  const addAddon = () => setFormData(prev => ({ ...prev, addons: [...prev.addons, { name: '', priceExtra: 0 }] }));
  const updateAddon = (i: number, field: keyof MenuItemAddon, val: string | number) =>
    setFormData(prev => { const a = [...prev.addons]; a[i] = { ...a[i], [field]: val }; return { ...prev, addons: a }; });
  const removeAddon = (i: number) => setFormData(prev => ({ ...prev, addons: prev.addons.filter((_, idx) => idx !== i) }));

  const handleSave = () => {
    const { previewImages, ...rest } = formData;
    const cleanedData = {
      ...rest,
      // Gửi kèm mảng IDs ảnh từ thư viện
      images: galleryImageIds,
      options: rest.options.filter(o => o.name.trim() !== ''),
      addons: rest.addons.filter(a => a.name.trim() !== ''),
    };
    onSave(cleanedData, selectedFiles.length > 0 ? selectedFiles : null);
  };

  useEffect(() => {
    axios.get('/api/categories')
      .then((res) => {
        const payload = res.data;
        const list = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.categories)
            ? payload.categories
            : Array.isArray(payload?.data)
              ? payload.data
              : [];

        if (list.length > 0) {
          setCategories(list.map((cat: any) => ({
            id: cat._id || cat.id,
            _id: cat._id || cat.id,
            name: cat.name,
            image: cat.image,
            displayOrder: Number(cat.displayOrder || 0),
            status: cat.status === 'unavailable' ? 'unavailable' : 'available',
            slug: cat.slug,
          })));
          return;
        }
        setCategories([]);
      })
      .catch((error) => console.error('Failed to fetch categories:', error));
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl"
      >
        <div className="p-8 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-2xl font-black text-gray-900 tracking-tight">
            {item ? 'Sửa món ăn' : 'Thêm món mới'}
          </h3>
          <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Tên món */}
          <div className="space-y-2 relative">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Tên món</label>
            <input
              type="text"
              placeholder="Nhập tên món ăn..."
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
            
            {/* Image Suggestions Grid */}
            <AnimatePresence>
              {suggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-3xl shadow-2xl z-50 p-4"
                >
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 px-1">Gợi ý từ thư viện</p>
                  <div className="grid grid-cols-4 gap-2">
                    {suggestions.map((img, i) => (
                      <div
                        key={img._id || i}
                        onClick={() => selectSuggestedImage(img)}
                        className="aspect-square rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-amber-500 transition-all group relative"
                      >
                        <img src={`/api/images/${img._id}`} alt={img.displayName} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white">
                          <Plus className="w-5 h-5" />
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Giá (VNĐ)</label>
              <input
                type="input"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Danh mục</label>
              <select
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/20 appearance-none"
              >
                <option value="">Chọn danh mục</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Upload ảnh */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Hình ảnh ({formData.previewImages.length}/5)</label>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {formData.previewImages.map((preview, index) => (
                <div key={index} className="relative aspect-square group">
                  <img src={preview} alt="Preview" className="w-full h-full object-cover rounded-2xl border border-gray-100" />
                  <button
                    onClick={() => removePreview(index)}
                    className="absolute -top-1 -right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {formData.previewImages.length < 5 && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 hover:border-amber-400 transition-all"
                >
                  <Plus className="w-6 h-6 text-gray-300" />
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" multiple className="hidden" />
                </div>
              )}
            </div>
          </div>

          {/* Mô tả */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Mô tả</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="Nhập mô tả món ăn..."
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/20 resize-none"
            />
          </div>

          {/* Tuỳ chọn (Options – chọn 1) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Tuỳ chọn (Chọn 1)</label>
              <button onClick={addOption} className="text-xs font-bold text-amber-500 hover:text-amber-600 flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Thêm
              </button>
            </div>
            {formData.options.map((opt, i) => (
              <div key={i} className="flex gap-2">
                <input
                  placeholder="Tên (ví dụ: Size L)"
                  value={opt.name}
                  onChange={(e) => updateOption(i, 'name', e.target.value)}
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
                <input
                  type="number"
                  placeholder="+Giá"
                  value={opt.priceExtra}
                  onChange={(e) => updateOption(i, 'priceExtra', Number(e.target.value))}
                  className="w-24 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
                <button onClick={() => removeOption(i)} className="p-2 text-red-400 hover:bg-red-50 rounded-xl">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Addons (chọn nhiều) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Topping / Addon</label>
              <button onClick={addAddon} className="text-xs font-bold text-amber-500 hover:text-amber-600 flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Thêm
              </button>
            </div>
            {formData.addons.map((addon, i) => (
              <div key={i} className="flex gap-2">
                <input
                  placeholder="Tên (ví dụ: Thêm bún)"
                  value={addon.name}
                  onChange={(e) => updateAddon(i, 'name', e.target.value)}
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
                <input
                  type="number"
                  placeholder="+Giá"
                  value={addon.priceExtra}
                  onChange={(e) => updateAddon(i, 'priceExtra', Number(e.target.value))}
                  className="w-24 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
                <button onClick={() => removeAddon(i)} className="p-2 text-red-400 hover:bg-red-50 rounded-xl">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="p-8 bg-gray-50 border-t border-gray-100 flex gap-4">
          <Button variant="outline" className="flex-1 py-4" onClick={onClose}>Huỷ</Button>
          <Button variant="secondary" className="flex-1 py-4 shadow-lg shadow-amber-500/20" onClick={handleSave}>
            Lưu lại
          </Button>
        </div>
      </motion.div>
    </div>
  );
};
