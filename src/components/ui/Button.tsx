import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg';

export function Button({
  children,
  onClick,
  variant = 'primary',
  className,
  disabled = false,
  size = 'md',
  type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  className?: string;
  disabled?: boolean;
  size?: ButtonSize;
  type?: 'button' | 'submit' | 'reset';
}) {
  const variants: Record<ButtonVariant, string> = {
    primary:
      'text-[color:var(--color-text)] bg-[color:var(--color-brand)] hover:brightness-[1.03] shadow-[var(--shadow-soft)]',
    secondary:
      'text-[color:var(--color-text)] bg-[color:var(--color-brand-2)] hover:brightness-[1.03] shadow-[var(--shadow-soft)]',
    outline:
      'border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-text)] hover:bg-black/5',
    ghost: 'text-[color:var(--color-text)] hover:bg-black/5',
    danger:
      'bg-[color:var(--color-danger)] text-white hover:brightness-[1.03] shadow-[var(--shadow-soft)]',
    success:
      'bg-[color:var(--color-success)] text-white hover:brightness-[1.03] shadow-[var(--shadow-soft)]',
  };

  const sizes: Record<ButtonSize, string> = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-5 py-3 text-sm sm:text-base',
    lg: 'px-6 py-3.5 text-base sm:text-lg',
  };

  return (
    <motion.button
      type={type}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex select-none items-center justify-center gap-2 rounded-2xl font-bold transition-[transform,background-color,filter,box-shadow] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-500/25',
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {children}
    </motion.button>
  );
}

