import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Table } from '../../../types';
import { Button } from '../../../components/Button';

export const AdminTableModal = ({
  isOpen,
  onClose,
  onSave,
  table
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  table: Table | null;
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

        <div className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Số bàn</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ví dụ: 15"
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
          </div>
        </div>

        <div className="p-8 bg-gray-50 border-t border-gray-100 flex gap-4">
          <Button variant="outline" className="flex-1 py-4" onClick={onClose}>Huỷ</Button>
          <Button variant="secondary" className="flex-1 py-4" onClick={() => onSave(formData)}>Lưu lại</Button>
        </div>
      </motion.div>
    </div>
  );
};
