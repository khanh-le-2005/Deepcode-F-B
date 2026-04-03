import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UtensilsCrossed, ChevronRight, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/Button';
import { InvalidTable } from '../../components/InvalidTable';
import { useTableValidation } from '../../hooks/useTableValidation';

export const WelcomePage = () => {
  const { tableId } = useParams();
  const navigate = useNavigate();
  const { status, table } = useTableValidation(tableId);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (status === 'invalid') {
    return <InvalidTable tableId={tableId} />;
  }

  const tableLabel = table?.name || tableId;

  return (
    <div className="relative h-screen w-full overflow-hidden bg-slate-950">
      <img 
        src="https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80&w=2070" 
        className="absolute inset-0 w-full h-full object-cover opacity-40 scale-105"
        alt="Restaurant background"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/40 to-slate-950" />
      
      <div className="relative h-full flex flex-col items-center justify-center px-6 text-center">

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, type: "spring" }}
          className="max-w-sm w-full"
        >
          <div className="w-24 h-24 bg-amber-500 rounded-[2rem] flex items-center justify-center mb-8 mx-auto shadow-2xl shadow-amber-500/40 rotate-12">
            <UtensilsCrossed className="w-12 h-12 text-slate-900 -rotate-12" />
          </div>
          <h1 className="text-5xl font-black text-white mb-3 tracking-tighter">QR DINE</h1>
          <div className="inline-block px-4 py-1.5 bg-amber-500/20 border border-amber-500/30 rounded-full mb-10">
            <p className="text-amber-400 font-bold text-sm uppercase tracking-[0.2em]">
              Bàn {tableLabel || tableId}
            </p>
          </div>
          
          <Button 
            size="lg"
            variant="secondary"
            onClick={() => navigate(`/table/${tableId}/menu`)}
            className="w-full py-5 text-xl rounded-[1.5rem] bg-amber-500"
          >
            XEM THỰC ĐƠN <ChevronRight className="w-6 h-6" />
          </Button>
          
          <p className="mt-8 text-slate-400 text-sm font-medium">Quét mã, đặt món, thưởng thức!</p>
        </motion.div>
      </div>
    </div>
  );
};
