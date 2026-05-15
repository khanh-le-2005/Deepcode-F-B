import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axiosClient from '@/src/api/axiosClient';

interface User {
  id?: string;
  email: string;
  name?: string;
  role: 'admin' | 'staff' | 'chef';
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  
  // isLoading = true mặc định để chặn render UI cho đến khi Backend xác nhận xong Token
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('qr_dine_access_token');

    // CŨ: Xóa mấy dòng check savedUser ở đây đi
    if (!token) {
      setIsLoading(false);
      return;
    }

    // NGUỒN SỰ THẬT DUY NHẤT: Bắt buộc gọi Backend để lấy Role thật của Token này
    axiosClient.get('/api/auth/me')
      .then((response) => {
        const currentUser: User = {
          id: response.data.id || response.data._id,
          email: response.data.email,
          name: response.data.name,
          role: response.data.role, // Đây là Role THẬT từ Database
        };
        setUser(currentUser); // Chỉ lưu vào State (Bộ nhớ RAM)
      })
      .catch((error) => {
        // Lỗi 401/403 (Token giả mạo, hết hạn) -> Xóa sạch
        setUser(null);
        localStorage.removeItem('qr_dine_access_token');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await axiosClient.post('/api/auth/login', {
        email, password
      });

      const { success, user: userData, token } = response.data;

      if (!success) return false;

      const newUser: User = {
        id: userData.id || userData._id,
        email: userData.email,
        name: userData.name,
        role: userData.role
      };

      // 🔒 BẢO MẬT: Chỉ lưu token vào storage. Thông tin user (Role) giữ trên RAM.
      setUser(newUser);
      localStorage.setItem('qr_dine_access_token', token);

      return true;
    } catch (error) {
      console.error("Login failed:", error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await axiosClient.post('/api/auth/logout');
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      localStorage.removeItem('qr_dine_access_token');
      window.location.href = '/auth/login';
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};