import { BookOpen, History, Home, Sparkles } from 'lucide-react';
import type { AppView } from '../types';

interface NavBarProps {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
}

export function NavBar({ activeView, onNavigate }: NavBarProps) {
  const items: Array<{ view: AppView; label: string; icon: typeof Home }> = [
    { view: 'home', label: '首页', icon: Home },
    { view: 'reading', label: '占卜', icon: Sparkles },
    { view: 'history', label: '历史', icon: History },
    { view: 'library', label: '牌库', icon: BookOpen },
  ];

  return (
    <nav className="bottom-nav" aria-label="主导航">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.view}
            className={activeView === item.view ? 'is-active' : ''}
            type="button"
            onClick={() => onNavigate(item.view)}
          >
            <Icon size={20} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
