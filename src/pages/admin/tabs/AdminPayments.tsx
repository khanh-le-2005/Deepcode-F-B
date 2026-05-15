import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Search, Clock, CheckCircle2, Receipt, ChevronLeft, ChevronRight } from 'lucide-react';
import axios from '@/src/api/axiosClient';
import { Payment } from '../../../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const AdminPayments = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // --- STATE QUẢN LÝ PHÂN TRANG ---
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPayments, setTotalPayments] = useState(0);
  const ITEMS_PER_PAGE = 10; // Số giao dịch trên 1 trang

  useEffect(() => {
    fetchPayments(currentPage);
  }, [currentPage]);

  // Reset về trang 1 nếu tìm kiếm thay đổi
  useEffect(() => {
    setCurrentPage(1);
    fetchPayments(1);
  }, [searchTerm]);

  const fetchPayments = async (page: number = currentPage) => {
    try {
      // 1. Gửi request kèm theo params phân trang (nếu Backend có hỗ trợ)
      const res = await axios.get('/api/payments', {
        params: {
          page: page,
          limit: ITEMS_PER_PAGE,
          search: searchTerm || undefined
        }
      });

      // 2. Kiểm tra nếu Backend trả về chuẩn dữ liệu Pagination
      if (res.data && res.data.data) {
        setPayments(res.data.data);
        setTotalPages(res.data.totalPages || 1);
        setTotalPayments(res.data.totalItems || res.data.data.length);
      } else {
        // FALLBACK: Backend chỉ trả về mảng nguyên gốc (Chưa hỗ trợ Server Pagination)
        const allPayments = Array.isArray(res.data) ? res.data.reverse() : [];

        // 2.1. Lọc tay nội bộ (Search)
        const filtered = allPayments.filter(p => {
          const orderIdStr = String(typeof p.orderId === 'string' ? p.orderId : p.orderId?._id || p.orderId?.id || '');
          const idStr = String(p.id || (p as any)._id || '');
          return orderIdStr.includes(searchTerm) || idStr.includes(searchTerm);
        });

        // 2.2. Tính toán tổng số trang
        const total = filtered.length;
        setTotalPayments(total);
        setTotalPages(Math.ceil(total / ITEMS_PER_PAGE) || 1);

        // 2.3. Cắt mảng (Slice) cho trang hiện tại
        const startIndex = (page - 1) * ITEMS_PER_PAGE;
        const slicedPayments = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);
        setPayments(slicedPayments);
      }
    } catch (err) {
      console.error("Failed to fetch payments:", err);
    }
  };

  const getOrderLabel = (payment: Payment) => {
    if (typeof payment.orderId === 'string') return payment.orderId;
    return payment.orderId?._id || payment.orderId?.id || '';
  };

  // Nút chuyển trang (Previous / Next)
  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Lịch sử thanh toán</h2>
          <p className="text-gray-500 font-medium mt-1">Quản lý các giao dịch và doanh thu</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm theo mã đơn hoặc mã giao dịch..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-gray-100 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-sm transition-all"
          />
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-gray-400 whitespace-nowrap">Mã giao dịch</th>
                <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-gray-400 whitespace-nowrap">Mã đơn hàng</th>
                <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-gray-400 whitespace-nowrap">Bàn / Thu ngân</th>
                <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-gray-400 whitespace-nowrap">Số tiền</th>
                <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-gray-400 whitespace-nowrap">Phương thức</th>
                <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-gray-400 whitespace-nowrap">Ngân hàng</th>
                <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-gray-400 whitespace-nowrap">Thời gian</th>
                <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-gray-400 whitespace-nowrap">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {payments.map((payment, i) => (
                  <motion.tr
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    key={payment.id || (payment as any)._id || i}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-all group"
                  >
                    <td className="px-8 py-6">
                      <span className="text-sm font-bold text-gray-900">#{String(payment.id || (payment as any)._id || '').toUpperCase().slice(-6)}</span>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-sm font-bold text-gray-400">#{String(getOrderLabel(payment) || '').toUpperCase().slice(-6)}</span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-gray-800">{payment.tableName || 'Chưa xác định'}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{payment.cashierName || 'Hệ thống'}</p>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-lg font-black text-amber-600">{payment.amount.toLocaleString()}đ</span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-50 text-blue-500 rounded-lg flex items-center justify-center shrink-0">
                          <CreditCard className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-bold text-gray-600 whitespace-nowrap">{payment.method}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="space-y-1 min-w-[200px]">
                        <p className="text-sm font-bold text-gray-700 truncate">
                          {payment.bankNameSnapshot || 'Tiền mặt / Không áp dụng'}
                        </p>
                        {payment.bankAccountId && (
                          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">
                            Có gắn tài khoản ngân hàng
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-gray-400 whitespace-nowrap">
                        <Clock className="w-4 h-4" />
                        <span className="text-xs font-bold">{new Date(payment.createdAt).toLocaleString('vi-VN')}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="inline-flex items-center justify-center px-4 py-2 bg-emerald-100 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-200 whitespace-nowrap">
                        Thành công
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>

          {/* Trạng thái trống (Empty State) */}
          {payments.length === 0 && (
            <div className="py-20 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <Receipt className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Không tìm thấy giao dịch nào</h3>
              <p className="text-sm text-gray-500">Hãy thử tìm kiếm với từ khóa khác.</p>
            </div>
          )}
        </div>
      </div>

      {/* --- PHẦN PHÂN TRANG (PAGINATION CONTROLS) --- */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between bg-white px-6 py-4 rounded-2xl border border-gray-100 shadow-sm gap-4">
          <p className="text-sm font-bold text-gray-500">
            Hiển thị trang <span className="text-gray-900">{currentPage}</span> / {totalPages} (Tổng: {totalPayments} giao dịch)
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-3 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Danh sách số trang */}
            <div className="flex gap-1 mx-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={cn(
                    "w-10 h-10 rounded-xl font-black text-sm transition-all",
                    currentPage === page
                      ? "bg-amber-500 text-white shadow-md shadow-amber-200"
                      : "bg-transparent text-gray-500 hover:bg-gray-100"
                  )}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-3 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};