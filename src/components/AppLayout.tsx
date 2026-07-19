import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { 
  Home, 
  Compass, 
  Bell, 
  User, 
  LogOut, 
  LayoutDashboard,
  CreditCard,
  Settings
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { profile, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const isAdvisor = profile?.role === "advisor";
  const isAdmin = profile?.role === "admin";
  const isGroupPage = location.pathname.startsWith("/group/");

  // Dashboard target depends on role
  const dashboardPath = isAdvisor
    ? "/advisor/dashboard"
    : isAdmin
      ? "/admin"
      : "/home";

  // Unified nav: Home (always /), Discover, Dashboard (logged-in only), Profile
  const navItems = [
    { name: "Home", path: "/", icon: Home, show: true, exact: true },
    { name: "Discover", path: "/discover", icon: Compass, show: true, exact: false },
    { name: "Dashboard", path: dashboardPath, icon: LayoutDashboard, show: !!user, exact: false },
    { name: "Profile", path: "/profile", icon: User, show: !!user, exact: false },
  ];

  return (
    <div className="flex h-[100dvh] w-[100vw] bg-background overflow-hidden fixed inset-0">
      
      {/* Desktop Sidebar (Fixed Left) */}
      <aside className="hidden md:flex flex-col w-[260px] lg:w-[280px] border-r border-border bg-card shrink-0 z-20 h-full">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <Link to="/" className="flex items-center gap-2 text-foreground">
            <Logo size={34} className="rounded-md" />
            <span className="text-xl font-extrabold tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
              RA <span className="text-sky">Circle</span>
            </span>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          {navItems.filter(item => item.show).map((item) => {
            const isActive = item.exact
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${
                  isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <item.icon className={`h-5 w-5 ${isActive ? "text-primary" : ""}`} />
                {item.name}
              </Link>
            );
          })}
          {!user && (
            <Link
              to="/login"
              className="flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
            >
              <User className="h-5 w-5" />
              Sign In
            </Link>
          )}
        </div>

        <div className="p-4 border-t border-border">
          {user ? (
            <>
              <div className="flex items-center gap-3 px-4 py-3 mb-2 rounded-xl bg-muted/50 border border-border/50">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold shrink-0 shadow-inner">
                  {(profile?.full_name || "U").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-foreground truncate">{profile?.full_name}</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider truncate">
                    {isAdvisor ? "Advisor Account" : isAdmin ? "Admin" : "Trader Account"}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 px-4 py-3 rounded-xl font-semibold text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
              >
                <LogOut className="h-5 w-5" />
                Logout
              </button>
            </>
          ) : (
            <div className="space-y-2">
              <Link to="/login" className="flex w-full items-center justify-center px-4 py-3 rounded-xl bg-primary font-bold text-primary-foreground hover:bg-primary/90 transition-all">
                Sign In
              </Link>
              <Link to="/register" className="flex w-full items-center justify-center px-4 py-3 rounded-xl border border-border font-semibold text-foreground hover:bg-muted transition-all">
                Create account
              </Link>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 min-h-0 h-full relative z-10 bg-background overflow-hidden">
        {/* Mobile Header — hidden on group pages (group page owns its own chat header) */}
        {!isGroupPage && (
          <header className="md:hidden h-14 flex items-center justify-between px-4 bg-card border-b border-border shrink-0 z-30">
            <Link to="/" className="flex items-center gap-2">
              <Logo size={30} className="rounded-md" />
              <span className="text-lg font-extrabold tracking-tight text-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>
                RA <span className="text-sky">Circle</span>
              </span>
            </Link>
            <div className="flex items-center gap-2">
              {user ? (
                <Link to="/profile" aria-label="Profile" className="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted">
                  <User className="h-5 w-5" />
                </Link>
              ) : (
                <Link to="/login" className="rounded-full bg-primary px-3.5 h-8 inline-flex items-center text-[12px] font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition">
                  Sign In
                </Link>
              )}
            </div>
          </header>
        )}

        {/* Content area: group pages get a strict fixed-height container; everything else scrolls normally */}
        {isGroupPage ? (
          <div className="flex-1 min-h-0 h-full w-full overflow-hidden relative">
            {children}
          </div>
        ) : (
          <div className="flex-1 min-h-0 relative w-full overflow-y-auto overflow-x-hidden scroll-smooth">
            <div className="min-h-full flex flex-col">
              {children}
            </div>
          </div>
        )}

        {!isGroupPage && <div className="md:hidden h-[60px] shrink-0 w-full bg-background"></div>}
      </main>

      {/* Mobile Bottom Navigation (Fixed at bottom) — hidden on /group/* so the sticky Subscribe CTA is visible */}
      {!isGroupPage && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[60px] flex items-center justify-around bg-card border-t border-border z-50 pb-safe shadow-[0_-5px_15px_-5px_rgba(0,0,0,0.05)]">
          {navItems.filter(item => item.show).map((item) => {
            const isActive = item.exact
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <item.icon className={`h-5 w-5 ${isActive ? "fill-primary/20" : ""}`} />
                <span className="text-[10px] font-bold">{item.name}</span>
              </Link>
            );
          })}
          {!user && (
            <Link
              to="/login"
              className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${location.pathname === '/login' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <User className="h-5 w-5" />
              <span className="text-[10px] font-bold">Sign In</span>
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
