import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Users, Rss, User, LogIn, LogOut, Settings, LayoutDashboard, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export function BottomNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, signOut } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Hide on admin dashboard
  if (location.pathname.startsWith('/admin')) return null;

  const getDashboardPath = () => {
    if (profile?.role === 'admin') return '/admin';
    if (profile?.role === 'advisor') return '/advisor/dashboard';
    return '/dashboard';
  };

  const navItems = [
    { icon: Home, label: 'Home', path: user ? '/dashboard' : '/' },
    { icon: Users, label: 'Advisors', path: '/discover' },
    { icon: Rss, label: 'Public Feed', path: '/explore' },
    {
      icon: user ? User : LogIn,
      label: user ? 'Profile' : 'Sign In',
      path: user ? '__profile_menu__' : '/login',
    },
  ];

  const isActive = (path: string) => {
    if (path === '/' || path === '/dashboard') {
      return (
        location.pathname === "/" ||
        location.pathname === "/home" ||
        location.pathname === "/dashboard"
      );
    }
    if (path === '__profile_menu__') return location.pathname === '/profile';
    return location.pathname === path;
  };

  return (
    <>
      {/* Profile slide-up menu */}
      {showProfileMenu && user && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setShowProfileMenu(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl border-t border-border p-4 pb-8 animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary text-sm font-bold text-primary-foreground">
                  {(profile?.full_name || 'U').charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{profile?.full_name || 'User'}</p>
                  <p className="text-xs text-muted-foreground">{profile?.email}</p>
                  <p className="text-[10px] text-primary font-bold mt-0.5">Stock<span className="text-secondary">Circle</span></p>
                </div>
              </div>
              <button onClick={() => setShowProfileMenu(false)} className="p-1 text-muted-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-1">
              <button
                onClick={() => { setShowProfileMenu(false); navigate('/profile'); }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
              >
                <User className="h-4 w-4" /> My Profile
              </button>
              <button
                onClick={() => { setShowProfileMenu(false); navigate(getDashboardPath()); }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
              >
                <LayoutDashboard className="h-4 w-4" /> Dashboard
              </button>
              <button
                onClick={() => { setShowProfileMenu(false); navigate('/subscriptions'); }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
              >
                <Settings className="h-4 w-4" /> Subscriptions
              </button>
              <div className="my-2 border-t border-border" />
              <button
                onClick={async () => { setShowProfileMenu(false); await signOut(); }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="h-4 w-4" /> Logout
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-card border-t border-border z-40 safe-area-bottom">
        <div className="flex items-center justify-around h-14">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <button
                key={item.label}
                onClick={() => {
                  if (item.path === '__profile_menu__') {
                    setShowProfileMenu(true);
                  } else {
                    navigate(item.path);
                  }
                }}
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
    </>
  );
}
