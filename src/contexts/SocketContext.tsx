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

  // Khởi tạo socket 1 lần duy nhất
  useEffect(() => {
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

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Khi user thay đổi (login/logout), thiết lập lại room và xóa dữ liệu cũ
  useEffect(() => {
    if (!socket) return;

    if (user) {
      // 1. Join admin_hub room theo role như tài liệu v3.1 yêu cầu
      console.log(`Setting up socket for user: ${user.email} with role: ${user.role}`);
      socket.emit('setup_user', user.role);

      // 2. Tải danh sách thông báo ban đầu từ REST API
      fetchNotifications();

      // 3. Lắng nghe thông báo mới real-time
      socket.on('new_notification', (notif: Notification) => {
        console.log('🔔 New notification received:', notif);
        handleNewNotification(notif);
      });

      // 4. Lắng nghe các sự kiện update khác
      socket.on('order-paid', (data) => {
        console.log('Order paid event received:', data);
        // Có thể emit event cục bộ hoặc refresh data tại đây
      });
    } else {
      // Nếu logout
      console.log('Logging out socket user, cleaning up listeners...');
      setNotifications([]);
      setUnreadCount(0);
      socket.off('new_notification');
      socket.off('order-paid');
    }

    return () => {
      socket.off('new_notification');
      socket.off('order-paid');
    };
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
    // 1. Hiện Toast
    toast.info(notif.title, {
      position: 'top-right',
      autoClose: 5000,
    });

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
