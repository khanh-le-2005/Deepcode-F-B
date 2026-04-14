import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'react-toastify';
import { useAuth } from '../AuthContext';
import axios from '../lib/axiosClient';

import { Notification } from '../types';

interface SocketContextType {
  socket: Socket | null;
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

// URL của server. Trong thực tế có thể lấy từ .env
const SOCKET_URL = window.location.origin.includes('localhost') 
  ? 'http://localhost:3000' 
  : window.location.origin;

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const socketRef = React.useRef<Socket | null>(null);

  // Khởi tạo socket 1 lần duy nhất
  useEffect(() => {
    if (!socketRef.current) {
      const newSocket = io(SOCKET_URL, {
        withCredentials: true,
        transports: ['websocket', 'polling']
      });

      // newSocket.on('connect', () => {
      //   console.log('✅ Socket connected:', newSocket.id);
      // });

      // newSocket.on('connect_error', (error) => {
      //   console.error('❌ Socket connection error:', error);
      // });

      socketRef.current = newSocket;
      setSocket(newSocket);
    }

    return () => {
      // Trong React 18 Strict Mode, effect này có thể chạy 2 lần.
      // Chúng ta giữ socketRef để không ngắt kết nối nếu chỉ là unmount tạm thời của Strict Mode.
      // Nếu component thực sự bị hủy lâu dài, socket sẽ tự đóng khi ứng dụng kết thúc.
    };
  }, []);

  // Khi user thay đổi (login/logout), thiết lập lại room và xóa dữ liệu cũ
  useEffect(() => {
    if (!socket) return;

    if (user) {
      // 1. Join room theo role như backend yêu cầu (role_staff hoặc role_kitchen)
      if (user.role === 'admin' || user.role === 'staff') {
        socket.emit('join-room', 'role_staff');
      } else if (user.role === 'chef') {
        socket.emit('join-room', 'role_kitchen');
        socket.emit('join-room', 'role_staff'); // Tham gia cả staff để nghe tín hiệu bàn chốt đơn
      }

      // 2. Tải danh sách thông báo ban đầu
      fetchNotifications();

      // 3. Lắng nghe thông báo mới real-time (khớp với emit từ backend)
      const handleStaffNotification = (notif: any) => {
        console.log('🔔 Staff notification received:', notif);
        handleNewNotification(notif);
      };
      const handleKitchenNotification = (notif: any) => {
        console.log('🔔 Kitchen notification received:', notif);
        handleNewNotification(notif);
      };

      socket.on('notification:staff', handleStaffNotification);
      socket.on('notification:kitchen', handleKitchenNotification);
      socket.on('order-updated', (data) => console.log('📦 Order updated:', data));
      socket.on('order-paid', (data) => console.log('💰 Order paid:', data));

      return () => {
        socket.off('notification:staff', handleStaffNotification);
        socket.off('notification:kitchen', handleKitchenNotification);
        socket.off('order-updated');
        socket.off('order-paid');
      };
    } else {
      console.log('🚪 User logged out, cleaning up socket...');
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user, socket]);

  const fetchNotifications = async () => {
    try {
      const response = await axios.get('/api/notifications');
      if (response.data.success) {
        setNotifications(response.data.data);
        setUnreadCount(response.data.unreadCount);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const handleNewNotification = (notif: Notification) => {
    // Lấy thông tin order từ backend (vừa được thêm vào payload) để tự build câu message
    // Thay vì để backend format câu "Bàn x vừa đặt món..."
    // @ts-ignore
    if (notif.orderItems && notif.orderItems.length > 0) {
      // @ts-ignore
      const items = notif.orderItems as any[];
      let itemsText = items.map(i => `${i.quantity}x ${i.name}`).join(', ');
      if (itemsText.length > 80) itemsText = itemsText.substring(0, 77) + '...';
      // @ts-ignore
      notif.message = `Bàn ${notif.tableName || 'mang đi'} vừa gọi: ${itemsText}`;
    }

    // 1. Hiện Toast (Giờ hiển thị cả nội dung cho rõ ràng)
    toast.info(
      <div>
        <p style={{ fontWeight: 'bold', marginBottom: '4px' }}>{notif.title}</p>
        <p style={{ fontSize: '13px', lineHeight: '1.4' }}>{notif.message}</p>
      </div>, 
      {
        position: 'top-right',
        autoClose: 5000,
      }
    );

    // 2. Phát âm thanh (Tài liệu v3.1 mục 13)
    const audio = new Audio('/souldeffect/yippeeeeeeeeeeeeee.mp3');
    audio.play().catch(e => console.warn('Audio play blocked by browser:', e));

    // 3. Cập nhật state
    setNotifications(prev => [notif, ...prev]);
    setUnreadCount(prev => prev + 1);
  };

  const markAsRead = async (id: string) => {
    try {
      await axios.put(`/api/notifications/${id}/read`);
      setNotifications(prev => 
        prev.map(n => (n.id === id || n._id === id) ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllRead = async () => {
    try {
      await axios.put('/api/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success('Đã đánh dấu đọc tất cả thông báo');
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  return (
    <SocketContext.Provider value={{ socket, notifications, unreadCount, markAsRead, markAllRead }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
