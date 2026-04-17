import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Grid,
  Tags,
  CalendarDays,
  History,
  UtensilsCrossed,
  Package,
  ShoppingCart,
  CreditCard,
  Landmark,
  BarChart3,
  Settings,
  ChefHat,
  User as UserIcon,
  LogOut,
  ExternalLink,
  ChevronRight,
  X,
  HandCoins,
  Bell
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/cn';

interface AdminSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const AdminSidebar = ({ isOpen, onClose }: AdminSidebarProps) => {
  const { logout, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
    { icon: Grid, label: 'Quản lý bàn', path: '/admin/tables' },
    { icon: Tags, label: 'Danh mục', path: '/admin/categories' },
    { icon: UtensilsCrossed, label: 'Quản lý menu', path: '/admin/menu' },
    { icon: CalendarDays, label: 'Thực đơn tuần', path: '/admin/weekly-menu' },
    { icon: Package, label: 'Combo', path: '/admin/combo' },
    { icon: History, label: 'Lịch sử đơn', path: '/admin/order-history' },
    { icon: ShoppingCart, label: 'Đơn hàng', path: '/admin/orders' },
    { icon: CreditCard, label: 'Thanh toán', path: '/admin/payments' },
    // { icon: HandCoins, label: 'Yêu cầu thanh toán', path: '/admin/payment-requests' },
    { icon: UserIcon, label: 'Nhân viên', path: '/admin/users' },
    { icon: BarChart3, label: 'Báo cáo', path: '/admin/reports' },
    { icon: Bell, label: 'Thông báo', path: '/admin/notifications' },
    { icon: Settings, label: 'Cài đặt', path: '/admin/settings' },
  ];

  const secondaryItems = [
    { icon: ChefHat, label: 'Màn hình Bếp', path: '/kitchen' },
    // { icon: ExternalLink, label: 'Xem Trang chủ', path: '/' },
  ];

  const sidebarContent = (
    <div className="w-72 bg-slate-950 h-full flex flex-col text-white shadow-2xl relative">
      {/* Close Button - Mobile Only */}
      <button
        onClick={onClose}
        className="lg:hidden absolute top-6 right-6 p-2 text-slate-500 hover:text-white transition-colors"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Brand Header */}
      <div className="p-8">
        <Link to="/admin" className="flex items-center gap-4 group" onClick={() => onClose?.()}>
          <div className="w-12 h-12 bg-brand rounded-2xl flex items-center justify-center shadow-lg shadow-brand/20 group-hover:rotate-12 transition-transform duration-500">
            <UtensilsCrossed className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter font-serif leading-none">QR DINE</h1>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand mt-1 opacity-80">Premium F&B</p>
          </div>
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto no-scrollbar">
        <div className="mb-4 px-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Menu chính</div>
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => onClose?.()}
              className={cn(
                "group relative flex items-center justify-between px-4 py-3.5 rounded-2xl font-bold transition-all duration-300",
                isActive
                  ? "bg-brand text-white shadow-lg shadow-brand/20"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <div className="flex items-center gap-3.5">
                <item.icon className={cn("w-5 h-5 transition-transform duration-500 group-hover:scale-110", isActive ? "text-white" : "text-slate-500 group-hover:text-brand")} />
                <span className="text-sm tracking-wide">{item.label}</span>
              </div>
              {isActive && (
                <motion.div layoutId="active-pill" className="w-1.5 h-1.5 bg-white rounded-full shadow-sm" />
              )}
              {!isActive && <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-slate-600" />}
            </Link>
          );
        })}

        <div className="my-8 pt-8 border-t border-white/5 space-y-1">
          <div className="mb-4 px-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Hệ thống</div>
          {secondaryItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => onClose?.()}
              className="flex items-center gap-3.5 px-4 py-3 rounded-2xl text-slate-400 font-bold hover:bg-white/5 hover:text-white transition-all group"
            >
              <item.icon className="w-5 h-5 text-slate-500 group-hover:text-brand" />
              <span className="text-sm tracking-wide">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* User Footer */}
      <div className="p-4 m-4 bg-white/5 rounded-[2rem] border border-white/5">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center border border-white/10 shrink-0">
            <UserIcon className="w-6 h-6 text-slate-400" />
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-bold truncate text-white">{user?.name || 'User'}</p>
            <p className="text-[10px] font-black uppercase text-brand tracking-widest">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={() => {
            logout();
            navigate('/auth/login');
          }}
          className="w-full flex items-center justify-center gap-2.5 px-4 py-3.5 bg-danger text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-danger/90 transition-all shadow-lg shadow-danger/20"
        >
          <LogOut className="w-4 h-4" />
          Đăng xuất
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-72 z-50">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 left-0 z-[50] lg:hidden"
          >
            {sidebarContent}
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
};
