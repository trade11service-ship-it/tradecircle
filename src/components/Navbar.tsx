import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { User, LogOut, ChevronDown } from 'lucide-react';
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

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const getDashboardLink = () => {
    if (profile?.role === 'admin') return '/admin';
    if (profile?.role === 'advisor') return '/advisor/dashboard';
    return '/dashboard';
  };

  const isActive = (path: string) => location.pathname === path;
  const linkClass = (path: string) =>
    `text-sm transition-colors ${isActive(path) ? 'font-semibold text-primary' : 'text-muted-foreground hover:text-foreground'}`;

  return (
    <nav className={`sticky top-0 z-50 h-14 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 transition-shadow ${scrolled ? 'shadow-md' : ''}`}>
      <div className="container mx-auto flex h-full items-center justify-between px-4">
        <Link to="/" className="text-lg font-extrabold text-foreground">Trade<span className="text-primary">Circle</span></Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-5 md:flex">
          <Link to="/" className={linkClass('/')}>Home</Link>
          <Link to="/groups" className={linkClass('/groups')}>Discover</Link>
          {user ? (
            <>
              <Link to={getDashboardLink()} className={linkClass(getDashboardLink())}>Dashboard</Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      {(profile?.full_name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm">{profile?.full_name?.split(' ')[0] || 'Account'}</span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="mr-2 h-4 w-4" /> My Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => { signOut(); navigate('/'); }}>
                    <LogOut className="mr-2 h-4 w-4" /> Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login"><Button variant="outline" size="sm" className="border-2 border-primary text-primary hover:bg-light-green tc-btn-click">Sign In</Button></Link>
              <Link to="/register"><Button size="sm" className="tc-btn-click">Sign Up</Button></Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
