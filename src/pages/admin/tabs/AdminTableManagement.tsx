/// <reference types="vite/client" />

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Grid, Trash2, Edit2, QrCode, X, Printer, ChevronRight, Utensils } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { io } from 'socket.io-client';
import { QRCodeSVG } from 'qrcode.react';
import { Table } from '../../../types';
import { Button } from '../../../components/Button';
import { AdminTableModal } from '../modals/AdminTableModal';
import { cn } from '../../../lib/cn';

const socket = io();
const getPublicAppUrl = () => {
  const configured = import.meta.env.VITE_APP_URL as string | undefined;
  return (configured || window.location.origin).replace(/\/$/, '');
};

export const AdminTableManagement = () => {
  const [tables, setTables] = useState<Table[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [selectedQR, setSelectedQR] = useState<Table | null>(null);

  useEffect(() => {
    fetchTables();
    socket.on('tables-updated', setTables);
    return () => {
      socket.off('tables-updated');
    };
  }, []);

  const fetchTables = () => {
    axios.get('/api/tables')
      .then(res => setTables(res.data))
      .catch(err => console.error("Failed to fetch tables:", err));
  };

  const handleSave = async (data: any) => {
    try {
      if (editingTable) {
        await axios.put(`/api/tables/${editingTable.id}`, data);
      } else {
        await axios.post('/api/tables', data);
      }
      fetchTables();
      setIsModalOpen(false);
      toast.success(editingTable ? 'Cập nhật bàn thành công!' : 'Thêm bàn mới thành công!');
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi lưu thông tin bàn!');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xoá bàn này?')) {
      try {
        await axios.delete(`/api/tables/${id}`);
        fetchTables();
        toast.success('Đã xoá bàn!');
      } catch (err) {
        console.error("Failed to delete table:", err);
        toast.error('Lỗi khi xoá bàn!');
      }
    }
  };

  return (
    <div className="space-y-10 pb-12">
      {/* Header Area */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-gray-900 tracking-tight font-serif">Quản Lý Bàn</h2>
          <p className="text-gray-500 font-medium mt-1">Quản lý sơ đồ bàn và mã QR đặt món thông minh</p>
        </div>
        <Button
          variant="secondary"
          size="lg"
          onClick={() => {
            setEditingTable(null);
            setIsModalOpen(true);
          }}
          className="bg-brand text-white hover:bg-brand-dark px-8 h-14 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-brand/20 border-none transition-all hover:-translate-y-1"
        >
          <Plus className="w-5 h-5 mr-1" /> Thêm bàn mới
        </Button>
      </div>

      {/* Stats Summary - Mini */}
      <div className="flex flex-wrap gap-4">
        {[
          { label: 'Tổng số bàn', count: tables.length, color: 'text-slate-900', bg: 'bg-white' },
          { label: 'Đang phục vụ', count: tables.filter(t => t.status === 'occupied').length, color: 'text-brand', bg: 'bg-brand/5' },
          { label: 'Bàn trống', count: tables.filter(t => t.status === 'empty').length, color: 'text-emerald-500', bg: 'bg-emerald-50' }
        ].map((stat, i) => (
          <div key={i} className={cn("px-6 py-4 rounded-2xl border border-gray-100 shadow-card flex items-center gap-4", stat.bg)}>
            <div className={cn("text-2xl font-black font-serif leading-none", stat.color)}>{stat.count}</div>
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        <AnimatePresence mode="popLayout">
          {tables.map((table, i) => (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: i * 0.05 }}
              key={table.id}
              className={cn(
                "premium-card p-8 group relative",
                table.status === 'occupied' && "ring-2 ring-brand/20"
              )}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between mb-10">
                <div className={cn(
                  "w-16 h-16 rounded-[2rem] flex items-center justify-center shadow-xl transition-all duration-500 group-hover:rotate-6",
                  table.status === 'occupied' ? "bg-brand text-white shadow-brand/20" : "bg-gray-100 text-gray-400 shadow-gray-100"
                )}>
                  <Utensils className="w-8 h-8" />
                </div>

                <div className="relative z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTable(table);
                      setIsModalOpen(true);
                    }}
                    className="p-3 bg-white border border-gray-100 text-gray-600 rounded-xl hover:text-brand hover:border-brand/40 shadow-sm transition-all"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(table.id)}
                    className="p-3 bg-white border border-gray-100 text-rose-500 rounded-xl hover:bg-rose-50 transition-all shadow-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Table Info */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-3xl font-black text-slate-900 font-serif leading-none">{table.name}</h4>
                  <div className="flex items-center gap-2 mt-3">
                    <div className={cn(
                      "w-2 h-2 rounded-full shadow-sm",
                      table.status === 'occupied' ? "bg-brand animate-pulse" : "bg-emerald-500"
                    )} />
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-[0.2em]",
                      table.status === 'occupied' ? "text-brand" : "text-emerald-600"
                    )}>
                      {table.status === 'occupied' ? 'Đang phục vụ' : 'Bàn trống'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedQR(table)}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2.5 hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 active:scale-95"
                >
                  <QrCode className="w-4 h-4" /> Xem mã QR
                </button>
              </div>

              {/* Status Pill Decor */}
              <div className={cn(
                "absolute top-6 right-6 z-0 w-10 h-10 border-r-2 border-t-2 rounded-tr-2xl opacity-20 pointer-events-none transition-all duration-700 group-hover:scale-125 group-hover:-translate-x-1 group-hover:translate-y-1",
                table.status === 'occupied' ? "border-brand" : "border-emerald-500"
              )} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {tables.length === 0 && (
        <div className="premium-card py-32 flex flex-col items-center justify-center text-center">
          <div className="w-24 h-24 bg-gray-50 rounded-[3rem] flex items-center justify-center mb-6">
            <Grid className="w-10 h-10 text-gray-200" />
          </div>
          <h3 className="text-2xl font-black text-gray-900 font-serif mb-2">Chưa có sơ đồ bàn</h3>
          <p className="text-gray-400 font-medium">Bạn có thể thêm bàn mới bằng nút phía trên</p>
        </div>
      )}

      {/* Admin Modals */}
      <AdminTableModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        table={editingTable}
      />

      {/* QR Modal */}
      <AnimatePresence>
        {selectedQR && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white p-12 rounded-[3.5rem] shadow-premium text-center relative max-w-sm w-full border border-gray-100"
            >
              <button
                onClick={() => setSelectedQR(null)}
                className="absolute top-8 right-8 p-3 bg-gray-50 text-gray-400 rounded-2xl hover:bg-gray-100 hover:text-slate-900 transition-all"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-10">
                <h3 className="text-3xl font-black text-gray-900 font-serif leading-none">{selectedQR.name}</h3>
                <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-3">Mã QR Gọi Món</p>
              </div>

              <div className="bg-white p-10 rounded-[3rem] shadow-card border border-gray-100 inline-block mx-auto mb-10 group relative transition-transform hover:scale-105 duration-500">
                <QRCodeSVG 
                  value={`${getPublicAppUrl()}/table/${selectedQR.slug || selectedQR.id}`} 
                  size={240}
                  level="H"
                  includeMargin={false}
                  className="rounded-xl"
                />
                <div className="absolute inset-0 bg-brand/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-[3rem] pointer-events-none" />
              </div>

              <div className="space-y-3">
                <Button
                  variant="secondary"
                  className="w-full h-14 bg-brand text-white border-none rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-brand/20 hover:bg-brand-dark transition-all flex items-center justify-center gap-3"
                  onClick={() => window.print()}
                >
                  <Printer className="w-4 h-4" /> In mã QR
                </Button>
                <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest pt-2">Dán mã này tại từng vị trí bàn</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
