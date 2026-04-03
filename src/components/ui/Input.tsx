import { forwardRef,React } from 'react';
import { cn } from '../../lib/cn';

export const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }
>(function Input({ className, label, error, id, ...props }, ref) {
  const inputId = id || props.name;

  return (
    <label className="block">
      {label ? <div className="mb-1.5 text-sm font-bold text-[color:var(--color-text)]">{label}</div> : null}
      <input
        ref={ref}
        id={inputId}
        className={cn(
          'w-full rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-3 text-[color:var(--color-text)] placeholder:text-[color:var(--color-muted)] shadow-sm outline-none transition focus:border-amber-500/60 focus:ring-4 focus:ring-amber-500/20',
          error ? 'border-rose-500/70 focus:border-rose-500/70 focus:ring-rose-500/15' : '',
          className,
        )}
        {...props}
      />
      {error ? <div className="mt-1.5 text-sm font-semibold text-rose-700">{error}</div> : null}
    </label>
  );
});

