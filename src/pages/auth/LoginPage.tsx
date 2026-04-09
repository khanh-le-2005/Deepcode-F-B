import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, User, UtensilsCrossed } from 'lucide-react';
import { useAuth } from '../../AuthContext';
import { Button } from '../../components/Button';

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
    <div className="min-h-screen flex items-center justify-center p-4 font-sans selection:bg-teal-500/30">
      {/* Background Orbs */}
      <div className="absolute top-10 left-10 w-32 h-32 bg-white/5 rounded-full blur-3xl" />
      <div className="absolute bottom-10 right-10 w-64 h-64 bg-teal-900/20 rounded-full blur-3xl" />

      <main className="w-full max-w-5xl bg-[#244a3f] rounded-[40px] shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px] relative">

        {/* Left Side: Illustration Area (White Background with Curve) */}
        <div className="flex-1 bg-white relative overflow-hidden hidden md:block">
          {/* The White Curve Shape */}
          <div className="absolute top-0 right-0 bottom-0 w-24  translate-x-12 rounded-l-[100px]" />

          <div className="relative z-10 p-12 h-full flex flex-col">
            {/* Brand Logo */}
            <div className="flex items-center gap-3 mb-12">
              <div className="w-12 h-12 bg-[#244a3f] rounded-xl flex items-center justify-center">
                <UtensilsCrossed className="text-white w-7 h-7" />
              </div>
              <div>
                <h1 className="text-[#244a3f] font-black text-xl leading-tight uppercase tracking-tight">
                  DineFlow <br /> <span className="text-teal-600">Management</span>
                </h1>
              </div>
            </div>

            {/* F&B Illustration Placeholder */}
            <div className="flex-1 flex flex-col items-center justify-center relative">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative w-full max-w-sm"
              >
                {/* Thay thế hình ảnh cây bằng một minh họa đồ ăn/nhà hàng trừu tượng */}
                <img
                  src="https://i.pinimg.com/736x/d4/55/4c/d4554cf057e9c00c39147c3560bcb98f.jpg"
                  alt="avatar"
                  className="w-full h-auto drop-shadow-2xl"
                />

                {/* Decorative Elements */}
                <div className="absolute -top-4 -right-4 bg-orange-100 p-3 rounded-full animate-bounce">🍕</div>
                <div className="absolute bottom-10 -left-4 bg-teal-100 p-3 rounded-full">🍜</div>
              </motion.div>

              <div className="mt-8 text-center">
                <h3 className="text-[#244a3f] font-bold text-lg">Chào mừng quay trở lại!</h3>
                <p className="text-slate-500 text-sm max-w-[250px] mx-auto mt-2">
                  Quản lý đơn hàng và vận hành nhà hàng chuyên nghiệp hơn.
                </p>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 mt-auto uppercase tracking-widest">
              © 2026 DineFlow F&B System • Powered by TechKitchen
            </p>
          </div>
        </div>

        {/* Right Side: Login Form Area */}
        <div className="flex-1 p-8 md:p-16 flex flex-col justify-center text-white">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-4xl font-semibold mb-8">Đăng nhập</h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-teal-100/70 ml-1">Tên đăng nhập / Email</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-teal-200/50" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="Enter your username"
                    className="w-full bg-[#1a332c] border-none rounded-full py-4 pl-12 pr-6 text-white placeholder:text-teal-100/20 focus:ring-2 focus:ring-teal-400/50 transition-all outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-teal-100/70 ml-1">Mật khẩu</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-teal-200/50" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter your password"
                    className="w-full bg-[#1a332c] border-none rounded-full py-4 pl-12 pr-6 text-white placeholder:text-teal-100/20 focus:ring-2 focus:ring-teal-400/50 transition-all outline-none"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-2xl text-red-300 text-xs text-center">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#5fa89a] hover:bg-[#6fb9ab] text-[#1a3a32] font-bold py-4 rounded-full transition-all shadow-lg active:scale-[0.98] disabled:opacity-50"
              >
                {isSubmitting ? 'ĐANG XỬ LÝ...' : 'ĐĂNG NHẬP HỆ THỐNG'}
              </button>
            </form>

            {/* Trial Account Box (Small & Clean) */}
            <div className="mt-12 p-4 bg-black/10 rounded-3xl border border-white/5 inline-block mx-auto w-full">
              <p className="text-[10px] font-bold text-teal-400 uppercase tracking-widest mb-2">Tài khoản dùng thử</p>
              <div className="grid grid-cols-2 gap-2">
                <p className="text-[11px] text-teal-100/60">Admin: admin@gmail.com / 123456</p>
                <p className="text-[11px] text-teal-100/60">Staff: staff@gmail.com / 123456</p>
              </div>
            </div>
          </motion.div>

          <div className="absolute bottom-8 right-8 text-[10px] text-teal-100/30 text-right">
            Bạn gặp sự cố? Liên hệ bộ phận IT<br />
            <span className="text-teal-100/50">support@dineflow.com</span>
          </div>
        </div>
      </main>
    </div>
  );
};