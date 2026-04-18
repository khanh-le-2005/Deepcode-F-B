import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import axios from '@/src/lib/axiosClient';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, ChefHat, Download, CreditCard } from 'lucide-react';
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
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { status, session: initialSession } = useTableValidation(tableId);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);
  const [paymentQr, setPaymentQr] = useState<{
    qrBase64?: string;
    qrCode?: string;
    checkoutUrl?: string;
    paymentContent: string;
    amount: number;
    orderId: string;
    gatewayWarning?: string;
  } | null>(null);
   const [paymentError, setPaymentError] = useState('');
   const [showSuccessModal, setShowSuccessModal] = useState(false);
   const [isRequestingCash, setIsRequestingCash] = useState(false);
   const [cashRequestSent, setCashRequestSent] = useState(false);
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
          // Hỗ trợ cả 2 trạng thái 'paid' (từ quầy) và 'completed' (từ bank)
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

  // 3. Xử lý Query Params từ PayOS (Redirect quay về)
  useEffect(() => {
    const code = searchParams.get('code');
    const cancel = searchParams.get('cancel');
    const statusParam = searchParams.get('status');

    if (code === '00' && statusParam === 'PAID') {
      setShowSuccessModal(true);
      // AUTO-SYNC (Đối soát) khi quay lại từ PayOS
      if (order?.orderCode) {
        axios.get(`/api/payments/verify/${order.orderCode}`)
          .then(() => console.log("Payment synced successfully"))
          .catch(err => console.error("Sync failed:", err));
      }
      // Xóa params để tránh hiện modal lặp lại khi refresh
      navigate(window.location.pathname, { replace: true });
    } else if (cancel === 'true') {
      toast.info("Giao dịch đã được hủy.");
      navigate(window.location.pathname, { replace: true });
    }
  }, [searchParams, navigate]);

  // Backup polling for order status
  useEffect(() => {
    if (status !== 'valid' || !order) return;
    
    // Nếu đã thanh toán rồi thì không poll nữa
    const isPaid = order.paymentStatus === 'paid' || order.status === 'completed' || order.status === 'paid';
    if (isPaid) return;

    const currentOrderId = order.id || (order as any)._id;
    if (!currentOrderId) return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await axios.get(`/api/orders/${currentOrderId}/status`);
        const isActuallyPaid = res.data && (res.data.paymentStatus === 'paid' || res.data.status === 'completed' || res.data.status === 'paid');
        if (isActuallyPaid) {
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
    { id: 'cooking', label: 'Đang làm', icon: ChefHat, color: 'text-amber-500', bg: 'bg-amber-500' },
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
  
  // KIỂM TRA THANH TOÁN THÔNG MINH (Tất cả món active đều đã trả tiền)
  const activeItems = order.items.filter(i => i.status !== 'cancelled');
  const allPaid = activeItems.length > 0 && activeItems.every(i => i.isPaid);
  const isPaid = order.paymentStatus === 'paid' || order.status === 'completed' || order.status === 'paid' || allPaid;

  const handleRequestPayment = async () => {
    try {
      setIsGeneratingQr(true);
      setPaymentError('');
      setPaymentQr(null);
      const response = await axios.post(`/api/payments/generate-qr/${order.id || order._id}`);
      const data = response.data;
      if (data?.checkoutUrl) {
        // Chuyển hướng ngay lập tức sang trang thanh toán của PayOS
        window.location.href = data.checkoutUrl;
        return;
      }

      setPaymentQr({
        qrCode: data?.qrCode,
        checkoutUrl: data?.checkoutUrl,
        paymentContent: data?.paymentContent,
        amount: data?.amount,
        orderId: data?.orderId,
        gatewayWarning: data?.gatewayWarning,
      });
    } catch (error) {
      let message = 'Không thể tạo mã thanh toán lúc này. Vui lòng thử lại sau.';
      
      if (axiosLib.isAxiosError(error)) {
        // Trích xuất message từ cấu trúc { success: false, error: { message, code } } của backend
        const backendError = error.response?.data?.error;
        message = typeof backendError === 'object' ? backendError.message : (error.response?.data?.message || error.message);
      }
      
      console.error('Failed to generate payment QR:', message, error);
      setPaymentError(message);
    } finally {
      setIsGeneratingQr(false);
    }
  };

  const handleRequestCashPayment = async () => {
    try {
      setIsRequestingCash(true);
      
      // Gửi tín hiệu trực tiếp qua Socket.io để nhân viên nhận được ngay
      socket.emit('payment-requested', {
        tableId: tableId,
        tableName: order?.tableName || tableId,
        orderId: order?.id || order?._id,
        total: order?.total
      });

      // Giả lập delay một chút cho trải nghiệm người dùng
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setCashRequestSent(true);
      toast.success('Đã gửi yêu cầu thanh toán tiền mặt. Nhân viên sẽ sớm đến kiểm tra!');
    } catch (err) {
      toast.error('Không thể gửi yêu cầu lúc này.');
    } finally {
      setIsRequestingCash(false);
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
                    animate={{ scale: isCurrent ? 1.15 : 1, backgroundColor: active ? '#ffffff' : '#f3f4f6' }}
                    className={cn(
                      "w-14 h-14 sm:w-20 sm:h-20 rounded-full flex items-center justify-center border-[6px] border-white shadow-xl transition-all duration-500 text-red-600",
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
              {(() => {
                const groupedTrackingItems = (order.items || []).filter(i => i.status !== 'cancelled').reduce((acc: any[], item) => {
                  const addonKey = (item.selectedAddons || []).map((a: any) => a.name).sort().join(',');
                  const optionKey = item.selectedOption?.name || '';
                  // Phân tách riêng trạng thái thanh toán VÀ trạng thái nấu bếp
                  const key = `${item.name}-${optionKey}-${addonKey}-${item.isPaid}-${item.status}`;
                  const existing = acc.find(i => i.groupKey === key);
                  if (existing) {
                    existing.quantity += (item.quantity || 1);
                    existing.totalPrice += (item.totalPrice ?? item.basePrice ?? item.price ?? 0);
                  } else {
                    acc.push({ 
                      ...item, 
                      groupKey: key, 
                      quantity: item.quantity || 1, 
                      totalPrice: item.totalPrice ?? item.basePrice ?? item.price ?? 0 
                    });
                  }
                  return acc;
                }, []);

                return groupedTrackingItems.map((item, i) => (
                  <li key={i} className="flex justify-between items-center font-bold">
                    <span className="flex items-center gap-4 text-gray-700">
                      <span className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center text-sm font-black shadow-lg shadow-red-600/30 shrink-0">
                        x{item.quantity}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate block text-gray-900">{item.name}</span>
                          {item.isPaid && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[7px] font-black uppercase border border-emerald-100 italic">
                              <CheckCircle2 className="w-2.5 h-2.5" /> Đã trả
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-2 text-[10px] text-gray-500 italic mt-0.5">
                          {item.selectedOption && <span>• {item.selectedOption.name}</span>}
                          {item.selectedAddons?.map((a: any, idx: number) => (
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
                      {(item.totalPrice ?? 0).toLocaleString()}đ
                    </span>
                  </li>
                ));
              })()}
            </ul>
            <div className="space-y-2 pt-6 border-t border-gray-200">
              <div className="flex justify-between items-center text-sm font-bold">
                <span className="text-gray-400 uppercase tracking-widest">Tổng hóa đơn</span>
                <span className="text-gray-900">{(order.total ?? 0).toLocaleString()}đ</span>
              </div>
              {order.items.some(i => i.isPaid) && (
                <div className="flex justify-between items-center text-sm font-bold text-emerald-600">
                  <span className="uppercase tracking-widest pl-4 border-l-2 border-emerald-200">Đã thanh toán</span>
                  <span>-{order.items.filter(i => i.isPaid).reduce((sum, i) => sum + (i.totalPrice || 0), 0).toLocaleString()}đ</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 text-2xl font-black italic shadow-[0_-15px_15px_-15px_rgba(0,0,0,0.05)]" style={{ fontFamily: "'Playfair Display', serif" }}>
                <span className="text-gray-400 uppercase tracking-widest text-sm not-italic font-bold">Cần trả thêm</span>
                <span className="text-red-600">{order.items.filter(i => !i.isPaid && i.status !== 'cancelled').reduce((sum, i) => sum + (i.totalPrice || 0), 0).toLocaleString()}đ</span>
              </div>
            </div>
          </div>

          {(overallStatus === 'done' || order.status === 'completed' || order.status === 'paid') && order.status !== 'cancelled' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-10 text-center"
            >
              <h3 className="text-2xl font-black text-emerald-500 italic drop-shadow-sm" style={{ fontFamily: "'Playfair Display', serif" }}>
                Món ăn đã sẵn sàng phục vụ!
              </h3>
              <p className="text-emerald-500/80 font-bold mt-2 text-sm uppercase tracking-widest">Chúc quý khách ngon miệng.</p>

              {!isPaid && (
                <button
                  onClick={handleRequestPayment}
                  disabled={isGeneratingQr || cashRequestSent}
                  className="mt-6 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest transition-transform shadow-xl w-full sm:w-auto"
                >
                  {isGeneratingQr ? 'Đang tạo mã...' : 'Thanh Toán Chuyển Trước'}
                </button>
              )}
                
              <div className="mt-6">
                {isPaid ? (
                  <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl flex flex-col items-center justify-center gap-3">
                    <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30">
                      <CheckCircle2 className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-emerald-700 font-black uppercase tracking-widest text-sm">Đơn hàng đã được thanh toán</span>
                  </div>
                ) : cashRequestSent ? (
                  <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-center justify-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <span className="text-emerald-700 font-bold text-sm">Đã gửi yêu cầu tính tiền mặt</span>
                  </div>
                ) : (
                  <button
                    onClick={handleRequestCashPayment}
                    disabled={isRequestingCash}
                    className="w-full sm:w-auto px-8 py-4 bg-white border-2 border-slate-200 text-slate-600 rounded-xl font-black uppercase tracking-widest hover:border-slate-300 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                  >
                    {isRequestingCash ? (
                       <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <CreditCard className="w-4 h-4" />
                    )}
                    Trả tiền mặt tại quầy
                  </button>
                )}
              </div>

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
                    {(paymentQr.qrCode || paymentQr.qrBase64) ? (
                      <img
                        src={
                          paymentQr.qrCode 
                            ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(paymentQr.qrCode)}`
                            : (paymentQr.qrBase64?.startsWith('data:')
                                ? paymentQr.qrBase64
                                : paymentQr.qrBase64?.startsWith('http')
                                  ? paymentQr.qrBase64
                                  : `data:image/png;base64,${paymentQr.qrBase64}`)
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
                  
                  {paymentQr.checkoutUrl && (
                     <a
                       href={paymentQr.checkoutUrl}
                       target="_blank"
                       rel="noopener noreferrer"
                       className="mt-4 w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-red-600/20 active:scale-95"
                     >
                       <CreditCard className="w-4 h-4" />
                       Mở trang thanh toán
                     </a>
                  )}

                  <button
                    onClick={handleDownloadQR}
                    className="mt-2 w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    <Download className="w-3 h-3" />
                    Lưu mã QR
                  </button>
                </div>

                {/* Text side */}
                <div className="flex-1 text-left">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Thanh toán PayOS</p>
                  <h3 className="text-2xl sm:text-3xl font-black italic mt-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                    Quét mã hoặc mở link
                  </h3>
                  <p className="text-sm text-slate-300 mt-3">
                    Số tiền: <span className="text-white font-black">{Number(paymentQr.amount || order.total).toLocaleString()}đ</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-2 break-all">
                    Đơn hàng: #{order.orderCode || (order.id || order._id)?.slice(-6).toUpperCase()}
                  </p>
                  
                  {paymentQr.paymentContent && (
                    <div className="mt-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Nội dung chuyển khoản</p>
                      <p className="text-sm font-bold text-white wrap-break-word">{paymentQr.paymentContent}</p>
                    </div>
                  )}
                  {paymentQr.gatewayWarning && (
                    <p className="text-xs text-amber-300 mt-3">
                      {paymentQr.gatewayWarning}
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
        amount={paymentQr?.amount}
        tableId={tableId}
        onViewMenu={() => navigate(tableId ? `/table/${tableId}/menu` : '/menu')}
      />
    </div>
  );
};
