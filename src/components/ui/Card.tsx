import { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export function Card({
  children,
  className,
  variant = 'surface',
}: {
  children: ReactNode;
  className?: string;
  variant?: 'surface' | 'elevated' | 'flat';
}) {
  const styles =
    variant === 'flat'
      ? 'rounded-[var(--radius-2xl)]'
      : variant === 'elevated'
        ? 'surface-elevated'
        : 'surface';

  return <div className={cn(styles, className)}>{children}</div>;
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('px-5 pt-5', className)}>{children}</div>;
}

export function CardContent({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('px-5 pb-5', className)}>{children}</div>;
}

