import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, ClipboardList } from 'lucide-react';
import axios from '@/src/lib/axiosClient';
import { Button } from '../../components/Button';
import { InvalidTable } from '../../components/InvalidTable';
import { useTableValidation } from '../../hooks/useTableValidation';

export const SuccessPage = () => {
  const { tableId } = useParams();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const navigate = useNavigate();
  const { status } = useTableValidation(tableId);
  const [order, setOrder] = useState<any>(null);
  const [isLoadingOrder, setIsLoadingOrder] = useState(true);

  useEffect(() => {
    if (orderId) {
      fetchOrderById(orderId);
    } else if (tableId) {
      fetchOrderData();
    } else {
      setIsLoadingOrder(false);
    }
  }, [tableId, orderId]);

  const fetchOrderById = async (id: string) => {
    try {
      const res = await axios.get(`/api/orders/${id}/status`);
      setOrder(res.data);
    } catch (err) {
      console.error('Failed to fetch specific order:', err);
    } finally {
      setIsLoadingOrder(false);
    }
  };

  const fetchOrderData = async () => {
    try {
      const res = await axios.get(`/api/orders/table/${tableId}/active-session`);
      setOrder(res.data);
    } catch (err) {
      console.error('Failed to fetch order for receipt:', err);
    } finally {
      setIsLoadingOrder(false);
    }
  };

  if (status === 'loading' || isLoadingOrder) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#8b7d51]">
        <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (status === 'invalid') {
    return <InvalidTable tableId={tableId} />;
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return new Date().toLocaleString();
    return new Date(dateStr).toLocaleString('vi-VN');
  };

  return (
    <div className="min-h-screen bg-[#8b7d51] flex flex-col items-center pt-12 pb-10 px-6 font-sans">
      {/* Icon & Status Section */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col items-center mb-8"
      >
        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-4 shadow-lg">
          <Check className="w-14 h-14 text-[#8b7d51] stroke-[3px]" />
        </div>
        <h1 className="text-white text-3xl font-medium mb-1">Thanh toán xong!</h1>
        <p className="text-white/80 text-sm">Hẹn gặp lại quý khách</p>
      </motion.div>

      {/* Receipt Container */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-md bg-white shadow-2xl relative rounded-t-lg"
      >
        <div className="p-8 pb-4">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-gray-800 uppercase tracking-widest">Hóa Đơn Của Bạn</h2>
            <p className="text-gray-400 text-xs mt-1">{formatDate(order?.completedAt || order?.createdAt)}</p>
          </div>

          {/* Items */}
          <div className="space-y-6 mb-6">
            {order?.items?.map((item: any, idx: number) => (
              <div key={idx} className="flex items-start gap-4">
                <span className="bg-[#f2f1eb] text-gray-500 min-w-[24px] h-6 flex items-center justify-center rounded text-xs font-bold mt-1">
                  {item.quantity}
                </span>
                <div className="flex-1">
                  <p className="font-bold text-gray-800 text-base">{item.name}</p>
                  {(item.selectedOption || item.selectedAddons?.length > 0) && (
                    <p className="text-gray-400 text-xs mt-0.5">
                      {[
                        item.selectedOption?.name,
                        ...(item.selectedAddons?.map((a: any) => a.name) || [])
                      ].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
                <p className="font-bold text-gray-800 text-base">
                  {(item.totalPrice || 0).toLocaleString()} <span className="text-[10px]">đ</span>
                </p>
              </div>
            ))}

            {!order?.items?.length && (
              <div className="flex flex-col items-center py-6 text-gray-300">
                <ClipboardList className="w-12 h-12 mb-2 opacity-20" />
                <p className="text-sm italic">Không có dữ liệu món ăn</p>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t-2 border-dashed border-gray-100 my-4"></div>

          {/* Calculation */}
          <div className="space-y-2 mb-6 text-lg">
            <div className="flex justify-between font-bold text-gray-800">
              <span className="text-sm text-gray-400">Tạm tính</span>
              <span className="text-base">{(order?.total || 0).toLocaleString()} đ</span>
            </div>
            
            <div className="flex justify-between font-black text-2xl pt-2 text-gray-900">
              <span>Tổng cộng</span>
              <span className="text-brand">{(order?.total || 0).toLocaleString()} đ</span>
            </div>
          </div>

          {/* Order Details Gray Box */}
          <div className="bg-[#f8f8f8] rounded-2xl p-5 space-y-3 text-sm text-gray-500 border border-gray-100">
            <div className="flex justify-between italic">
              <span>Số bàn</span>
              <span className="font-bold text-gray-700">{order?.tableName || tableId}</span>
            </div>
            <div className="flex justify-between italic">
              <span>Hình thức</span>
              <span className="font-bold text-gray-700">
                {order?.paymentMethod === 'transfer' ? 'Chuyển khoản' : 'Tiền mặt'}
              </span>
            </div>
            <div className="flex justify-between italic">
              <span>Trạng thái</span>
              <span className={(order?.paymentStatus === 'paid' || order?.status === 'completed' || order?.status === 'paid') ? 'text-emerald-500 font-bold' : 'text-amber-500 font-bold'}>
                {(order?.paymentStatus === 'paid' || order?.status === 'completed' || order?.status === 'paid') ? 'Đã thanh toán' : 'Chờ xác nhận'}
              </span>
            </div>
          </div>
        </div>

        {/* Jagged Bottom Edge */}
        <div className="absolute left-0 right-0 h-4 bg-white" style={{
          bottom: '-12px',
          clipPath: 'polygon(0% 0%, 5% 100%, 10% 0%, 15% 100%, 20% 0%, 25% 100%, 30% 0%, 35% 100%, 40% 0%, 45% 100%, 50% 0%, 55% 100%, 60% 0%, 65% 100%, 70% 0%, 75% 100%, 80% 0%, 85% 100%, 90% 0%, 95% 100%, 100% 0%)'
        }}></div>
      </motion.div>

      {/* Action Button */}
      <div className="mt-16 w-full max-w-md">
        <Button 
          onClick={() => tableId ? navigate(`/table/${tableId}/menu`) : navigate('/kiosk')} 
          className="w-full bg-white/20 hover:bg-white/30 text-white border-white/40 border py-5 rounded-2xl font-black uppercase tracking-widest backdrop-blur-sm transition-all shadow-xl active:scale-95"
        >
          Quay lại Trang Chủ
        </Button>
      </div>
    </div>
  );
};
