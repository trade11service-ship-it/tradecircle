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

  const navItems = [
    {
      name: "Home",
      path: isAdvisor ? "/advisor/dashboard" : isAdmin ? "/admin" : "/home",
      icon: Home,
      show: true,
    },
    {
      name: "Dashboard",
      path: "/advisor/dashboard",
      icon: LayoutDashboard,
      show: isAdvisor,
    },
    {
      name: "Discover",
      path: "/discover",
      icon: Compass,
      show: !isAdvisor && !isAdmin,
    },
    {
      name: "Profile",
      path: "/profile",
      icon: User,
      show: true,
    },
  ];

  return (
    <div className="flex h-[100dvh] w-[100vw] bg-background overflow-hidden relative">
      
      {/* Desktop Sidebar (Fixed Left) */}
      <aside className="hidden md:flex flex-col w-[260px] lg:w-[280px] border-r border-border bg-card shrink-0 z-20 h-full">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <Link to="/" className="flex items-center gap-2 text-foreground">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
              S
            </div>
            <span className="text-xl font-extrabold tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Stock<span className="text-primary">Circle</span>
            </span>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          {navItems.filter(item => item.show).map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
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
        </div>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 px-4 py-3 mb-2 rounded-xl bg-muted/50 border border-border/50">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold shrink-0 shadow-inner">
              {(profile?.full_name || "U").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-foreground truncate">{profile?.full_name}</p>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider truncate">
                {isAdvisor ? "Advisor Account" : "Trader Account"}
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
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-[100dvh] relative z-10 bg-muted/30">
        {/* Mobile Header (Only visible on small screens) */}
        <header className="md:hidden h-14 flex items-center justify-between px-4 bg-card border-b border-border shrink-0 z-20">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-sm">
              S
            </div>
            <span className="text-lg font-extrabold tracking-tight text-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Stock<span className="text-primary">Circle</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/profile" className="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted">
              <User className="h-5 w-5" />
            </Link>
          </div>
        </header>

        {/* Scrollable Content (Strictly bound to flex-1) */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative w-full scroll-smooth">
          <div className="min-h-full flex flex-col">
            {children}
          </div>
        </div>
        
        {/* Mobile Bottom Navigation Placeholder to push content above actual fixed nav */}
        {user && <div className="md:hidden h-[60px] shrink-0 w-full bg-transparent"></div>}
      </main>

      {/* Mobile Bottom Navigation (Fixed Absolute to bottom) */}
      {user && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[60px] flex items-center justify-around bg-card border-t border-border z-50 pb-safe shadow-[0_-5px_15px_-5px_rgba(0,0,0,0.05)]">
          {navItems.filter(item => item.show).map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <item.icon className={`h-5 w-5 ${isActive ? "fill-primary/20" : ""}`} />
                <span className="text-[10px] font-bold">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
