import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Menu, X, User, LogOut, ChevronDown } from 'lucide-react';
import { useState } from 'react';
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
  const [menuOpen, setMenuOpen] = useState(false);

  const getDashboardLink = () => {
    if (profile?.role === 'admin') return '/admin';
    if (profile?.role === 'advisor') return '/advisor/dashboard';
    return '/dashboard';
  };

  return (
    <nav className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        <Link to="/" className="text-xl font-bold text-secondary">TradeCircle</Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-6 md:flex">
          <Link to="/" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Home</Link>
          <Link to="/#advisors" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Browse Advisors</Link>
          {user ? (
            <>
              <Link to={getDashboardLink()} className="text-sm text-muted-foreground transition-colors hover:text-foreground">Dashboard</Link>
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
              <Link to="/login"><Button variant="outline" size="sm">Sign In</Button></Link>
              <Link to="/register"><Button size="sm">Sign Up</Button></Link>
            </div>
          )}
        </div>

        {/* Mobile menu button */}
        <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t px-4 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            <Link to="/" className="text-sm font-medium" onClick={() => setMenuOpen(false)}>Home</Link>
            <Link to="/#advisors" className="text-sm font-medium" onClick={() => setMenuOpen(false)}>Browse Advisors</Link>
            {user ? (
              <>
                <Link to={getDashboardLink()} className="text-sm font-medium" onClick={() => setMenuOpen(false)}>Dashboard</Link>
                <Link to="/profile" className="text-sm font-medium" onClick={() => setMenuOpen(false)}>My Profile</Link>
                <Button variant="outline" size="sm" onClick={() => { signOut(); navigate('/'); setMenuOpen(false); }}>
                  <LogOut className="mr-2 h-4 w-4" /> Logout
                </Button>
              </>
            ) : (
              <div className="flex gap-2">
                <Link to="/login" className="flex-1" onClick={() => setMenuOpen(false)}><Button variant="outline" size="sm" className="w-full">Sign In</Button></Link>
                <Link to="/register" className="flex-1" onClick={() => setMenuOpen(false)}><Button size="sm" className="w-full">Sign Up</Button></Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
