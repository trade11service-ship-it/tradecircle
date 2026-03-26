import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Compass, BarChart3, User, Menu } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useState } from 'react';

export function BottomNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [showMenu, setShowMenu] = useState(false);

  // Determine which nav items to show based on user
  const getNavItems = () => {
    const commonItems = [
      { icon: Home, label: 'Home', path: '/' },
      { icon: Compass, label: 'Explore', path: '/discover' },
    ];

    if (user) {
      return [
        ...commonItems,
        { icon: BarChart3, label: 'Dashboard', path: '/dashboard' },
        { icon: User, label: 'Profile', path: '/profile' },
      ];
    } else {
      return [
        ...commonItems,
        { icon: BarChart3, label: 'Signals', path: '/explore' },
        { icon: User, label: 'Sign In', path: '/login' },
      ];
    }
  };

  const navItems = getNavItems();
  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-card border-t border-border z-40 safe-area-bottom">
        <div className="flex items-center justify-between h-16 px-2">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center justify-center flex-1 h-16 rounded-lg mx-1 transition-all duration-300 group relative ${
                  active
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {/* Background glow on active */}
                {active && (
                  <div className="absolute inset-0 bg-primary/10 rounded-lg animate-scale-in" />
                )}
                
                {/* Icon */}
                <div className="relative z-10 transition-transform duration-300 group-hover:scale-110">
                  <item.icon
                    className={`h-5 w-5 transition-all duration-300 ${
                      active ? 'scale-110 drop-shadow-sm' : ''
                    }`}
                  />
                </div>

                {/* Label */}
                <span className={`text-[10px] font-bold mt-1 transition-all duration-300 ${
                  active ? 'opacity-100 scale-100' : 'opacity-70 scale-95'
                }`}>
                  {item.label}
                </span>

                {/* Active indicator dot */}
                {active && (
                  <div className="absolute bottom-1 w-1 h-1 bg-primary rounded-full animate-pulse" />
                )}
              </button>
            );
          })}

          {/* More menu */}
          <button
            onClick={() => setShowMenu(!showMenu)}
            className={`flex flex-col items-center justify-center flex-1 h-16 rounded-lg mx-1 transition-all duration-300 group relative ${
              showMenu ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {showMenu && (
              <div className="absolute inset-0 bg-primary/10 rounded-lg animate-scale-in" />
            )}
            <div className="relative z-10 transition-transform duration-300 group-hover:scale-110">
              <Menu className={`h-5 w-5 transition-all duration-300 ${
                showMenu ? 'scale-110 drop-shadow-sm' : ''
              }`} />
            </div>
            <span className={`text-[10px] font-bold mt-1 transition-all duration-300 ${
              showMenu ? 'opacity-100 scale-100' : 'opacity-70 scale-95'
            }`}>
              More
            </span>
          </button>
        </div>
      </nav>

      {/* More Menu Modal */}
      {showMenu && (
        <div className="fixed inset-0 md:hidden z-50 animate-fade-in">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setShowMenu(false)}
          />

          {/* Menu */}
          <div className="absolute bottom-20 left-4 right-4 bg-card rounded-2xl border border-border shadow-lg animate-slide-in-top">
            <div className="p-4 space-y-2">
              {user ? (
                <>
                  <a
                    href="/profile"
                    onClick={() => setShowMenu(false)}
                    className="block px-4 py-3 rounded-lg hover:bg-muted transition-colors text-foreground font-medium text-[14px]"
                  >
                    My Profile
                  </a>
                  <a
                    href="/notifications"
                    onClick={() => setShowMenu(false)}
                    className="block px-4 py-3 rounded-lg hover:bg-muted transition-colors text-foreground font-medium text-[14px]"
                  >
                    Notifications
                  </a>
                  <a
                    href="/subscriptions"
                    onClick={() => setShowMenu(false)}
                    className="block px-4 py-3 rounded-lg hover:bg-muted transition-colors text-foreground font-medium text-[14px]"
                  >
                    My Subscriptions
                  </a>
                  <div className="border-t border-border my-2" />
                  <a
                    href="/privacy"
                    onClick={() => setShowMenu(false)}
                    className="block px-4 py-3 rounded-lg hover:bg-muted transition-colors text-muted-foreground text-[13px]"
                  >
                    Privacy & Terms
                  </a>
                  <button
                    onClick={() => {
                      // Handle logout
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-3 rounded-lg bg-destructive/10 hover:bg-destructive/20 transition-colors text-destructive font-medium text-[14px]"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <a
                    href="/login"
                    onClick={() => setShowMenu(false)}
                    className="block px-4 py-3 rounded-lg hover:bg-muted transition-colors text-foreground font-medium text-[14px]"
                  >
                    Sign In
                  </a>
                  <a
                    href="/register"
                    onClick={() => setShowMenu(false)}
                    className="block px-4 py-3 rounded-lg bg-primary/10 text-primary font-medium text-[14px]"
                  >
                    Create Account
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
