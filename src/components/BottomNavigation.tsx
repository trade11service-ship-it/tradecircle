import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Users, Rss, User, LogIn } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export function BottomNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();

  // Hide on admin dashboard
  if (location.pathname.startsWith('/admin')) return null;

  const navItems = [
    { icon: Home, label: 'Home', path: user ? '/home' : '/' },
    { icon: Users, label: 'Advisors', path: '/discover' },
    { icon: Rss, label: 'Public Feed', path: '/explore' },
    {
      icon: user ? User : LogIn,
      label: user ? 'Profile' : 'Sign In',
      path: user ? '/profile' : '/login',
    },
  ];

  const isActive = (path: string) => {
    if (path === '/' || path === '/home') return location.pathname === '/' || location.pathname === '/home';
    return location.pathname === path;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-card border-t border-border z-40 safe-area-bottom">
      <div className="flex items-center justify-around h-14">
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center flex-1 h-14 transition-colors ${
                active ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <item.icon className={`h-5 w-5 ${active ? 'stroke-[2.5]' : ''}`} />
              <span className="text-[10px] font-medium mt-0.5">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
