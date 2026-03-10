import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Bell, User } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export function BottomNav() {
  const { user, profile } = useAuth();
  const location = useLocation();
  const path = location.pathname;

  // Don't show on admin/advisor dashboards
  if (path.startsWith('/admin') || path.startsWith('/advisor/dashboard')) return null;

  const getDashboard = () => {
    if (!user) return '/login';
    if (profile?.role === 'admin') return '/admin';
    if (profile?.role === 'advisor') return '/advisor/dashboard';
    return '/dashboard';
  };

  const tabs = [
    { to: '/', icon: Home, label: 'Home', match: (p: string) => p === '/' },
    { to: '/groups', icon: Search, label: 'Discover', match: (p: string) => p === '/groups' },
    { to: getDashboard(), icon: Bell, label: 'Alerts', match: (p: string) => p === '/dashboard' || p.includes('dashboard') },
    { to: user ? '/profile' : '/login', icon: User, label: 'Profile', match: (p: string) => p === '/profile' || p === '/login' || p === '/register' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 md:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-14">
        {tabs.map(tab => {
          const active = tab.match(path);
          return (
            <Link
              key={tab.label}
              to={tab.to}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-colors ${
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
