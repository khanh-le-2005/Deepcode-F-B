import React, { useState } from 'react';
import { useSocket } from '../../../contexts/SocketContext';
import { 
  Bell, 
  Check, 
  Trash2, 
  Search, 
  Filter, 
  ShoppingBag, 
  CreditCard, 
  AlertTriangle,
  ChevronRight,
  MoreVertical,
  CheckCircle2
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '../../../lib/cn';
import { Button } from '../../../components/Button';
import { NotificationDetailModal } from '../../../components/NotificationDetailModal';
import { Notification } from '../../../types';
import { motion, AnimatePresence } from 'framer-motion';

export const AdminNotifications = () => {
  const { notifications, unreadCount, markAsRead, markAllRead } = useSocket();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [selectedNotif, setSelectedNotif] = useState<Notification | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredNotifications = notifications.filter(notif => {
    const matchesSearch = notif.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         notif.message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || 
                         (filter === 'unread' && !notif.isRead) || 
                         (filter === 'read' && notif.isRead);
    return matchesSearch && matchesFilter;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'new_order': return <ShoppingBag className="w-6 h-6 text-amber-500" />;
      case 'payment_success': return <CreditCard className="w-6 h-6 text-emerald-500" />;
      case 'system_alert': return <AlertTriangle className="w-6 h-6 text-rose-500" />;
      default: return <Bell className="w-6 h-6 text-blue-500" />;
    }
  };

  const handleOpenDetail = (notif: Notification) => {
    setSelectedNotif(notif);
    setIsModalOpen(true);
    if (!notif.isRead) {
      markAsRead(notif.id || notif._id);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight font-serif mb-2">Thông báo</h2>
          <p className="text-slate-500 font-medium">Bạn có {unreadCount} thông báo chưa đọc trong hệ thống</p>
        </div>
        
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              onClick={markAllRead}
              className="rounded-2xl border-2 border-slate-100 font-black text-[10px] uppercase tracking-widest text-slate-600 hover:bg-slate-50 h-12 px-6"
            >
              Đánh dấu tất cả là đã đọc
            </Button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm kiếm thông báo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-14 bg-white border border-slate-100 rounded-2xl pl-12 pr-4 text-slate-700 font-medium focus:ring-2 focus:ring-brand/20 outline-none transition-all shadow-sm"
          />
        </div>

        <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-sm shrink-0">
          {(['all', 'unread', 'read'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                filter === f ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:text-slate-600"
              )}
            >
              {f === 'all' ? 'Tất cả' : f === 'unread' ? 'Chưa đọc' : 'Đã đọc'}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden min-h-[400px]">
        {filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center px-6">
            <div className="w-24 h-24 bg-slate-50 rounded-3xl flex items-center justify-center mb-6">
              <Bell className="w-10 h-10 text-slate-200" />
            </div>
            <h4 className="text-xl font-black text-slate-900 mb-2">Không tìm thấy thông báo</h4>
            <p className="text-slate-500 max-w-sm font-medium">
              Thử đổi bộ lọc hoặc từ khóa tìm kiếm để xem các thông báo khác.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            <AnimatePresence initial={false}>
              {filteredNotifications.map((notif) => (
                <motion.div
                  layout
                  key={notif.id || notif._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  whileHover={{ backgroundColor: '#f8fafc' }}
                  onClick={() => handleOpenDetail(notif)}
                  className={cn(
                    "p-6 transition-all cursor-pointer flex items-center gap-6",
                    !notif.isRead && "relative before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-brand"
                  )}
                >
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border transition-all",
                    notif.isRead 
                      ? "bg-slate-50 border-slate-100 grayscale opacity-60" 
                      : "bg-white border-brand/10 shadow-lg shadow-brand/5 scale-105"
                  )}>
                    {getIcon(notif.type)}
                  </div>

                  <div className="flex-1 min-w-0 py-1">
                    <div className="flex items-center justify-between gap-4 mb-1">
                      <h4 className={cn(
                        "text-lg font-black tracking-tight truncate",
                        notif.isRead ? "text-slate-500" : "text-slate-900"
                      )}>
                        {notif.title}
                      </h4>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs font-bold text-slate-400">
                          {format(new Date(notif.createdAt), 'HH:mm dd/MM', { locale: vi })}
                        </span>
                        {!notif.isRead && (
                           <div className="w-2.5 h-2.5 bg-brand rounded-full shadow-lg shadow-brand/40" />
                        )}
                      </div>
                    </div>
                    
                    <p className={cn(
                      "text-slate-600 font-medium line-clamp-1",
                      !notif.isRead && "text-slate-900"
                    )}>
                      {notif.message}
                    </p>
                    
                    <div className="flex items-center gap-4 mt-3">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true, locale: vi })}
                      </span>
                      {notif.referenceId && (
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-100 text-[10px] font-bold text-slate-500">
                          ID: <span className="text-slate-900 font-black">{notif.referenceId.slice(-8)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="px-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight className="w-6 h-6 text-slate-300" />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Global Detail Modal */}
      <NotificationDetailModal 
        isOpen={isModalOpen}
        notification={selectedNotif}
        onClose={() => setIsModalOpen(false)}
        onMarkAsRead={(id) => markAsRead(id)}
      />

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f8fafc; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>
  );
};
