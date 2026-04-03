import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Search, Filter, Clock, CheckCircle2, MoreVertical } from 'lucide-react';
import axios from 'axios';
import { Payment } from '../../../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const AdminPayments = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = () => {
    axios.get('/api/payments')
      .then(res => setPayments(res.data.reverse()))
      .catch(err => console.error("Failed to fetch payments:", err));
  };

  const filteredPayments = payments.filter(p => {
    const orderIdStr = String(typeof p.orderId === 'string' ? p.orderId : p.orderId?._id || p.orderId?.id || '');
    const idStr = String(p.id || (p as any)._id || '');
    return orderIdStr.includes(searchTerm) || idStr.includes(searchTerm);
  });

  const getOrderLabel = (payment: Payment) => {
    if (typeof payment.orderId === 'string') return payment.orderId;
    return payment.orderId?._id || payment.orderId?.id || '';
  };

  return (
    <div className="space-y-8">
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
                <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-gray-400">Mã giao dịch</th>
                <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-gray-400">Mã đơn hàng</th>
                <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-gray-400">Bàn / Thu ngân</th>
                <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-gray-400">Số tiền</th>
                <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-gray-400">Phương thức</th>
                <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-gray-400">Ngân hàng</th>
                <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-gray-400">Thời gian</th>
                <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-gray-400">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filteredPayments.map((payment, i) => (
                  <motion.tr
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    key={payment.id}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-all group"
                  >
                    <td className="px-8 py-6">
                      <span className="text-sm font-bold text-gray-900">#{String(payment.id || (payment as any)._id || '').toUpperCase()}</span>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-sm font-bold text-gray-400">#{String(getOrderLabel(payment) || '').toUpperCase()}</span>
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
                        <div className="w-8 h-8 bg-blue-50 text-blue-500 rounded-lg flex items-center justify-center">
                          <CreditCard className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-bold text-gray-600">{payment.method}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="space-y-1 max-w-[260px]">
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
                      <div className="flex items-center gap-2 text-gray-400">
                        <Clock className="w-4 h-4" />
                        <span className="text-xs font-bold">{new Date(payment.createdAt).toLocaleString('vi-VN')}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="px-4 py-2 bg-emerald-100 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-200">
                        Thành công
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
