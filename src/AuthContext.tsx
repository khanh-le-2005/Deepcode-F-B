import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axiosClient from '@/src/lib/axiosClient';

interface User {
  id?: string;
  email: string;
  name?: string;
  role: 'admin' | 'staff';
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
    const token = localStorage.getItem('qr_dine_token');
    const savedUser = localStorage.getItem('qr_dine_user');

    if (!token) {
      if (savedUser) {
        localStorage.removeItem('qr_dine_user');
      }
      setIsLoading(false);
      return;
    }

    axiosClient.get('/api/auth/me')
      .then((response) => {
        const currentUser = {
          id: response.data.id,
          email: response.data.email,
          name: response.data.name,
          role: response.data.role,
        };
        setUser(currentUser);
        localStorage.setItem('qr_dine_user', JSON.stringify(currentUser));
      })
      .catch((error) => {
        setUser(null);
        localStorage.removeItem('qr_dine_user');
        const status = error?.response?.status;
        if (status === 401 || status === 403) {
          localStorage.removeItem('qr_dine_token');
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

      const data = response.data;
      const newUser: User = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        role: data.user.role
      };
      setUser(newUser);
      localStorage.setItem('qr_dine_user', JSON.stringify(newUser));
      localStorage.setItem('qr_dine_token', data.token);
      return true;
    } catch (error) {
      console.error("Login failed:", error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('qr_dine_user');
    localStorage.removeItem('qr_dine_token');
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
