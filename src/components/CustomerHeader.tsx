import { useState, useRef, useEffect } from "react";
import { Search, ShoppingBag, ChevronLeft, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../lib/cn";

interface CustomerHeaderProps {
  tableId?: string;
  totalItems?: number;
  onCartClick?: () => void;
  showBackButton?: boolean;
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
  categories?: string[];
  selectedCategory?: string;
  onCategoryChange?: (category: string) => void;
}

export const CustomerHeader = ({
  tableId,
  totalItems = 0,
  onCartClick,
  showBackButton = false,
  searchTerm = "",
  onSearchChange,
  categories = [],
  selectedCategory = "Tất cả",
  onCategoryChange,
}: CustomerHeaderProps) => {
  const navigate = useNavigate();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCategoryOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isSearchOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isSearchOpen]);

  const handleSearchClose = () => {
    setIsSearchOpen(false);
    if (onSearchChange) onSearchChange("");
  };

  return (
    <header className="bg-[#111] text-white sticky top-0 z-100 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between relative">
        <AnimatePresence mode="wait">
          {!isSearchOpen ? (
            <motion.div
              key="header-content"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex items-center justify-between w-full"
            >
              {showBackButton ? (
                <button
                  onClick={() =>
                    navigate(tableId ? `/table/${tableId}/menu` : "/menu")
                  }
                  className="flex items-center gap-2 hover:text-red-600 transition-colors uppercase font-bold text-sm"
                >
                  <ChevronLeft className="w-5 h-5" />
                  <span>Quay lại</span>
                </button>
              ) : (
                <div className="flex items-center gap-4 xl:gap-8">
                  <h1
                    className="text-2xl sm:text-3xl font-black italic tracking-tighter text-red-600"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    PIZZAN
                  </h1>
                  <nav className="hidden md:flex gap-6 text-sm font-bold uppercase tracking-widest items-center">
                    <p className="text-white">Thực đơn</p>
                    
                    {categories.length > 0 && (
                      <div className="relative" ref={dropdownRef}>
                        <button 
                          onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                          className={cn(
                            "flex items-center gap-1.5 transition-colors hover:text-red-600",
                            isCategoryOpen ? "text-red-600" : "text-gray-400"
                          )}
                        >
                          Danh mục {selectedCategory !== "Tất cả" && `: ${selectedCategory}`}
                          <ChevronLeft className={cn("w-4 h-4 transition-transform", isCategoryOpen ? "rotate-90" : "-rotate-90")} />
                        </button>

                        <AnimatePresence>
                          {isCategoryOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 10 }}
                              className="absolute top-full left-0 mt-4 w-64 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl p-4 space-y-1 block"
                            >
                              {categories.map(cat => (
                                <button
                                  key={cat}
                                  onClick={() => {
                                    onCategoryChange?.(cat);
                                    setIsCategoryOpen(false);
                                  }}
                                  className={cn(
                                    "w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between group",
                                    selectedCategory === cat ? "bg-red-600 text-white" : "text-gray-400 hover:bg-white/5 hover:text-white"
                                  )}
                                >
                                  {cat}
                                  {selectedCategory === cat && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </nav>
                </div>
              )}

              <div className="flex items-center gap-4 sm:gap-6">
                {!showBackButton && (
                  <Search
                    className="w-5 h-5 cursor-pointer hover:text-red-600 transition-colors"
                    onClick={() => setIsSearchOpen(true)}
                  />
                )}

                <div
                  className="relative cursor-pointer flex items-center"
                  onClick={onCartClick}
                >
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
            </motion.div>
          ) : (
            <motion.div
              key="search-bar"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex items-center gap-4 w-full h-full"
            >
              <div className="flex-1 relative flex items-center">
                <Search className="absolute left-3 w-4 h-4 text-gray-400" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Tìm tên món ăn..."
                  value={searchTerm}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50 transition-all font-medium placeholder:text-gray-500"
                />
              </div>
              <button
                onClick={handleSearchClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile Categories Scroll */}
      {!isSearchOpen && categories.length > 0 && (
        <div className="md:hidden border-t border-white/5 bg-[#111] py-3 overflow-x-auto no-scrollbar scroll-smooth">
          <div className="flex gap-2 px-4 min-w-max">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => onCategoryChange?.(cat)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                  selectedCategory === cat
                    ? "bg-red-600 text-white shadow-lg shadow-red-600/20"
                    : "bg-white/5 text-gray-400 border border-white/10"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};
