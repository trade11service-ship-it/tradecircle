import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

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
    <nav className="border-b bg-card">
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        <Link to="/" className="text-xl font-bold text-secondary">TradeCircle</Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-4 md:flex">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">Home</Link>
          <Link to="/#advisors" className="text-sm text-muted-foreground hover:text-foreground">Browse Advisors</Link>
          {user ? (
            <>
              <Link to={getDashboardLink()} className="text-sm text-muted-foreground hover:text-foreground">Dashboard</Link>
              <Button variant="outline" size="sm" onClick={() => { signOut(); navigate('/'); }}>Logout</Button>
            </>
          ) : (
            <>
              <Link to="/login"><Button variant="outline" size="sm">Login</Button></Link>
              <Link to="/advisor-register"><Button size="sm">Join as Advisor</Button></Link>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t px-4 py-3 md:hidden">
          <div className="flex flex-col gap-3">
            <Link to="/" className="text-sm" onClick={() => setMenuOpen(false)}>Home</Link>
            <Link to="/#advisors" className="text-sm" onClick={() => setMenuOpen(false)}>Browse Advisors</Link>
            {user ? (
              <>
                <Link to={getDashboardLink()} className="text-sm" onClick={() => setMenuOpen(false)}>Dashboard</Link>
                <Button variant="outline" size="sm" onClick={() => { signOut(); navigate('/'); setMenuOpen(false); }}>Logout</Button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMenuOpen(false)}>Login</Link>
                <Link to="/advisor-register" onClick={() => setMenuOpen(false)}>Join as Advisor</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
