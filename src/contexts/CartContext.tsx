import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { OrderItem } from '../types';

interface CustomerInfo {
  name: string;
  phone: string;
  address: string;
  note: string;
}

interface CartContextType {
  cart: OrderItem[];
  addToCart: (item: OrderItem) => void;
  removeFromCart: (uniqueKey: string) => void;
  updateQuantity: (uniqueKey: string, delta: number) => void;
  getUniqueCartKey: (item: OrderItem) => string;
  clearCart: () => void;
  totalPrice: number;
  totalItems: number;
  // Persistent Form Data
  customerInfo: CustomerInfo;
  setCustomerInfo: React.Dispatch<React.SetStateAction<CustomerInfo>>;
  orderType: 'takeaway' | 'delivery';
  setOrderType: (type: 'takeaway' | 'delivery') => void;
  paymentMethod: 'cash' | 'transfer';
  setPaymentMethod: (method: 'cash' | 'transfer') => void;
  clearCustomerInfo: () => void;
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

  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>(() => {
    try {
      const saved = localStorage.getItem('qr_dine_customer_info');
      return saved ? JSON.parse(saved) : { name: '', phone: '', address: '', note: '' };
    } catch {
      return { name: '', phone: '', address: '', note: '' };
    }
  });

  const [orderType, setOrderType] = useState<'takeaway' | 'delivery'>(() => {
    return (localStorage.getItem('qr_dine_order_type') as any) || 'takeaway';
  });

  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>(() => {
    return (localStorage.getItem('qr_dine_payment_method') as any) || 'transfer';
  });

  useEffect(() => {
    localStorage.setItem('gomoto_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('qr_dine_customer_info', JSON.stringify(customerInfo));
  }, [customerInfo]);

  useEffect(() => {
    localStorage.setItem('qr_dine_order_type', orderType);
  }, [orderType]);

  useEffect(() => {
    localStorage.setItem('qr_dine_payment_method', paymentMethod);
  }, [paymentMethod]);

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
  
  const clearCustomerInfo = () => {
    setCustomerInfo({ name: '', phone: '', address: '', note: '' });
    localStorage.removeItem('qr_dine_customer_info');
  };

  const totalPrice = cart.reduce((acc, item) => acc + item.totalPrice, 0);
  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <CartContext.Provider value={{ 
      cart, addToCart, removeFromCart, updateQuantity, getUniqueCartKey, clearCart, totalPrice, totalItems,
      customerInfo, setCustomerInfo, orderType, setOrderType, paymentMethod, setPaymentMethod, clearCustomerInfo
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
};
