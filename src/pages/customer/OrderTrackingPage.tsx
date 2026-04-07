import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import axios from '@/src/lib/axiosClient';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, ChefHat, Download } from 'lucide-react';
import { toast } from 'react-toastify';
import { cn } from '../../lib/cn';
import { Order } from '../../types';
import { CustomerHeader } from '../../components/CustomerHeader';
import { InvalidTable } from '../../components/InvalidTable';
import { useTableValidation } from '../../hooks/useTableValidation';
import { PaymentSuccessModal } from '../../components/customer/PaymentSuccessModal';
import axiosLib from 'axios';

const socket = io();

export const OrderTrackingPage = () => {
  const { tableId, orderId } = useParams();
  const navigate = useNavigate();
  const { status, session: initialSession } = useTableValidation(tableId);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);
  const [paymentQr, setPaymentQr] = useState<{
    qrBase64: string;
    paymentContent: string;
    amount: number;
    orderId: string;
    gatewayWarning?: string;
  } | null>(null);
   const [paymentError, setPaymentError] = useState('');
   const [showSuccessModal, setShowSuccessModal] = useState(false);
  const paymentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (paymentQr && paymentRef.current) {
      paymentRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [paymentQr]);

  useEffect(() => {
    if (status !== 'valid') return;
    setLoading(true);

    const fetchData = async () => {
      try {
        if (orderId) {
          const res = await axios.get(`/api/orders/${orderId}/status`);
          setOrder(res.data);
        } else if (initialSession) {
          setOrder(initialSession);
        } else if (tableId) {
          const res = await axios.get(`/api/orders/table/${tableId}/active-session`);
          setOrder(res.data);
        }
      } catch (err) {
        if (axiosLib.isAxiosError(err) && err.response?.status === 404) {
          setOrder(null);
        } else {
          console.error("Failed to fetch order:", err);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // 1. Lắng nghe cập nhật từ bếp
    socket.on('order-updated', (updatedOrder: Order) => {
      setOrder(prev => {
        const currentId = prev?.id || (prev as any)?._id;
        const updatedId = updatedOrder.id || updatedOrder._id;
        if (currentId === updatedId) {
          return updatedOrder;
        }
        return prev;
      });
    });

    // 2. Lắng nghe thanh toán thành công
    socket.on('order-paid', (data: { orderId: string, paymentStatus: string }) => {
      setOrder(prev => {
        const currentId = prev?.id || (prev as any)?._id;
        if (currentId === data.orderId && data.paymentStatus === 'paid') {
          // toast.success("Thanh toán thành công! Cảm ơn bạn đã ghé thăm 🎉");
          setShowSuccessModal(true);
          return { ...prev, paymentStatus: 'paid', status: 'completed' } as Order;
        }
        return prev;
      });
      setPaymentQr(null);
    });

    return () => {
      socket.off('order-updated');
      socket.off('order-paid');
    };
  }, [tableId, orderId, status, initialSession]);

  // Backup polling for order status
  useEffect(() => {
    if (status !== 'valid' || !order) return;
    
    // Nếu đã thanh toán rồi thì không poll nữa
    if (order.paymentStatus === 'paid') return;

    const currentOrderId = order.id || (order as any)._id;
    if (!currentOrderId) return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await axios.get(`/api/orders/${currentOrderId}/status`);
        if (res.data && res.data.paymentStatus === 'paid') {
          setOrder(prev => ({ ...prev, ...res.data }));
          setShowSuccessModal(true);
          setPaymentQr(null);
          clearInterval(pollInterval);
        }
      } catch (err) {
        // Silent error for polling
      }
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [status, order?.id, (order as any)?._id, order?.paymentStatus]);

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center bg-[#fcf9f4]"><div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (status === 'invalid') {
    return <InvalidTable tableId={tableId} />;
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#fcf9f4]"><div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (!order) {
    return (
      <div className="bg-[#fcf9f4] min-h-screen flex flex-col items-center justify-center text-center px-6">
        <h2 className="text-3xl font-black italic mb-4 text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>Chưa có đơn hàng nào</h2>
        <p className="text-gray-500 mb-8 max-w-sm">
          {tableId
            ? `Hiện tại bàn ${tableId} đang chưa có đơn hàng nào được đặt hoặc đơn đã được thanh toán.`
            : `Không tìm thấy đơn hàng giao đi này.`
          }
        </p>
        <button onClick={() => navigate(tableId ? `/table/${tableId}/menu` : `/menu`)} className="bg-red-600 text-white px-8 py-4 rounded-4xl font-black uppercase tracking-widest transition-transform hover:scale-105 shadow-xl hover:shadow-red-600/30">
          Xem Menu & Đặt món
        </button>
      </div>
    );
  }

  const steps = [
    { id: 'pending', label: 'Chờ nhận đơn', icon: Clock, color: 'text-blue-500', bg: 'bg-blue-500' },
    { id: 'cooking', label: 'Đang nấu', icon: ChefHat, color: 'text-amber-500', bg: 'bg-amber-500' },
    { id: 'done', label: 'Xong món', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500' },
  ];

  // Tính overall status từ items
  let overallStatus = 'pending';
  if (order.items.every(i => i.status === 'served' || i.status === 'cancelled')) {
    overallStatus = 'done';
  } else if (order.items.some(i => i.status === 'cooking')) {
    overallStatus = 'cooking';
  }

  // Tính index step hiện tại
  const currentStepIndex = steps.findIndex(s => s.id === overallStatus);

  const handleRequestPayment = async () => {
    try {
      setIsGeneratingQr(true);
      setPaymentError('');
      setPaymentQr(null);
      const response = await axios.post(`/api/payments/generate-qr/${order.id || order._id}`);
      setPaymentQr({
        qrBase64: response.data?.qrBase64,
        paymentContent: response.data?.paymentContent,
        amount: response.data?.amount,
        orderId: response.data?.orderId,
        gatewayWarning: response.data?.gatewayWarning,
      });
    } catch (error) {
      const message = axiosLib.isAxiosError(error)
        ? error.response?.data?.message || error.response?.data?.error || error.message
        : 'Không thể tạo mã thanh toán lúc này. Vui lòng thử lại sau.';
      console.error('Failed to generate payment QR:', message, error);
      setPaymentError(message || 'Không thể tạo mã thanh toán lúc này. Vui lòng thử lại sau.');
    } finally {
      setIsGeneratingQr(false);
    }
  };

  const handleDownloadQR = () => {
    if (!paymentQr?.qrBase64) return;
    const link = document.createElement('a');
    const imgSrc = paymentQr.qrBase64.startsWith('data:')
      ? paymentQr.qrBase64
      : paymentQr.qrBase64.startsWith('http')
        ? paymentQr.qrBase64
        : `data:image/png;base64,${paymentQr.qrBase64}`;
    
    link.href = imgSrc;
    link.download = `qr-order-${order?.id || order?._id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-[#fcf9f4] min-h-screen text-[#1a1a1a]" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      <CustomerHeader
        tableId={tableId}
        showBackButton={true}
      />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <div className="bg-white rounded-4xl sm:rounded-[3rem] shadow-2xl p-6 sm:p-12 relative overflow-hidden border border-gray-100">
          {/* Header Thông tin */}
          <div className="text-center mb-16">
            <h1 className="text-3xl sm:text-5xl font-black italic text-red-600 mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
              Trạng thái đơn hàng
            </h1>
            <p className="text-gray-500 font-bold uppercase tracking-widest text-xs sm:text-sm">
              {tableId ? `Bàn ${tableId} • ` : 'Giao Hàng Tận Nơi • '} Mã đơn: <span className="text-gray-900">#{order.id?.slice(-6).toUpperCase() || order._id?.slice(-6).toUpperCase()}</span>
            </p>
          </div>

          {/* Thanh Tiến Trình (Timeline) */}
          <div className="relative flex justify-between items-center mb-20 px-4 sm:px-10">
            {/* Vạch kẻ xám tĩnh */}
            <div className="absolute left-[10%] right-[10%] top-1/2 -translate-y-1/2 h-1.5 bg-gray-100 z-0 rounded-full" />

            {/* Vạch kẻ đỏ động */}
            <div
              className="absolute left-[10%] top-1/2 -translate-y-1/2 h-1.5 bg-red-600 z-0 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${(Math.max(currentStepIndex, 0) / (steps.length - 1)) * 80}%` }}
            />

            {/* Các icon step */}
            {steps.map((step, idx) => {
              const active = currentStepIndex >= idx;
              const isCurrent = currentStepIndex === idx;
              const StepIcon = step.icon;
              return (
                <div key={step.id} className="relative z-10 flex flex-col items-center">
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: isCurrent ? 1.15 : 1, backgroundColor: active ? 'white' : '#f3f4f6' }}
                    className={cn(
                      "w-14 h-14 sm:w-20 sm:h-20 rounded-full flex items-center justify-center border-[6px] border-white shadow-xl transition-colors duration-500 text-red-600",
                      active ? step.bg : "text-gray-300"
                    )}
                  >
                    <StepIcon className="w-6 h-6 sm:w-8 sm:h-8" />
                  </motion.div>
                  <span className={cn(
                    "text-xs sm:text-sm font-black absolute -bottom-10 whitespace-nowrap transition-colors duration-500 uppercase tracking-widest",
                    active ? step.color : "text-gray-400"
                  )}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Danh sách món ăn */}
          <div className="bg-gray-50/50 rounded-3xl p-6 sm:p-8 space-y-6">
            <h3 className="font-black italic text-xl border-b border-gray-200 pb-4 text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>
              Chi tiết các món ({order.items.reduce((a, c) => a + c.quantity, 0)})
            </h3>
            <ul className="space-y-4">
              {order.items.map((item, i) => (
                <li key={i} className="flex justify-between items-center font-bold">
                  <span className="flex items-center gap-4 text-gray-700">
                    <span className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center text-sm font-black shadow-lg shadow-red-600/30 shrink-0">
                      x{item.quantity}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="truncate block text-gray-900">{item.name}</span>
                      <div className="flex flex-wrap gap-x-2 text-[10px] text-gray-500 italic mt-0.5">
                        {item.selectedOption && <span>• {item.selectedOption.name}</span>}
                        {item.selectedAddons?.map((a, idx) => (
                          <span key={idx}>• {a.name}</span>
                        ))}
                      </div>
                      <span className="text-[10px] text-gray-400 uppercase mt-1 block">
                        {item.status === 'in_cart' ? 'Trong giỏ' :
                          item.status === 'pending_approval' ? 'Chờ duyệt' :
                            item.status === 'cooking' ? 'Đang nấu' :
                              item.status === 'served' ? 'Đã phục vụ' : 'Đã hủy'}
                      </span>
                    </div>
                  </span>
                  <span className="text-gray-900 underline decoration-red-600 decoration-2 underline-offset-4">
                    {item.totalPrice.toLocaleString()}đ
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex justify-between items-center pt-6 border-t border-gray-200 text-2xl font-black italic shadow-[0_-15px_15px_-15px_rgba(0,0,0,0.05)]" style={{ fontFamily: "'Playfair Display', serif" }}>
              <span className="text-gray-400 uppercase tracking-widest text-sm not-italic font-bold">Tổng cộng</span>
              <span className="text-red-600">{order.total.toLocaleString()}đ</span>
            </div>
          </div>

          {overallStatus === 'done' && order.status === 'active' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-10 text-center"
            >
              <h3 className="text-2xl font-black text-emerald-500 italic drop-shadow-sm" style={{ fontFamily: "'Playfair Display', serif" }}>
                Món ăn đã sẵn sàng phục vụ!
              </h3>
              <p className="text-emerald-500/80 font-bold mt-2 text-sm uppercase tracking-widest">Chúc quý khách ngon miệng.</p>

              <button
                onClick={handleRequestPayment}
                disabled={isGeneratingQr}
                className="mt-6 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest transition-transform shadow-xl w-full sm:w-auto"
              >
                {isGeneratingQr ? 'Đang tạo mã...' : 'Thanh Toán Chuyển Trước'}
              </button>
              <p className="mt-3 text-sm text-gray-500 font-bold italic">Có thể trả sau khi ra quầy</p>
              {paymentError && (
                <p className="mt-4 text-sm font-bold text-rose-500">{paymentError}</p>
              )}
            </motion.div>
          )}


          {paymentQr && (
            <motion.div
              ref={paymentRef}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-10 bg-slate-950 text-white rounded-4xl p-6 sm:p-8 shadow-2xl"
            >
              <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* QR side */}
                <div className="flex flex-col items-center">
                  <div className="w-44 h-44 rounded-3xl bg-white p-3 flex items-center justify-center shrink-0 overflow-hidden">
                    {paymentQr.qrBase64 ? (
                      <img
                        src={
                          paymentQr.qrBase64.startsWith('data:')
                            ? paymentQr.qrBase64
                            : paymentQr.qrBase64.startsWith('http')
                              ? paymentQr.qrBase64
                              : `data:image/png;base64,${paymentQr.qrBase64}`
                        }
                        alt="Mã QR thanh toán"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="text-slate-500 text-sm font-black uppercase tracking-widest text-center">
                        Không có QR
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleDownloadQR}
                    className="mt-4 w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                  >
                    <Download className="w-3 h-3" />
                    Lưu mã QR
                  </button>
                </div>

                {/* Text side */}
                <div className="flex-1 text-left">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Thanh toán QR</p>
                  <h3 className="text-2xl sm:text-3xl font-black italic mt-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                    Quét mã để thanh toán
                  </h3>
                  <p className="text-sm text-slate-300 mt-3">
                    Số tiền: <span className="text-white font-black">{Number(paymentQr.amount || order.total).toLocaleString()}đ</span>
                  </p>
                  {paymentQr.orderId && (
                    <p className="text-xs text-slate-500 mt-2 break-all">
                      Mã phiên: {paymentQr.orderId}
                    </p>
                  )}
                  {paymentQr.paymentContent && (
                    <div className="mt-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Nội dung chuyển khoản</p>
                      <p className="text-sm font-bold text-white wrap-break-word">{paymentQr.paymentContent}</p>
                    </div>
                  )}
                  {paymentQr.gatewayWarning && (
                    <p className="text-xs text-amber-300 mt-3">
                      Đang dùng QR dự phòng vì cổng thanh toán tạm thời không phản hồi.
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </main>

      <PaymentSuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        order={order}
        tableId={tableId}
        onViewMenu={() => navigate(tableId ? `/table/${tableId}/menu` : '/menu')}
      />
    </div>
  );
};
