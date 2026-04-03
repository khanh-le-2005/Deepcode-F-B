import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '../../components/Button';
import { InvalidTable } from '../../components/InvalidTable';
import { useTableValidation } from '../../hooks/useTableValidation';

export const SuccessPage = () => {
  const { tableId } = useParams();
  const navigate = useNavigate();
  const { status } = useTableValidation(tableId);

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center bg-[#fcf9f4]"><div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (status === 'invalid') {
    return <InvalidTable tableId={tableId} />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", damping: 15 }}
      >
        <div className="w-24 h-24 bg-emerald-500/15 text-emerald-700 rounded-full flex items-center justify-center mb-8 mx-auto border border-emerald-500/20">
          <CheckCircle2 className="w-12 h-12" />
        </div>
        <h1 className="text-3xl font-black text-[color:var(--color-text)] mb-3">Đặt món thành công!</h1>
        <p className="text-[color:var(--color-muted)] mb-8 max-w-xs mx-auto font-medium">
          Cảm ơn bạn đã đặt món tại bàn {tableId}. Nhà bếp đang chuẩn bị món cho bạn.
        </p>
        <Button onClick={() => navigate(`/table/${tableId}/menu`)} size="lg">
          Quay lại Menu
        </Button>
      </motion.div>
    </div>
  );
};
