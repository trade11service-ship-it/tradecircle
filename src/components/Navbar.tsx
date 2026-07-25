import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { User, LogOut, ChevronDown, Menu, X, ShieldCheck } from 'lucide-react';
import { Logo } from '@/components/Logo';
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
    { to: '/discover', label: 'Discover' },
    { to: '/explore', label: 'Public feed' },
    { to: '/#pricing', label: 'Pricing' },
    { to: '/advisor-register', label: 'Join as analyst' },
  ];

  const isActive = (path: string) => location.pathname === path.split('#')[0];

  return (
    <>
      <nav className="sticky top-0 z-50 h-14 bg-background border-b border-border">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2" aria-label="RA Circle home">
            <Logo size={28} />
            <span className="sr-only">RA Circle</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden items-center gap-1 lg:flex">
            {navLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
                  isActive(l.to)
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {l.label}
              </Link>
            ))}

            <div className="mx-2 h-5 w-px bg-border" />

            {user ? (
              <>
                <Link
                  to={getDashboardLink()}
                  className="px-3 py-1.5 rounded-md text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Dashboard
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2 h-9">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-700">
                        {(profile?.full_name || 'U').charAt(0).toUpperCase()}
                      </div>
                      <span className="text-[13px] font-medium">{profile?.full_name?.split(' ')[0] || 'Account'}</span>
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => navigate('/profile')}>
                      <User className="mr-2 h-4 w-4" /> My profile
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={async () => { await signOut(); }}>
                      <LogOut className="mr-2 h-4 w-4" /> Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="text-[13px]">
                    Sign in
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="sm" className="h-9 px-4 rounded-[10px] text-[13px] font-semibold bg-primary hover:bg-primary/90 text-primary-foreground">
                    Get started
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 rounded-md text-foreground"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <div className="absolute top-14 left-0 right-0 bg-background border-b border-border animate-slide-up">
            <div className="mx-auto max-w-6xl px-4 py-3 space-y-1">
              {navLinks.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className="block px-3 py-2.5 rounded-md text-[14px] font-medium text-foreground hover:bg-slate-50"
                >
                  {l.label}
                </Link>
              ))}
              <div className="my-2 border-t border-border" />
              {user ? (
                <>
                  <Link to={getDashboardLink()} className="block px-3 py-2.5 rounded-md text-[14px] font-medium text-foreground hover:bg-slate-50">Dashboard</Link>
                  <Link to="/profile" className="block px-3 py-2.5 rounded-md text-[14px] font-medium text-foreground hover:bg-slate-50">Profile</Link>
                  <button onClick={async () => { setMobileOpen(false); await signOut(); }} className="w-full text-left px-3 py-2.5 rounded-md text-[14px] font-medium text-destructive hover:bg-destructive/5">
                    Sign out
                  </button>
                </>
              ) : (
                <div className="flex gap-2 px-3 pt-1">
                  <Link to="/login" className="flex-1">
                    <Button variant="outline" className="w-full h-10 rounded-[10px] border-border text-[13px] font-semibold">Sign in</Button>
                  </Link>
                  <Link to="/register" className="flex-1">
                    <Button className="w-full h-10 rounded-[10px] text-[13px] font-semibold bg-primary hover:bg-primary/90 text-primary-foreground">Get started</Button>
                  </Link>
                </div>
              )}
              <div className="px-3 pt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <ShieldCheck className="h-3 w-3 text-emerald" /> SEBI-verified analysts only
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
