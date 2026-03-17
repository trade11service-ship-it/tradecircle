import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Bell, User, BarChart3, PenSquare, TrendingUp } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export function BottomNav() {
  const { user, profile } = useAuth();
  const location = useLocation();
  const path = location.pathname;

  // Don't show on admin dashboard
  if (path.startsWith('/admin')) return null;

  const isAdvisor = profile?.role === 'advisor';

  const traderTabs = [
    { to: user ? '/dashboard' : '/', icon: Home, label: 'Home', match: (p: string) => p === '/' || p === '/dashboard' },
    { to: '/discover', icon: Search, label: 'Discover', match: (p: string) => p === '/discover' || p === '/groups' },
    { to: user ? '/dashboard' : '/login', icon: Bell, label: 'Alerts', match: (p: string) => false },
    { to: user ? '/profile' : '/login', icon: User, label: 'Profile', match: (p: string) => p === '/profile' || p === '/login' || p === '/register' },
  ];

  const advisorTabs = [
    { to: '/advisor/dashboard', icon: BarChart3, label: 'Groups', match: (p: string) => p === '/advisor/dashboard' },
    { to: '/advisor/dashboard', icon: PenSquare, label: 'Post', match: (p: string) => false },
    { to: '/advisor/dashboard', icon: TrendingUp, label: 'Signals', match: (p: string) => false },
    { to: '/profile', icon: User, label: 'Profile', match: (p: string) => p === '/profile' },
  ];

  const tabs = isAdvisor ? advisorTabs : traderTabs;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 md:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-14">
        {tabs.map((tab, i) => {
          const active = tab.match(path);
          return (
            <Link
              key={`${tab.label}-${i}`}
              to={tab.to}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 min-w-[60px] transition-colors ${
                active ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <tab.icon className={`h-5 w-5 ${active ? 'stroke-[2.5]' : ''}`} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
