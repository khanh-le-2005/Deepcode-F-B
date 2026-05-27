import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Minus, CheckCircle2, Sparkles } from 'lucide-react';
import { MenuItem } from '../../types';

interface StaffItemDetailModalProps {
  item: MenuItem;
  onClose: () => void;
  onAddToCart: (item: MenuItem, quantity: number, selectedOption?: any, selectedAddons?: any[], note?: string) => void;
}

export const StaffItemDetailModal: React.FC<StaffItemDetailModalProps> = ({ item, onClose, onAddToCart }) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedOption, setSelectedOption] = useState<any>(null);
  const [selectedAddons, setSelectedAddons] = useState<any[]>([]);
  const [note, setNote] = useState('');

  // Auto-select the first option if options exist
  useEffect(() => {
    if (item.options && item.options.length > 0 && !selectedOption) {
      setSelectedOption(item.options[0]);
    }
  }, [item, selectedOption]);

  const handleToggleAddon = (addon: any) => {
    const isSelected = selectedAddons.find((a) => a.name === addon.name);
    if (isSelected) {
      setSelectedAddons(selectedAddons.filter((a) => a.name !== addon.name));
    } else {
      setSelectedAddons([...selectedAddons, addon]);
    }
  };

  const optionsPrice = selectedOption ? (selectedOption.priceExtra || selectedOption.price || 0) : 0;
  const addonsPrice = selectedAddons.reduce((sum, a) => sum + (a.priceExtra || a.price || 0), 0);
  const unitPrice = item.price + optionsPrice + addonsPrice;
  const totalPrice = unitPrice * quantity;

  return (
    // Backdrop
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-end md:items-center justify-center md:p-6"
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose}></div>

      {/* Modal Container */}
      <motion.div
        initial={{ y: "100%", opacity: 0.5 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative w-full max-w-4xl bg-white rounded-t-[32px] md:rounded-[40px] overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh] md:max-h-[85vh] z-10"
      >
        {/* NÚT ĐÓNG (X) DẠNG KÍNH MỜ */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 md:top-6 md:right-6 z-50 p-2 md:p-2.5 bg-black/30 hover:bg-black/50 text-white backdrop-blur-md rounded-full flex items-center justify-center transition-all active:scale-90 shadow-lg cursor-pointer"
        >
          <X size={20} strokeWidth={2.5} className="md:w-6 md:h-6" />
        </button>

        {/* CỘT TRÁI: HÌNH ẢNH */}
        <div className="w-full md:w-1/2 shrink-0 aspect-[4/3] sm:aspect-[16/9] md:aspect-auto relative bg-gray-100">
          <img
            src={item.images?.[0] ? `/api/images/${item.images[0]}` : '/placeholder.png'}
            className="absolute inset-0 w-full h-full object-cover"
            alt={item.name}
          />
          {/* Gradient mờ phần đáy ảnh trên mobile để làm nền cho khối chữ đè lên */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent md:hidden pointer-events-none" />
        </div>

        {/* CỘT PHẢI: THÔNG TIN CHI TIẾT */}
        <div className="flex-1 flex flex-col bg-white relative z-20 -mt-8 md:mt-0 rounded-t-[32px] md:rounded-none min-h-0">
          
          {/* Thanh gạt nhỏ trên Mobile (Vuốt để đóng - giả lập UI) */}
          <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3 mb-1 md:hidden" />

          {/* KHOẢNG NỘI DUNG CUỘN */}
          <div className="flex-1 overflow-y-auto px-5 md:px-10 pt-5 md:pt-10 pb-6 custom-scrollbar">
            
            <div className="flex items-center gap-2 mb-2 md:mb-3">
              <span className="bg-orange-50 text-[#f97316] text-[9px] md:text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-md">
                {item.category || 'Món ngon'}
              </span>
            </div>

            <h3 className="text-2xl md:text-4xl font-black text-gray-900 mb-3 md:mb-4 leading-tight tracking-tight pr-8 md:pr-0">
              {item.name}
            </h3>

            <p className="text-gray-500 text-xs md:text-base mb-6 md:mb-8 leading-relaxed">
              {item.description || 'Hương vị tươi mát và sảng khoái, pha chế đặc biệt từ những nguyên liệu chọn lọc.'}
            </p>

            {/* KHOẢNG CHỌN SIZE */}
            {item.options && item.options.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3 md:mb-4 bg-gray-50 px-3 md:px-4 py-2 rounded-lg md:rounded-xl border border-gray-100">
                  <h4 className="font-bold text-xs md:text-sm text-gray-800 uppercase tracking-widest">Kích cỡ (Bắt buộc)</h4>
                </div>
                <div className="grid grid-cols-2 gap-2 md:gap-3">
                  {item.options.map((opt: any) => {
                    const isSelected = selectedOption?.name === opt.name;
                    const priceExtra = opt.priceExtra || opt.price || 0;
                    return (
                      <button
                        key={opt.name}
                        onClick={() => setSelectedOption(opt)}
                        className={`relative p-3 md:p-4 rounded-xl md:rounded-2xl border-2 transition-all flex flex-col items-start gap-0.5 md:gap-1 cursor-pointer ${
                          isSelected
                            ? 'bg-orange-50 border-[#f97316] shadow-sm'
                            : 'bg-white border-gray-100 hover:border-orange-200'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-2 right-2 md:top-3 md:right-3 bg-[#f97316] text-white rounded-full p-0.5">
                            <CheckCircle2 size={12} className="md:w-3.5 md:h-3.5" />
                          </div>
                        )}
                        <span className={`font-black text-sm md:text-base ${isSelected ? 'text-[#f97316]' : 'text-gray-700'}`}>
                          {opt.name}
                        </span>
                        <span className={`text-[10px] md:text-xs font-semibold ${isSelected ? 'text-[#f97316]' : 'text-gray-400'}`}>
                          {priceExtra > 0 ? `+ ${priceExtra.toLocaleString()}đ` : 'Giá mặc định'}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* KHOẢNG CHỌN TOPPING */}
            {item.addons && item.addons.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3 md:mb-4 bg-gray-50 px-3 md:px-4 py-2 rounded-lg md:rounded-xl border border-gray-100">
                  <h4 className="font-bold text-xs md:text-sm text-gray-800 uppercase tracking-widest flex items-center gap-2">
                    <Sparkles size={14} className="text-[#f97316]" /> Thêm Topping
                  </h4>
                  <span className="text-[9px] md:text-[10px] font-black text-gray-400">CHỌN NHIỀU</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
                  {item.addons.map((addon: any, idx: number) => {
                    const isSelected = !!selectedAddons.find(a => a.name === addon.name);
                    const priceExtra = addon.priceExtra || addon.price || 0;
                    return (
                      <button
                        key={idx}
                        onClick={() => handleToggleAddon(addon)}
                        className={`relative p-3 md:p-4 rounded-xl md:rounded-2xl border-2 transition-all flex items-center justify-between gap-2 cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-500 shadow-sm'
                            : 'bg-white border-gray-100 hover:border-emerald-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-gray-300'}`}>
                            {isSelected && <CheckCircle2 size={10} className="text-white" />}
                          </div>
                          <span className={`font-bold text-xs md:text-sm ${isSelected ? 'text-emerald-700' : 'text-gray-700'}`}>
                            {addon.name}
                          </span>
                        </div>
                        <span className={`text-[10px] md:text-xs font-semibold ${isSelected ? 'text-emerald-600' : 'text-gray-400'}`}>
                          + {priceExtra.toLocaleString()}đ
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Ghi chú */}
            <div className="mb-4">
               <div className="flex items-center justify-between mb-3 md:mb-4 bg-gray-50 px-3 md:px-4 py-2 rounded-lg md:rounded-xl border border-gray-100">
                  <h4 className="font-bold text-xs md:text-sm text-gray-800 uppercase tracking-widest">Ghi chú cho bếp</h4>
                </div>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="VD: Ít đá, không hành..."
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-[#f97316]/20 outline-none resize-none h-24"
              />
            </div>

          </div>

          {/* KHOẢNG THANH TOÁN DÍNH ĐÁY */}
          <div className="shrink-0 p-4 md:p-6 lg:p-8 bg-white border-t border-gray-100 shadow-[0_-10px_20px_rgba(0,0,0,0.03)] z-30">
            <div className="flex flex-col gap-4">
              
              {/* Bộ tăng giảm số lượng và Tạm tính */}
              <div className="flex items-center justify-between bg-gray-50 p-2 md:p-3 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Số lượng</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-[#f97316] hover:text-white hover:border-[#f97316] transition-all active:scale-90 cursor-pointer"
                    >
                      <Minus size={16} />
                    </button>
                    <div className="w-10 md:w-12 text-center font-black text-lg text-gray-800">
                      {quantity}
                    </div>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-[#f97316] hover:text-white hover:border-[#f97316] transition-all active:scale-90 cursor-pointer"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
                <div className="flex flex-col items-end mr-2">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Tạm tính</span>
                  <span className="text-lg md:text-xl font-black text-[#f97316]">
                    {totalPrice.toLocaleString()}đ
                  </span>
                </div>
              </div>

              {/* Add to Cart Button */}
              <button
                onClick={() => onAddToCart(item, quantity, selectedOption, selectedAddons, note)}
                disabled={item.options?.length > 0 && !selectedOption}
                className="w-full py-3.5 md:py-4 lg:py-5 bg-[#f97316] disabled:opacity-50 text-white font-black rounded-xl md:rounded-[20px] shadow-lg shadow-orange-500/30 hover:bg-[#ea580c] transition-all flex items-center justify-center gap-2 text-sm md:text-base uppercase tracking-widest active:scale-95 cursor-pointer"
              >
                Thêm {quantity} phần vào giỏ
              </button>
            </div>
          </div>

        </div>
      </motion.div>
    </motion.div>
  );
};
