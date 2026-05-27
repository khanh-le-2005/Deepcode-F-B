import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, User, UtensilsCrossed } from 'lucide-react';
import { useAuth } from '../../AuthContext';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        navigate('/admin', { replace: true });
      } else if (user.role === 'chef') {
        navigate('/kitchen', { replace: true });
      } else {
        navigate('/pos', { replace: true });
      }
    }
  }, [user, navigate]);

  if (user) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const success = await login(email, password);
      if (!success) {
        setError('Email hoặc mật khẩu không chính xác.');
      }
    } catch (err) {
      setError('Đã xảy ra lỗi hệ thống.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-6 lg:p-8 font-sans bg-[#1a3a32] relative overflow-hidden selection:bg-teal-500/30">
      
      {/* Background Orbs (Làm mờ hơn trên mobile để không rối mắt) */}
      <div className="absolute top-0 left-0 w-48 h-48 md:w-64 md:h-64 bg-teal-500/10 rounded-full blur-[80px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-64 h-64 md:w-96 md:h-96 bg-emerald-500/10 rounded-full blur-[100px] translate-x-1/4 translate-y-1/4 pointer-events-none" />

      <main className="w-full max-w-5xl bg-[#244a3f] rounded-[32px] md:rounded-[40px] shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[500px] md:min-h-[600px] relative z-10 border border-white/5">

        {/* --- LEFT SIDE: ILLUSTRATION (Chỉ hiện trên Desktop/Tablet) --- */}
        <div className="flex-1 bg-white relative overflow-hidden hidden md:flex flex-col">
          {/* Đường cong tạo điểm nhấn */}
          <div className="absolute top-0 right-0 bottom-0 w-24 translate-x-12 rounded-l-[100px] bg-[#244a3f]" />

          <div className="relative z-10 p-10 lg:p-12 h-full flex flex-col">
            {/* Brand Logo */}
            <div className="flex items-center gap-3 mb-12">
              <div className="w-12 h-12 bg-[#244a3f] rounded-xl flex items-center justify-center shadow-lg shadow-[#244a3f]/20">
                <UtensilsCrossed className="text-white w-6 h-6" />
              </div>
              <div>
                <h1 className="text-[#244a3f] font-black text-xl leading-tight uppercase tracking-tight">
                  DineFlow <br /> <span className="text-teal-600">Management</span>
                </h1>
              </div>
            </div>

            {/* Illustration */}
            <div className="flex-1 flex flex-col items-center justify-center relative">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative w-full max-w-sm"
              >
                <img
                  src="https://i.pinimg.com/736x/d4/55/4c/d4554cf057e9c00c39147c3560bcb98f.jpg"
                  alt="Restaurant Illustration"
                  className="w-full h-auto drop-shadow-2xl rounded-[32px] object-cover"
                />
                {/* Decorative Elements */}
                <div className="absolute -top-4 -right-4 bg-orange-100 p-3.5 rounded-full animate-bounce shadow-sm text-xl">🍕</div>
                <div className="absolute bottom-8 -left-5 bg-teal-100 p-3.5 rounded-full shadow-sm text-xl">🍜</div>
              </motion.div>

              <div className="mt-10 text-center">
                <h3 className="text-[#244a3f] font-black text-xl mb-2">Hệ thống quản lý</h3>
                <p className="text-slate-500 text-sm max-w-[260px] mx-auto font-medium leading-relaxed">
                  Tối ưu hóa quy trình vận hành nhà hàng của bạn một cách chuyên nghiệp.
                </p>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 mt-auto uppercase tracking-widest font-bold">
              © 2026 DineFlow F&B System
            </p>
          </div>
        </div>

        {/* --- RIGHT SIDE: LOGIN FORM (Hiện full trên Mobile) --- */}
        <div className="flex-1 p-6 sm:p-10 md:p-12 lg:p-16 flex flex-col justify-center text-white relative">
          
          {/* Logo xuất hiện trên Mobile (Vì cột trái bị ẩn) */}
          <div className="md:hidden flex items-center justify-center gap-3 mb-10">
            <div className="w-10 h-10 bg-teal-500/20 rounded-xl flex items-center justify-center border border-teal-500/30">
              <UtensilsCrossed className="text-teal-400 w-5 h-5" />
            </div>
            <div>
              <h1 className="text-white font-black text-lg leading-tight uppercase tracking-tight">
                DineFlow <br /> <span className="text-teal-400 text-sm">Management</span>
              </h1>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="w-full max-w-sm mx-auto md:max-w-none"
          >
            <div className="text-center md:text-left mb-8 md:mb-10">
              <h2 className="text-3xl md:text-4xl font-black mb-2">Đăng nhập</h2>
              <p className="text-teal-100/60 text-sm font-medium">Vui lòng nhập thông tin quản trị viên</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
              
              {/* Input Email */}
              <div className="space-y-2">
                <label className="text-xs md:text-sm font-bold text-teal-100/70 ml-2 uppercase tracking-widest">Tài khoản</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-teal-200/40 group-focus-within:text-teal-400 transition-colors" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="admin@gmail.com"
                    className="w-full bg-[#1a332c] border border-white/5 rounded-2xl md:rounded-full py-4 pl-12 pr-6 text-white placeholder:text-teal-100/20 focus:bg-[#152b25] focus:border-teal-500/50 focus:ring-4 focus:ring-teal-500/10 transition-all outline-none font-medium text-sm md:text-base"
                  />
                </div>
              </div>

              {/* Input Password */}
              <div className="space-y-2">
                <label className="text-xs md:text-sm font-bold text-teal-100/70 ml-2 uppercase tracking-widest">Mật khẩu</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-teal-200/40 group-focus-within:text-teal-400 transition-colors" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full bg-[#1a332c] border border-white/5 rounded-2xl md:rounded-full py-4 pl-12 pr-6 text-white placeholder:text-teal-100/20 focus:bg-[#152b25] focus:border-teal-500/50 focus:ring-4 focus:ring-teal-500/10 transition-all outline-none font-medium text-sm md:text-base"
                  />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }} 
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-500/10 border border-red-500/20 p-3 md:p-4 rounded-xl md:rounded-2xl text-red-400 text-xs md:text-sm font-bold text-center"
                >
                  {error}
                </motion.div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-[#5fa89a] to-teal-500 hover:from-teal-400 hover:to-teal-400 text-[#1a3a32] font-black uppercase tracking-widest text-sm md:text-base py-4 md:py-5 rounded-2xl md:rounded-full transition-all shadow-xl shadow-teal-900/50 active:scale-[0.98] disabled:opacity-50 disabled:grayscale mt-4"
              >
                {isSubmitting ? 'ĐANG XỬ LÝ...' : 'ĐĂNG NHẬP'}
              </button>
            </form>

            {/* Footer Support Mobile */}
            <div className="mt-10 md:absolute md:bottom-8 md:right-8 text-[10px] md:text-xs text-teal-100/30 text-center md:text-right font-medium">
              Bạn gặp sự cố? Liên hệ bộ phận IT<br />
              <span className="text-teal-100/50 font-bold hover:text-teal-400 cursor-pointer transition-colors">support@deepcode.com</span>
            </div>

          </motion.div>
        </div>
      </main>
    </div>
  );
};