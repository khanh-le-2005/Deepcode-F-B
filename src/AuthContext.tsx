import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

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

    axios.get('/api/auth/me')
      .then((response) => {
        axios.defaults.headers.common.Authorization = `Bearer ${token}`;
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
          delete axios.defaults.headers.common.Authorization;
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (response.ok) {
        const data = await response.json();
        const newUser: User = {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          role: data.user.role
        };
        setUser(newUser);
        localStorage.setItem('qr_dine_user', JSON.stringify(newUser));
        localStorage.setItem('qr_dine_token', data.token);
        axios.defaults.headers.common.Authorization = `Bearer ${data.token}`;
        return true;
      }
      return false;
    } catch (error) {
      console.error("Login failed:", error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('qr_dine_user');
    localStorage.removeItem('qr_dine_token');
    delete axios.defaults.headers.common.Authorization;
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
