import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { User, LogOut, ChevronDown, Menu, X } from 'lucide-react';
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
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const getDashboardLink = () => {
    if (profile?.role === 'admin') return '/admin';
    if (profile?.role === 'advisor') return '/advisor/dashboard';
    return '/dashboard';
  };

  const isActive = (path: string) => location.pathname === path;
  const linkClass = (path: string) =>
    `text-sm font-medium transition-colors duration-200 ${isActive(path) ? 'text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'}`;

  const isHeroPage = location.pathname === '/' || location.pathname === '/about';

  return (
    <>
      <nav className={`sticky top-0 z-50 h-14 transition-all duration-300 ${
        scrolled 
          ? 'bg-card/95 backdrop-blur-xl border-b border-border shadow-sm' 
          : isHeroPage
            ? 'bg-transparent border-b border-transparent'
            : 'bg-card/95 backdrop-blur-xl border-b border-border'
      }`}>
        <div className="container mx-auto flex h-full items-center justify-between px-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-black text-primary-foreground transition-transform group-hover:scale-105">
              S
            </div>
            <span className={`text-lg font-extrabold tracking-tight transition-colors ${
              !scrolled && isHeroPage ? 'text-white' : 'text-foreground'
            }`}>
              Stock<span className="text-primary">Circle</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden items-center gap-6 md:flex">
            <Link to="/" className={`${linkClass('/')} ${!scrolled && isHeroPage ? 'text-white/80 hover:text-white' : ''}`}>Home</Link>
            <Link to="/discover" className={`${linkClass('/discover')} ${!scrolled && isHeroPage ? 'text-white/80 hover:text-white' : ''}`}>Discover</Link>
            <Link to="/about" className={`${linkClass('/about')} ${!scrolled && isHeroPage ? 'text-white/80 hover:text-white' : ''}`}>About</Link>
            {user ? (
              <>
                <Link to={getDashboardLink()} className={linkClass(getDashboardLink())}>Dashboard</Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2 h-9">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-xs font-bold text-primary-foreground">
                        {(profile?.full_name || 'U').charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium">{profile?.full_name?.split(' ')[0] || 'Account'}</span>
                      <ChevronDown className="h-3 w-3 text-muted-foreground" />
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
                  <Button variant="ghost" size="sm" className={`${!scrolled && isHeroPage ? 'text-white/80 hover:text-white hover:bg-white/10' : 'text-muted-foreground hover:text-foreground'}`}>
                    Sign In
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="sm" className="rounded-lg h-9 px-4 font-semibold tc-btn-click bg-primary hover:bg-primary/90">
                    Get Started
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className={`md:hidden p-2 rounded-lg transition-colors ${!scrolled && isHeroPage ? 'text-white' : 'text-foreground'}`}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute top-14 left-0 right-0 bg-card border-b border-border shadow-xl animate-slide-up">
            <div className="container mx-auto px-4 py-4 space-y-1">
              <Link to="/" className="block px-4 py-3 rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors">Home</Link>
              <Link to="/discover" className="block px-4 py-3 rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors">Discover Advisors</Link>
              <Link to="/about" className="block px-4 py-3 rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors">About</Link>
              <Link to="/explore" className="block px-4 py-3 rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors">Public Feed</Link>
              <div className="my-2 border-t border-border" />
              {user ? (
                <>
                  <Link to={getDashboardLink()} className="block px-4 py-3 rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors">Dashboard</Link>
                  <Link to="/profile" className="block px-4 py-3 rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors">Profile</Link>
                  <button onClick={async () => { setMobileOpen(false); await signOut(); }} className="w-full text-left px-4 py-3 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors">
                    Logout
                  </button>
                </>
              ) : (
                <div className="flex gap-2 px-4 pt-2">
                  <Link to="/login" className="flex-1">
                    <Button variant="outline" className="w-full">Sign In</Button>
                  </Link>
                  <Link to="/register" className="flex-1">
                    <Button className="w-full">Get Started</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
