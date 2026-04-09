import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, ShoppingBag, CreditCard, AlertTriangle, Check } from 'lucide-react';
import { useSocket } from '../contexts/SocketContext';
import { cn } from '../lib/cn';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { NotificationDetailModal } from './NotificationDetailModal';
import { Notification } from '../types';

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationDropdown = ({ isOpen, onClose }: NotificationDropdownProps) => {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllRead } = useSocket();
  const [selectedNotif, setSelectedNotif] = useState<Notification | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleNotifClick = (notif: Notification) => {
    setSelectedNotif(notif);
    setIsModalOpen(true);
    const id = notif.id || notif._id;
    if (id && !notif.isRead) {
      markAsRead(id);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'new_order': return <ShoppingBag className="w-5 h-5 text-amber-500" />;
      case 'payment_success': return <CreditCard className="w-5 h-5 text-emerald-500" />;
      case 'system_alert': return <AlertTriangle className="w-5 h-5 text-rose-500" />;
      default: return <Bell className="w-5 h-5 text-blue-500" />;
    }
  };

  const getTimeAgo = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: vi });
    } catch (e) {
      return 'Vừa xong';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay for mobile */}
          <div className="fixed inset-0 z-40 lg:hidden" onClick={onClose} />
          
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 top-full mt-4 w-screen max-w-[400px] bg-white rounded-3xl shadow-2xl border border-gray-100 z-50 overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <div>
                <h3 className="text-lg font-black text-gray-900">Thông báo</h3>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                  Bạn có {unreadCount} thông báo mới
                </p>
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllRead}
                    className="p-2 text-gray-400 hover:text-brand bg-gray-50 rounded-xl transition-all"
                    title="Đọc tất cả"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
                <button 
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-900 bg-gray-50 rounded-xl transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-center px-10">
                  <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
                    <Bell className="w-8 h-8 text-gray-200" />
                  </div>
                  <h4 className="text-gray-900 font-black">Chưa có thông báo</h4>
                  <p className="text-sm text-gray-400 mt-1">Hệ thống sẽ cập nhật khi có đơn hàng hoặc thanh toán mới.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {notifications.map((notif) => (
                    <div 
                      key={notif.id || notif._id || Math.random().toString()}
                      className={cn(
                        "p-5 transition-all cursor-pointer group flex items-start gap-4",
                        notif.isRead ? "bg-white opacity-60" : "bg-brand/5"
                      )}
                      onClick={() => handleNotifClick(notif)}
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border",
                        notif.isRead ? "bg-gray-50 border-gray-100" : "bg-white border-brand/10 shadow-sm"
                      )}>
                        {getIcon(notif.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn(
                            "text-sm font-black leading-tight truncate",
                            notif.isRead ? "text-gray-500" : "text-gray-900"
                          )}>
                            {notif.title}
                          </p>
                          <span className="text-[10px] font-bold text-gray-400 whitespace-nowrap">
                            {getTimeAgo(notif.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                          {notif.message}
                        </p>
                        {!notif.isRead && (
                          <div className="flex items-center gap-2 mt-3">
                            <span className="w-2 h-2 bg-brand rounded-full animate-pulse"></span>
                            <span className="text-[10px] font-black text-brand uppercase tracking-widest">Mới</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {notifications.length > 0 && (
              <div className="p-4 bg-gray-50 border-t border-gray-100 text-center">
                <button 
                  onClick={() => {
                    navigate('/admin/notifications');
                    onClose();
                  }}
                  className="text-xs font-black text-brand uppercase tracking-widest hover:underline transition-all"
                >
                  Xem tất cả thông báo
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}

      <NotificationDetailModal
        isOpen={isModalOpen}
        notification={selectedNotif}
        onClose={() => setIsModalOpen(false)}
        onMarkAsRead={(id) => markAsRead(id)}
      />
    </AnimatePresence>
  );
};
