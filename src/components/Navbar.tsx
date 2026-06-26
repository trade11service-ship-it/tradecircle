import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { User, LogOut, ChevronDown, Menu, X, ShieldCheck } from 'lucide-react';
import { useState, useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Navbar() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const getDashboardLink = () => {
    if (profile?.role === 'admin') return '/admin';
    if (profile?.role === 'advisor') return '/advisor/dashboard';
    return '/home';
  };

  const navLinks = [
    { to: '/discover', label: 'Discover Advisors' },
    { to: '/explore', label: 'Public Feed' },
    { to: '/#pricing', label: 'Pricing' },
    { to: '/advisor-register', label: 'Join as RA', highlight: true },
  ];

  const isActive = (path: string) => location.pathname === path.split('#')[0];

  return (
    <>
      <nav className="sticky top-0 z-50 h-14 bg-background/95 backdrop-blur border-b border-border shadow-sm">
        <div className="container mx-auto flex h-full items-center justify-between px-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald text-sm font-black text-white transition-transform group-hover:scale-105">
              R
            </div>
            <span className="text-lg font-extrabold tracking-tight text-white">
              RA <span className="text-emerald">Circle</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden items-center gap-1 lg:flex">
            {navLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  l.highlight
                    ? 'text-emerald hover:bg-white/5'
                    : isActive(l.to)
                      ? 'text-white bg-white/10'
                      : 'text-white/80 hover:text-white hover:bg-white/5'
                }`}
              >
                {l.label}
              </Link>
            ))}

            <div className="mx-2 h-6 w-px bg-white/15" />

            {user ? (
              <>
                <Link
                  to={getDashboardLink()}
                  className="px-3 py-2 rounded-md text-sm font-medium text-white/80 hover:text-white hover:bg-white/5"
                >
                  Dashboard
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2 h-9 text-white/90 hover:text-white hover:bg-white/10">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald text-xs font-bold text-white">
                        {(profile?.full_name || 'U').charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium">{profile?.full_name?.split(' ')[0] || 'Account'}</span>
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => navigate('/profile')}>
                      <User className="mr-2 h-4 w-4" /> My Profile
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={async () => { await signOut(); }}>
                      <LogOut className="mr-2 h-4 w-4" /> Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="text-white/90 hover:text-white hover:bg-white/10">
                    Login
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="sm" className="rounded-lg h-9 px-4 font-semibold bg-emerald hover:bg-emerald/90 text-white">
                    Get Started
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 rounded-lg text-white"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute top-14 left-0 right-0 bg-primary border-b border-white/10 shadow-xl animate-slide-up">
            <div className="container mx-auto px-4 py-4 space-y-1">
              {navLinks.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    l.highlight
                      ? 'text-emerald hover:bg-white/5'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  {l.label}
                </Link>
              ))}
              <div className="my-2 border-t border-white/10" />
              {user ? (
                <>
                  <Link to={getDashboardLink()} className="block px-4 py-3 rounded-lg text-sm font-medium text-white hover:bg-white/10">Dashboard</Link>
                  <Link to="/profile" className="block px-4 py-3 rounded-lg text-sm font-medium text-white hover:bg-white/10">Profile</Link>
                  <button onClick={async () => { setMobileOpen(false); await signOut(); }} className="w-full text-left px-4 py-3 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors">
                    Logout
                  </button>
                </>
              ) : (
                <div className="flex gap-2 px-4 pt-2">
                  <Link to="/login" className="flex-1">
                    <Button variant="outline" className="w-full border-white/30 text-white bg-transparent hover:bg-white/10 hover:text-white">Login</Button>
                  </Link>
                  <Link to="/register" className="flex-1">
                    <Button className="w-full bg-emerald hover:bg-emerald/90 text-white">Get Started</Button>
                  </Link>
                </div>
              )}
              <div className="px-4 pt-3 flex items-center gap-1.5 text-[11px] text-white/60">
                <ShieldCheck className="h-3 w-3 text-emerald" /> SEBI verified analysts only
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
