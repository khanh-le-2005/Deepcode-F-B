import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { Button } from '../../components/Button';
import { InvalidTable } from '../../components/InvalidTable';
import { useTableValidation } from '../../hooks/useTableValidation';

export const SuccessPage = () => {
  const { tableId } = useParams();
  const navigate = useNavigate();
  const { status } = useTableValidation(tableId);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#8b7d51]">
        <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (status === 'invalid') {
    return <InvalidTable tableId={tableId} />;
  }

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
        <h1 className="text-white text-3xl font-medium mb-1">Payment Success !</h1>
        <p className="text-white/80 text-sm">See you soon</p>
      </motion.div>

      {/* Receipt Container */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-md bg-white shadow-2xl relative"
      >
        <div className="p-8 pb-4">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">My Receipt</h2>
            <p className="text-gray-400 text-xs mt-1">2022/12/25 14:45</p>
          </div>

          {/* Items */}
          <div className="space-y-6 mb-6">
            <div className="flex items-start gap-4">
              <span className="bg-[#f2f1eb] text-gray-500 px-2 py-1 rounded text-sm font-bold mt-1">1</span>
              <div className="flex-1">
                <p className="font-bold text-gray-800 text-lg">Grilled Fingerlings</p>
                <p className="text-gray-400 text-sm">Lemon Tea with ice</p>
              </div>
              <p className="font-bold text-gray-800 text-lg">$999</p>
            </div>

            <div className="flex items-start gap-4">
              <span className="bg-[#f2f1eb] text-gray-500 px-2 py-1 rounded text-sm font-bold mt-1">2</span>
              <div className="flex-1">
                <p className="font-bold text-gray-800 text-lg">Roasted Acorn Squash</p>
                <p className="text-gray-400 text-sm">Remark : Less Salt</p>
              </div>
              <p className="font-bold text-gray-800 text-lg">$999</p>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t-2 border-dashed border-gray-200 my-4"></div>

          {/* Calculation */}
          <div className="space-y-2 mb-6 text-lg">
            <div className="flex justify-between font-bold text-gray-800">
              <span>Subtotal</span>
              <span>$3996</span>
            </div>
            <div className="flex justify-between font-bold text-gray-800">
              <span>Tips 10%</span>
              <span>$399</span>
            </div>
            <div className="flex justify-between font-bold text-[#ff6b6b]">
              <span>Coupon</span>
              <span>-$100</span>
            </div>
            <div className="flex justify-between font-black text-2xl pt-2 text-gray-900">
              <span>Total</span>
              <span>$4275</span>
            </div>
          </div>

          {/* Order Details Gray Box */}
          <div className="bg-[#f8f8f8] rounded-md p-4 space-y-2 text-sm text-gray-500">
            <div className="flex justify-between italic">
              <span>Table</span>
              <span className="font-medium text-gray-700">{tableId || '25'}</span>
            </div>
            <div className="flex justify-between italic">
              <span>Payment</span>
              <span className="font-medium text-gray-700">Credit Card</span>
            </div>
            <div className="flex justify-between italic">
              <span>Reward</span>
              <span className="font-medium text-gray-700">200 points</span>
            </div>
          </div>
        </div>

        {/* Jagged Bottom Edge */}
        <div className="absolute left-0 right-0 h-4 bg-white" style={{
          bottom: '-12px',
          clipPath: 'polygon(0% 0%, 5% 100%, 10% 0%, 15% 100%, 20% 0%, 25% 100%, 30% 0%, 35% 100%, 40% 0%, 45% 100%, 50% 0%, 55% 100%, 60% 0%, 65% 100%, 70% 0%, 75% 100%, 80% 0%, 85% 100%, 90% 0%, 95% 100%, 100% 0%)'
        }}></div>
      </motion.div>

      {/* Action Button (Giữ lại logic điều hướng) */}
      <div className="mt-16 w-full max-w-md">
        <Button 
          onClick={() => navigate(`/table/${tableId}/menu`)} 
          className="w-full bg-white/20 hover:bg-white/30 text-white border-white/40 border py-4 rounded-xl font-bold backdrop-blur-sm transition-all"
        >
          Quay lại Menu
        </Button>
      </div>
    </div>
  );
};