import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Hash, AlertCircle } from 'lucide-react';
import { Table } from '../../../types';
import { Button } from '../../../components/Button';
import { toast } from 'react-toastify';

export const AdminTableModal = ({
  isOpen,
  onClose,
  onSave,
  table,
  tables = []
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  table: Table | null;
  tables: Table[];
}) => {
  const [formData, setFormData] = useState({
    name: '',
  });

  useEffect(() => {
    if (table) {
      setFormData({ name: table.name });
    } else {
      setFormData({ name: '' });
    }
  }, [table, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if duplicate
    const normalizedName = formData.name.trim();
    if (!normalizedName) {
      toast.error('Vui lòng nhập số bàn');
      return;
    }

    const isDuplicate = tables.some(t => 
      t.name.toString().toLowerCase() === normalizedName.toLowerCase() && 
      t.id !== table?.id
    );

    if (isDuplicate) {
      toast.error(`Bàn "${normalizedName}" đã tồn tại!`);
      return;
    }

    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl"
      >
        <div className="p-8 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-2xl font-black text-gray-900 tracking-tight">
            {table ? 'Sửa thông tin bàn' : 'Thêm bàn mới'}
          </h3>
          <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-8 space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Hash className="w-4 h-4" /> Số bàn
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ví dụ: 15"
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-4 font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
              />
            </div>
          </div>

          <div className="p-8 bg-gray-50 border-t border-gray-100 flex gap-4">
            <Button type="button" variant="outline" className="flex-1 py-4" onClick={onClose}>Huỷ</Button>
            <Button type="submit" variant="secondary" className="flex-1 py-4 font-black uppercase tracking-widest">Lưu lại</Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
