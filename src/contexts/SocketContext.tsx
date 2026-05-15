import React, { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'react-toastify';
import { useAuth } from '../AuthContext';
import axios from '../api/axiosClient';

import { Notification } from '../types';

interface SocketContextType {
  socket: Socket | null;
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

const SOCKET_URL = window.location.origin.includes('localhost')
  ? 'http://localhost:3001'
  : window.location.origin;

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const socketRef = useRef<Socket | null>(null);

  // Tham chiếu tới đối tượng Audio để tái sử dụng & Unlock
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUnlockedRef = useRef<boolean>(false);

  // Khởi tạo Âm thanh & Xử lý Unlock Autoplay Policy
  useEffect(() => {
    // Chỉ tạo đối tượng Audio 1 lần
    if (!audioRef.current) {
      audioRef.current = new Audio('/souldeffect/yippeeeeeeeeeeeeee.mp3');
      audioRef.current.load(); // Tải trước âm thanh
    }

    // Hàm "mở khóa" âm thanh khi người dùng tương tác lần đầu
    const unlockAudio = () => {
      if (audioRef.current && !audioUnlockedRef.current) {
        // Phát một đoạn âm thanh trống/im lặng (hoặc play rồi pause ngay)
        audioRef.current.play().then(() => {
          audioRef.current?.pause();
          if (audioRef.current) audioRef.current.currentTime = 0;
          audioUnlockedRef.current = true; // Đã mở khóa thành công

          // Gỡ sự kiện sau khi đã mở khóa
          document.removeEventListener('click', unlockAudio);
          document.removeEventListener('touchstart', unlockAudio);
          document.removeEventListener('keydown', unlockAudio);
          console.log("🔊 Audio Context Unlocked!");
        }).catch(() => {
          // Bỏ qua lỗi nếu hành động không được tính là user gesture
        });
      }
    };

    // Lắng nghe các tương tác đầu tiên của người dùng (kể cả click vào khoảng trống)
    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);
    document.addEventListener('keydown', unlockAudio);

    return () => {
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  // Khởi tạo kết nối Socket
  useEffect(() => {
    if (!socketRef.current) {
      const newSocket = io(SOCKET_URL, {
        withCredentials: true,
        transports: ['websocket', 'polling']
      });
      socketRef.current = newSocket;
      setSocket(newSocket);
    }
  }, []);

  // Quản lý Room & Lắng nghe sự kiện (SỬA LỖI RECONNECT)
  useEffect(() => {
    if (!socket) return;

    if (user) {
      // 1. Hàm Join Room sẽ được gọi mỗi khi socket kết nối (hoặc KẾT NỐI LẠI do rớt mạng)
      const handleJoinRooms = () => {
        console.log(`✅ Socket connected/reconnected: ${socket.id}. Re-joining rooms...`);
        if (user.role === 'admin' || user.role === 'staff') {
          socket.emit('join-room', 'role_staff');
        } else if (user.role === 'chef') {
          socket.emit('join-room', 'role_kitchen');
          socket.emit('join-room', 'role_staff');
        }
      };

      // Đăng ký sự kiện 'connect'
      socket.on('connect', handleJoinRooms);

      // Nếu lúc effect này chạy mà socket đã connect sẵn rồi, thì gọi join luôn
      if (socket.connected) {
        handleJoinRooms();
      }

      fetchNotifications();

      // 3. Lắng nghe thông báo mới
      const handleStaffNotification = (notif: any) => handleNewNotification(notif);
      const handleKitchenNotification = (notif: any) => handleNewNotification(notif);

      socket.on('notification:staff', handleStaffNotification);
      socket.on('notification:kitchen', handleKitchenNotification);

      return () => {
        // Clear cleanup cẩn thận để không rò rỉ bộ nhớ
        socket.off('connect', handleJoinRooms);
        socket.off('notification:staff', handleStaffNotification);
        socket.off('notification:kitchen', handleKitchenNotification);
      };
    } else {
      console.log('🚪 User logged out, cleaning up socket states...');
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
    // Format message
    // @ts-ignore
    if (notif.orderItems && notif.orderItems.length > 0) {
      // @ts-ignore
      const items = notif.orderItems as any[];
      let itemsText = items.map(i => `${i.quantity}x ${i.name}`).join(', ');
      if (itemsText.length > 80) itemsText = itemsText.substring(0, 77) + '...';
      // @ts-ignore
      notif.message = `Bàn ${notif.tableName || 'mang đi'} vừa gọi: ${itemsText}`;
    }

    // 1. Phát âm thanh an toàn
    if (audioRef.current) {
      // Set lại thời gian về 0 để lỡ có chuông dồn dập nó sẽ kêu lại từ đầu
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => {
        console.warn('Audio play blocked:', e);
        // Nếu bị chặn, hiện cảnh báo đỏ cho đầu bếp biết
        toast.error("⚠️ Trình duyệt đang chặn âm thanh. Vui lòng click chuột vào màn hình để bật chuông báo!", {
          position: 'top-center',
          autoClose: false, // Không tự đóng để bắt buộc phải chú ý
        });
      });
    }

    // 2. Hiện Toast thông báo đơn
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