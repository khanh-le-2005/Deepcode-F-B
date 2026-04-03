import React, { useState } from 'react';
import { useCart } from '../../contexts/CartContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { CustomerHeader } from '../../components/CustomerHeader';

export const CheckoutPage = () => {
  const { cart, totalPrice, clearCart } = useCart();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    paymentMethod: 'cash'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      toast.error('Giỏ hàng của bạn đang trống!');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        orderType: 'delivery',
        customerInfo: {
          name: formData.name,
          phone: formData.phone,
          address: formData.address
        },
        paymentMethod: formData.paymentMethod,
        items: cart.map(item => ({
          menuItemId: item.menuItemId,
          name: item.name,
          basePrice: item.basePrice,
          quantity: item.quantity,
          category: item.category || 'Chưa phân loại',
          image: item.image?.replace('/api/images/', '')
        }))
      };

      const res = await axios.post('/api/orders', payload);
      const orderId = res.data._id || res.data.id;
      
      clearCart();
      toast.success('Đặt hàng thành công!');
      navigate(`/tracking/${orderId}`);
    } catch (err) {
      console.error('Checkout failed', err);
      toast.error('Lỗi khi thanh toán. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="bg-[#fcf9f4] min-h-screen flex flex-col items-center justify-center font-bold text-gray-500 text-lg">
        Giỏ hàng của bạn đang trống!
        <button onClick={() => navigate('/menu')} className="mt-4 bg-red-600 text-white px-6 py-3 rounded uppercase font-bold text-sm">Quay lại thực đơn</button>
      </div>
    );
  }

  return (
    <div className="bg-[#fcf9f4] min-h-screen text-[#1a1a1a]" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      <CustomerHeader showBackButton={true} />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-16">
        <h1 className="text-4xl sm:text-5xl font-black text-[#111] mb-8 italic" style={{ fontFamily: "'Playfair Display', serif" }}>
          Thanh Toán
        </h1>
        
        <form onSubmit={handleCheckout} className="bg-white rounded-4xl p-6 sm:p-10 shadow-xl border border-gray-100 space-y-8">
          <div>
            <h2 className="text-xl font-bold border-b-2 border-red-600 pb-2 mb-6 uppercase italic text-gray-800" style={{ fontFamily: "serif" }}>Thông tin giao hàng</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-500 mb-1">Họ và Tên</label>
                <input 
                  required
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 focus:outline-none focus:border-red-600 transition-colors" 
                  placeholder="Nhập họ và tên của bạn" 
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-500 mb-1">Số điện thoại</label>
                <input 
                  required
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 focus:outline-none focus:border-red-600 transition-colors" 
                  placeholder="0901234567" 
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-500 mb-1">Địa chỉ nhận hàng</label>
                <input 
                  required
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 focus:outline-none focus:border-red-600 transition-colors" 
                  placeholder="Số nhà, Tên đường, Quận/Huyện" 
                />
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold border-b-2 border-red-600 pb-2 mb-6 uppercase italic text-gray-800" style={{ fontFamily: "serif" }}>Phương thức thanh toán</h2>
            <select 
              name="paymentMethod"
              value={formData.paymentMethod}
              onChange={handleChange}
              className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 focus:outline-none focus:border-red-600 font-bold text-gray-700 cursor-pointer"
            >
              <option value="cash">Thanh toán khi nhận hàng (COD)</option>
              <option value="momo">Ví MoMo</option>
              <option value="vnpay">Chuyển khoản VNPay</option>
            </select>
          </div>

          <div className="bg-[#111] rounded-3xl p-6 sm:p-8 mt-8 text-white">
            <div className="flex justify-between items-center mb-6">
              <span className="font-bold text-gray-400 uppercase tracking-widest text-sm">Tổng thanh toán:</span>
              <span className="text-3xl font-black text-red-600" style={{ fontFamily: "'Playfair Display', serif" }}>{totalPrice.toLocaleString()}đ</span>
            </div>
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 text-white font-black py-4 rounded-xl hover:bg-red-700 transition-colors uppercase tracking-widest disabled:opacity-50 shadow-lg shadow-red-600/30"
            >
              {loading ? 'Đang xử lý...' : 'Xác Nhận Đặt Hàng'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};
