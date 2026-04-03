import { ReactNode } from 'react';
import { cn } from '../../lib/cn';

type BadgeVariant = 'default' | 'brand' | 'success' | 'danger' | 'outline';

export function Badge({
  children,
  className,
  variant = 'default',
}: {
  children: ReactNode;
  className?: string;
  variant?: BadgeVariant;
}) {
  const variants: Record<BadgeVariant, string> = {
    default: 'bg-black/5 text-[color:var(--color-text)]',
    brand: 'bg-amber-500/20 text-[color:var(--color-text)]',
    success: 'bg-emerald-500/15 text-emerald-800',
    danger: 'bg-rose-500/15 text-rose-800',
    outline: 'border border-[color:var(--color-border)] text-[color:var(--color-text)]',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold tracking-wide',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

