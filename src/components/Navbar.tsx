import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { cn } from '../lib/cn';

export const Navbar = ({ title, showBack = false, onBack }: { title: string; showBack?: boolean; onBack?: () => void }) => {
  const navigate = useNavigate();
  return (
    <nav className="sticky top-0 z-50 border-b border-[color:var(--color-border)] bg-[color:var(--color-surface)]/80 backdrop-blur-xl">
      <div className="app-container flex items-center justify-between py-4">
      <div className="flex items-center gap-3">
        {showBack && (
          <button 
            onClick={onBack || (() => navigate(-1))} 
            className={cn(
              'rounded-xl p-2 text-[color:var(--color-muted)] transition-colors hover:bg-black/5 hover:text-[color:var(--color-text)]',
            )}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <h1 className="text-xl font-black tracking-tight text-[color:var(--color-text)]">{title}</h1>
      </div>
      </div>
    </nav>
  );
};
