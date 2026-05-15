import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Minus, Trash2 } from 'lucide-react';
import { OrderItem } from '@/src/types';
import { cn } from '@/src/api/cn';

interface CartItemProps {
    item: OrderItem;
    onUpdateQuantity: (item: OrderItem, delta: number) => void;
    onRemove: (item: OrderItem) => void;
    isOrdered?: boolean;
}

export const CartItem: React.FC<CartItemProps> = ({ item, onUpdateQuantity, onRemove, isOrdered = false }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className={cn(
                "bg-white rounded-[24px] p-4 md:p-5 shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:items-center gap-4 transition-all hover:shadow-md group",
                isOrdered && "bg-gray-50 opacity-80"
            )}
        >
            {/* Ảnh món */}
            <div className="w-full sm:w-24 h-40 sm:h-24 rounded-[16px] overflow-hidden shrink-0 bg-[#FEF9E7] border border-yellow-50 relative">
                <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
            </div>

            {/* Thông tin */}
            <div className="flex-1 min-w-0">
                <h3 className="font-black text-base md:text-lg text-gray-900 truncate">
                    {item.name}
                </h3>
                <div className="flex flex-wrap gap-1.5 mt-2">
                    {item.selectedOption && (
                        <span className="px-2 py-1 bg-gray-50 text-gray-600 text-[10px] font-bold rounded uppercase border border-gray-100">
                            Size: {item.selectedOption.name}
                        </span>
                    )}
                    {item.selectedAddons?.map((a: any, aIdx: number) => (
                        <span key={aIdx} className="px-2 py-1 bg-gray-50 text-gray-600 text-[10px] font-bold rounded uppercase border border-gray-100">
                            + {a.name}
                        </span>
                    ))}
                </div>
                {!isOrdered && (
                    <p className="text-orange-600 font-black mt-3 text-lg">
                        {(item.basePrice + (item.selectedOption?.priceExtra || 0)).toLocaleString()}đ
                    </p>
                )}
                {isOrdered && (
                    <span className="inline-block mt-2 px-3 py-1 bg-green-100 text-green-700 border border-green-200 rounded-md text-[9px] font-black uppercase tracking-widest">
                        {item.status}
                    </span>
                )}
            </div>

            {/* Hành động */}
            {!isOrdered ? (
                <div className="flex sm:flex-col items-center justify-between sm:items-end gap-3 mt-4 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-0 border-gray-50">
                    <div className="flex items-center bg-gray-50 rounded-xl border border-gray-200">
                        <button
                            onClick={() => onUpdateQuantity(item, -1)}
                            className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center hover:bg-white hover:text-orange-600 rounded-l-xl transition-colors font-bold text-gray-600"
                        >
                            <Minus size={16} />
                        </button>
                        <span className="w-8 md:w-10 text-center font-black text-sm">{item.quantity}</span>
                        <button
                            onClick={() => onUpdateQuantity(item, 1)}
                            className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center hover:bg-white hover:text-orange-600 rounded-r-xl transition-colors font-bold text-gray-600"
                        >
                            <Plus size={16} />
                        </button>
                    </div>
                    <button
                        onClick={() => onRemove(item)}
                        className="text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors p-2 rounded-lg flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest"
                    >
                        <Trash2 size={16} /> <span className="sm:hidden">Xóa</span>
                    </button>
                </div>
            ) : (
                <div className="text-right">
                    <p className="text-gray-500 text-xs font-bold">SL: {item.quantity}</p>
                </div>
            )}
        </motion.div>
    );
};
