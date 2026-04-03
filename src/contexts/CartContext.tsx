import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { OrderItem } from '../types';

interface CartContextType {
  cart: OrderItem[];
  addToCart: (item: OrderItem) => void;
  removeFromCart: (menuItemId: string) => void;
  updateQuantity: (menuItemId: string, delta: number) => void;
  clearCart: () => void;
  totalPrice: number;
  totalItems: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cart, setCart] = useState<OrderItem[]>(() => {
    try {
      const saved = localStorage.getItem('gomoto_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('gomoto_cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (newItem: OrderItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.menuItemId === newItem.menuItemId);
      if (existing) {
        return prev.map(i => 
          i.menuItemId === newItem.menuItemId 
            ? { ...i, quantity: i.quantity + newItem.quantity, totalPrice: (i.quantity + newItem.quantity) * i.basePrice } 
            : i
        );
      }
      return [...prev, newItem];
    });
  };

  const removeFromCart = (menuItemId: string) => {
    setCart(prev => prev.filter(i => i.menuItemId !== menuItemId));
  };

  const updateQuantity = (menuItemId: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.menuItemId === menuItemId) {
        const newQ = Math.max(1, i.quantity + delta);
        return { ...i, quantity: newQ, totalPrice: newQ * i.basePrice };
      }
      return i;
    }));
  };

  const clearCart = () => setCart([]);

  const totalPrice = cart.reduce((acc, item) => acc + item.totalPrice, 0);
  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, totalPrice, totalItems }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
};
