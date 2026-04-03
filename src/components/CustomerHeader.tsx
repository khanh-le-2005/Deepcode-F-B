import { Search, ShoppingBag, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CustomerHeaderProps {
  tableId?: string;
  totalItems?: number;
  onCartClick?: () => void;
  showBackButton?: boolean;
}

export const CustomerHeader = ({
  tableId,
  totalItems = 0,
  onCartClick,
  showBackButton = false
}: CustomerHeaderProps) => {
  const navigate = useNavigate();

  return (
    <header className="bg-[#111] text-white sticky top-0 z-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
        {showBackButton ? (
          <button
            onClick={() => navigate(tableId ? `/table/${tableId}/menu` : '/menu')}
            className="flex items-center gap-2 hover:text-red-600 transition-colors uppercase font-bold text-sm"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Quay lại</span>
          </button>
        ) : (
          <div className="flex items-center gap-4 xl:gap-8">
            <h1 className="text-2xl sm:text-3xl font-black italic tracking-tighter text-red-600" style={{ fontFamily: "'Playfair Display', serif" }}>PIZZAN</h1>
            <nav className="hidden md:flex gap-6 text-sm font-bold uppercase tracking-widest">
              <a href="#" className="text-red-600">Trang chủ</a>
              <a href="#" className="text-white hover:text-red-600 transition-colors">Thực đơn</a>
            </nav>
          </div>
        )}

        <div className="flex items-center gap-4 sm:gap-6">
          {!showBackButton && <Search className="w-5 h-5 cursor-pointer hover:text-red-600 transition-colors" />}

          <div className="relative cursor-pointer flex items-center" onClick={onCartClick}>
            <ShoppingBag className="w-5 h-5 hover:text-red-600 transition-colors" />
            <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
              {totalItems}
            </span>
          </div>

          {tableId && (
            <button className="bg-red-600 hover:bg-red-700 text-white px-3 sm:px-6 py-1.5 sm:py-2 rounded font-bold text-[10px] sm:text-sm transition-all uppercase whitespace-nowrap">
              Bàn: {tableId}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
