  import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axiosClient from '@/src/lib/axiosClient';

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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('qr_dine_access_token');
    const savedUser = localStorage.getItem('qr_dine_user');

    if (!token) {
      if (savedUser) {
        localStorage.removeItem('qr_dine_user');
      }
      setIsLoading(false);
      return;
    }

    // Luôn fetch thông tin user mới nhất khi khởi động nếu đã có token
    axiosClient.get('/api/auth/me')
      .then((response) => {
        const currentUser = {
          id: response.data.id || response.data._id,
          email: response.data.email,
          name: response.data.name,
          role: response.data.role,
        };
        setUser(currentUser);
        localStorage.setItem('qr_dine_user', JSON.stringify(currentUser));
      })
      .catch((error) => {
        // Lỗi 401/403 sẽ được xử lý bởi axios interceptor (thử refresh token)
        // Nếu catch ở đây nghĩa là refresh token cũng hỏng
        if (error?.response?.status === 401) {
             setUser(null);
             localStorage.removeItem('qr_dine_user');
             localStorage.removeItem('qr_dine_access_token');
        }
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
      
      setUser(newUser);
      localStorage.setItem('qr_dine_user', JSON.stringify(newUser));
      localStorage.setItem('qr_dine_access_token', token);
      
      return true;
    } catch (error) {
      console.error("Login failed:", error);
      return false;
    }
  };

  const logout = async () => {
    try {
      // Gọi API đăng xuất để huỷ refresh token ở backend
      await axiosClient.post('/api/auth/logout');
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      localStorage.removeItem('qr_dine_user');
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
