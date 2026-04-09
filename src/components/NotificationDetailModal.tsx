import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, Calendar, Tag, ExternalLink, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Notification } from '../types';
import { Button } from './Button';

interface NotificationDetailModalProps {
  notification: Notification | null;
  isOpen: boolean;
  onClose: () => void;
  onMarkAsRead: (id: string) => void;
}

export const NotificationDetailModal: React.FC<NotificationDetailModalProps> = ({
  notification,
  isOpen,
  onClose,
  onMarkAsRead
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!notification || !mounted) return null;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-9999">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 flex flex-col"
          >
            {/* Header Area */}
            <div className={`p-8 pb-10 relative overflow-hidden ${
              notification.isRead ? 'bg-slate-50' : 'bg-linear-to-br from-brand to-brand-dark'
            }`}>
              <button
                onClick={onClose}
                className={`absolute top-6 right-6 p-2 rounded-full transition-colors z-20 ${
                  notification.isRead ? 'hover:bg-slate-200 text-slate-500' : 'hover:bg-white/20 text-white'
                }`}
              >
                <X size={20} />
              </button>

              <div className="relative z-10">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-lg ${
                  notification.isRead ? 'bg-white text-slate-400' : 'bg-white/20 text-white backdrop-blur-md'
                }`}>
                  <Bell size={28} />
                </div>
                <h3 className={`text-2xl font-black tracking-tight leading-tight ${
                  notification.isRead ? 'text-slate-900' : 'text-white'
                }`}>
                  {notification.title}
                </h3>
              </div>

              {/* Decorative shapes */}
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
            </div>

            {/* Content Area */}
            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                    <Tag size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Loại thông báo</span>
                    <p className="font-bold text-slate-800 capitalize">{notification.type.replace('_', ' ')}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                    <Calendar size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Thời gian</span>
                    <p className="font-bold text-slate-800">
                      {format(new Date(notification.createdAt), 'EEEE, dd MMMM yyyy HH:mm', { locale: vi })}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                   <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-3">Nội dung chi tiết</span>
                   <p className="text-slate-700 leading-relaxed font-medium">
                     {notification.message}
                   </p>
                </div>

                {notification.referenceId && (
                  <div className="flex items-center gap-2 p-4 bg-brand/5 border border-brand/10 rounded-2xl text-brand">
                    <ExternalLink size={16} />
                    <span className="text-xs font-bold truncate">Mã tham chiếu: {notification.referenceId}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions Footer */}
            {/* <div className="p-8 pt-0 flex gap-4 mt-auto">
              {!notification.isRead && (
                <button
                  onClick={() => {
                      onMarkAsRead(notification.id || notification._id || '');
                  }}
                  className="flex-1 h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-100 border-none transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle size={18} /> Đã xử lý
                </button>
              )}
              <button
                onClick={onClose}
                className="flex-1 h-14 rounded-2xl border-2 border-slate-100 hover:bg-slate-50 text-slate-500 font-black text-xs uppercase tracking-widest transition-all"
              >
                Đóng
              </button>
            </div> */}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};
