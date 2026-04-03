import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      <button
        aria-label="Close modal"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          className={cn(
            'w-full max-w-xl rounded-[var(--radius-2xl)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] shadow-[var(--shadow-soft)]',
            className,
          )}
        >
          {(title || description) && (
            <div className="flex items-start justify-between gap-4 border-b border-[color:var(--color-border)] px-5 py-4">
              <div className="min-w-0">
                {title ? (
                  <div className="text-lg font-black tracking-tight text-[color:var(--color-text)]">{title}</div>
                ) : null}
                {description ? (
                  <div className="mt-1 text-sm font-medium text-[color:var(--color-muted)]">{description}</div>
                ) : null}
              </div>
              <button
                aria-label="Close"
                onClick={onClose}
                className="rounded-xl p-2 text-[color:var(--color-muted)] hover:bg-black/5 hover:text-[color:var(--color-text)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          )}

          <div className="px-5 py-4">{children}</div>

          {footer ? (
            <div className="flex items-center justify-end gap-2 border-t border-[color:var(--color-border)] px-5 py-4">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

