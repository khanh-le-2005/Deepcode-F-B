import { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, Store, Bell, Shield, Globe, Save } from 'lucide-react';
import { Button } from '../../../components/Button';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const AdminSettings = () => {
  const [activeTab, setActiveTab] = useState('general');

  const tabs = [
    { id: 'general', label: 'Thông tin chung', icon: Store },
    { id: 'notifications', label: 'Thông báo', icon: Bell },
    { id: 'security', label: 'Bảo mật', icon: Shield },
    { id: 'system', label: 'Hệ thống', icon: Globe },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Cài đặt hệ thống</h2>
          <p className="text-gray-500 font-medium mt-1">Cấu hình thông tin nhà hàng và các tuỳ chọn hệ thống</p>
        </div>
        <Button variant="secondary" size="lg">
          <Save className="w-5 h-5" /> Lưu thay đổi
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:w-1/4 space-y-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-bold transition-all",
                activeTab === tab.id
                  ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20"
                  : "text-gray-500 hover:bg-white hover:text-gray-900"
              )}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-8">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <h3 className="text-xl font-black tracking-tight">Thông tin nhà hàng</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Tên nhà hàng</label>
                  <input type="text" defaultValue="QR DINE Restaurant" className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/20" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Số điện thoại</label>
                  <input type="text" defaultValue="0123 456 789" className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/20" />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Địa chỉ</label>
                  <input type="text" defaultValue="123 Đường ABC, Quận 1, TP. HCM" className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/20" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Giờ mở cửa</label>
                  <input type="text" defaultValue="08:00" className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/20" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Giờ đóng cửa</label>
                  <input type="text" defaultValue="22:00" className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/20" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h3 className="text-xl font-black tracking-tight">Cài đặt thông báo</h3>
              <div className="space-y-4">
                {[
                  { label: 'Thông báo đơn hàng mới', desc: 'Nhận thông báo khi có khách hàng đặt món mới' },
                  { label: 'Thông báo thanh toán', desc: 'Nhận thông báo khi khách hàng yêu cầu thanh toán' },
                  { label: 'Âm thanh thông báo', desc: 'Phát âm thanh khi có thông báo mới' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div>
                      <p className="font-bold text-gray-900">{item.label}</p>
                      <p className="text-xs text-gray-500">{item.desc}</p>
                    </div>
                    <div className="w-12 h-6 bg-amber-500 rounded-full relative cursor-pointer">
                      <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
