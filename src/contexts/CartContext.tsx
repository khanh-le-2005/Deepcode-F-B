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
      // Tìm món trùng ID, trùng Option và trùng tập hợp Addons
      const existingIdx = prev.findIndex(i => 
        i.menuItemId === newItem.menuItemId && 
        JSON.stringify(i.selectedOption) === JSON.stringify(newItem.selectedOption) &&
        JSON.stringify(i.selectedAddons) === JSON.stringify(newItem.selectedAddons)
      );

      if (existingIdx > -1) {
        const updatedCart = [...prev];
        const item = updatedCart[existingIdx];
        const newQuantity = item.quantity + newItem.quantity;
        
        // Tính lại giá dựa trên (basePrice + extras) * newQuantity
        const unitExtras = (item.selectedOption?.priceExtra || 0) + 
                           item.selectedAddons.reduce((sum, a) => sum + (a.priceExtra || 0), 0);
        const newTotalPrice = (item.basePrice + unitExtras) * newQuantity;

        updatedCart[existingIdx] = { 
          ...item, 
          quantity: newQuantity, 
          totalPrice: newTotalPrice 
        };
        return updatedCart;
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
        const unitExtras = (i.selectedOption?.priceExtra || 0) + 
                           i.selectedAddons.reduce((sum, a) => sum + (a.priceExtra || 0), 0);
        const newTotalPrice = (i.basePrice + unitExtras) * newQ;
        
        return { ...i, quantity: newQ, totalPrice: newTotalPrice };
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
