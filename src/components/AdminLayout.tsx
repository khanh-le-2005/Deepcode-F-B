import { ReactNode, useState } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { useAuth } from '../AuthContext';
import { Bell, Search, Calendar, Menu, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSocket } from '../contexts/SocketContext';
import { NotificationDropdown } from './NotificationDropdown';
import { cn } from '../lib/cn';

export const AdminLayout = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { unreadCount } = useSocket();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const today = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="flex min-h-screen bg-bg relative overflow-x-hidden">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[45] lg:hidden"
          />
        )}
      </AnimatePresence>

      <AdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 w-full lg:pl-72">
        {/* Top Header */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            {/* Hamburger Menu - Mobile Only */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="flex flex-col">
              <h2 className="text-[10px] lg:text-sm font-bold text-gray-500 flex items-center gap-2">
                <Calendar className="w-3 h-3 lg:w-4 h-4 text-brand" />
                <span className="truncate">{today}</span>
              </h2>
              <p className="text-sm lg:text-lg font-black text-gray-900 truncate max-w-[150px] lg:max-w-none">
                Chào, <span className="text-brand">{user?.name || 'Admin'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 lg:gap-6">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm..."
                className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 w-40 lg:w-64 transition-all"
              />
            </div>

            <div className="relative">
              <button 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className={cn(
                  "relative p-2 rounded-xl transition-all",
                  isNotificationsOpen ? "bg-brand/10 text-brand" : "text-gray-400 hover:text-brand bg-gray-50"
                )}
              >
                <Bell className="w-5 h-5 lg:w-6 h-6" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-danger text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white px-1">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              
              <NotificationDropdown 
                isOpen={isNotificationsOpen} 
                onClose={() => setIsNotificationsOpen(false)} 
              />
            </div>

            <div className="h-9 w-9 lg:h-10 lg:w-10 rounded-full bg-slate-900 flex items-center justify-center text-white font-black text-xs border-2 border-brand/20 shrink-0">
              {user?.name?.charAt(0).toUpperCase() || 'A'}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          <div className="max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
