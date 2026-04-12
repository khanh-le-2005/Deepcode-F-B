import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { OrderItem } from '../types';

interface CartContextType {
  cart: OrderItem[];
  addToCart: (item: OrderItem) => void;
  removeFromCart: (uniqueKey: string) => void;
  updateQuantity: (uniqueKey: string, delta: number) => void;
  getUniqueCartKey: (item: OrderItem) => string;
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

  const getUniqueCartKey = (item: OrderItem) => {
    const optionName = item.selectedOption?.name || 'none';
    const sortedAddons = (item.selectedAddons || [])
      .map(a => a.name)
      .sort()
      .join('|');
    return `${item.menuItemId}-${optionName}-${sortedAddons}`;
  };

  const addToCart = (newItem: OrderItem) => {
    setCart(prev => {
      const newKey = getUniqueCartKey(newItem);
      const existingIdx = prev.findIndex(i => getUniqueCartKey(i) === newKey);

      if (existingIdx > -1) {
        const updatedCart = [...prev];
        const item = updatedCart[existingIdx];
        const newQuantity = item.quantity + newItem.quantity;
        
        const unitExtras = (item.selectedOption?.priceExtra || 0) + 
                           (item.selectedAddons || []).reduce((sum, a) => sum + (a.priceExtra || 0), 0);
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

  const removeFromCart = (uniqueKey: string) => {
    setCart(prev => prev.filter(i => getUniqueCartKey(i) !== uniqueKey));
  };

  const updateQuantity = (uniqueKey: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (getUniqueCartKey(i) === uniqueKey) {
        const newQ = Math.max(1, i.quantity + delta);
        const unitExtras = (i.selectedOption?.priceExtra || 0) + 
                           (i.selectedAddons || []).reduce((sum, a) => sum + (a.priceExtra || 0), 0);
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
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, getUniqueCartKey, clearCart, totalPrice, totalItems }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
};
