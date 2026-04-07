import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ArrowRight, ShoppingBag } from 'lucide-react';
import { Button } from '../Button';
import { Order } from '../../types';

interface PaymentSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  tableId?: string;
  onViewMenu: () => void;
}

export const PaymentSuccessModal = ({
  isOpen,
  onClose,
  order,
  tableId,
  onViewMenu
}: PaymentSuccessModalProps) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] overflow-hidden border border-slate-100"
          >
            {/* Success Decoration */}
            <div className="absolute top-0 left-0 w-full h-32 bg-linear-to-b from-emerald-50 to-transparent" />
            
            <div className="relative p-8 sm:p-12 flex flex-col items-center text-center">
              {/* Animated Checkmark */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 260, 
                  damping: 20, 
                  delay: 0.2 
                }}
                className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/40 mb-8"
              >
                <CheckCircle2 className="w-12 h-12 text-white" />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-2 italic" style={{ fontFamily: "'Playfair Display', serif" }}>
                  Thanh toán thành công!
                </h2>
                <p className="text-slate-500 font-medium mb-8">
                  Cảm ơn quý khách đã tin tưởng và sử dụng dịch vụ của chúng tôi.
                </p>
              </motion.div>

              {/* Order Info Card */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="w-full bg-slate-50 rounded-3xl p-6 mb-10 border border-slate-100"
              >
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-200/60">
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Mã đơn hàng</span>
                  <span className="text-slate-900 font-black">#{order?.id?.slice(-6).toUpperCase() || order?._id?.slice(-6).toUpperCase()}</span>
                </div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Bàn / Vị trí</span>
                  <span className="text-slate-900 font-black">{tableId ? `Bàn ${tableId}` : 'Giao hàng'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Tổng thanh toán</span>
                  <span className="text-emerald-600 text-xl font-black italic" style={{ fontFamily: "'Playfair Display', serif" }}>
                    {order?.total?.toLocaleString()}đ
                  </span>
                </div>
              </motion.div>

              {/* Actions */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4"
              >
                <Button 
                  onClick={onViewMenu}
                  variant="outline"
                  className="rounded-2xl py-4 border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  Tiếp tục mua sắm
                </Button>
                <Button 
                  onClick={onClose}
                  className="rounded-2xl py-4 bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20"
                >
                   Đóng
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </motion.div>
            </div>

            {/* Confetti-like decoration (CSS only) */}
            <div className="absolute top-0 right-0 p-8 pointer-events-none opacity-20">
               <svg width="100" height="100" viewBox="0 0 100 100">
                  <motion.circle 
                    animate={{ y: [0, 10, 0], opacity: [0.2, 0.5, 0.2] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    cx="20" cy="20" r="5" fill="#10b981" />
                  <motion.rect 
                     animate={{ rotate: 360 }}
                     transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                     x="70" y="30" width="8" height="8" rx="2" fill="#34d399" />
                  <motion.path 
                     animate={{ scale: [1, 1.2, 1] }}
                     transition={{ duration: 4, repeat: Infinity }}
                     d="M10,80 L20,70 L30,80" stroke="#10b981" strokeWidth="3" fill="none" />
               </svg>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
