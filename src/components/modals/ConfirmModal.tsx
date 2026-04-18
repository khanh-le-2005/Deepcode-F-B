import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle } from 'lucide-react';
import { Button } from '../Button';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (val?: any) => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  inputConfig?: {
    type: 'number' | 'text';
    min?: number;
    max?: number;
    defaultValue?: number | string;
  };
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy bỏ',
  variant = 'warning',
  inputConfig
}) => {
  const [inputValue, setInputValue] = useState<string | number>('');

  useEffect(() => {
    if (isOpen && inputConfig?.defaultValue !== undefined) {
      setInputValue(inputConfig.defaultValue);
    }
  }, [isOpen, inputConfig]);

  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      iconBg: 'bg-rose-50',
      iconColor: 'text-rose-500',
      buttonBg: 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20'
    },
    warning: {
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-500',
      buttonBg: 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'
    },
    info: {
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-500',
      buttonBg: 'bg-slate-900 hover:bg-slate-800 shadow-slate-900/20'
    }
  };

  const style = variantStyles[variant];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
        >
          <div className="p-8">
            <div className="flex flex-col items-center text-center">
              <div className={`w-20 h-20 ${style.iconBg} rounded-[2rem] flex items-center justify-center mb-6`}>
                <AlertCircle className={`w-10 h-10 ${style.iconColor}`} />
              </div>
              
              <h3 className="text-2xl font-black text-slate-900 mb-2 font-serif tracking-tight">
                {title}
              </h3>
              <p className="text-slate-500 font-medium whitespace-pre-wrap">
                {message}
              </p>

              {inputConfig && (
                <div className="mt-6 w-full">
                  <input
                    type={inputConfig.type}
                    min={inputConfig.min}
                    max={inputConfig.max}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className="w-full text-center text-2xl font-black py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-slate-800 focus:ring-0 transition-colors"
                  />
                  {inputConfig.max !== undefined && (
                    <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest">
                      Tối đa: {inputConfig.max}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 mt-10">
              <Button
                variant="outline"
                onClick={onClose}
                className="h-14 rounded-2xl border-none bg-slate-100 text-slate-500 font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
              >
                {cancelText}
              </Button>
              <Button
                onClick={() => {
                  onConfirm(inputConfig ? Number(inputValue) : undefined);
                  onClose();
                }}
                className={`h-14 rounded-2xl shadow-xl font-black text-xs uppercase tracking-widest text-white border-none ${style.buttonBg}`}
              >
                {confirmText}
              </Button>
            </div>
          </div>

          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 text-slate-300 hover:text-slate-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
