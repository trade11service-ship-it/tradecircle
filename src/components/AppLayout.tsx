import { ReactNode, useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import {
  Home,
  Compass,
  User,
  LogOut,
  Radio,
  Rss,
  GraduationCap,
  ChevronDown,
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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const isAdvisor = profile?.role === "advisor";
  const isAdmin = profile?.role === "admin";
  const isGroupPage = location.pathname.startsWith("/group/");

  const feedItem = isAdvisor
    ? { name: "Dashboard", path: "/advisor/dashboard", icon: Radio, show: !!user, exact: false }
    : isAdmin
      ? { name: "Admin", path: "/admin", icon: Radio, show: !!user, exact: false }
      : { name: "Feed", path: "/feed", icon: Radio, show: !!user, exact: false };

  const navItems = [
    { name: "Home", path: "/", icon: Home, show: true, exact: true },
    { name: "Discover", path: "/discover", icon: Compass, show: true, exact: false },
    feedItem,
    { name: "Public", path: "/explore", icon: Rss, show: true, exact: false },
    { name: "Courses", path: "/courses", icon: GraduationCap, show: true, exact: false },
  ].filter(i => i.show);

  const initial = (profile?.full_name || user?.email || "U").charAt(0).toUpperCase();

  return (
    <div className="flex h-[100dvh] w-[100vw] bg-background overflow-hidden fixed inset-0 flex-col">
      {/* ===== Top Header (desktop + mobile) — hidden on group pages ===== */}
      {!isGroupPage && (
        <header className="h-14 shrink-0 flex items-center justify-between px-4 md:px-6 bg-card border-b border-border z-30">
          <Link to="/" className="flex items-center" aria-label="RA Circle home">
            <Logo size={30} />
            <span className="sr-only">RA Circle</span>
          </Link>

          <div className="flex items-center gap-2">
            {user ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(v => !v)}
                  className="flex items-center gap-2 rounded-full pl-1 pr-2.5 py-1 hover:bg-muted transition-colors"
                  aria-label="Account menu"
                >
                  <div className="h-8 w-8 rounded-full bg-slate-100 text-slate-700 text-[13px] font-semibold flex items-center justify-center">
                    {initial}
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border bg-card shadow-xl overflow-hidden z-50">
                    <div className="px-3 py-2.5 border-b border-border">
                      <p className="text-[13px] font-semibold text-foreground truncate">{profile?.full_name || "Account"}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <button
                      onClick={() => { setMenuOpen(false); navigate("/profile"); }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-[13px] font-medium text-foreground hover:bg-muted text-left"
                    >
                      <User className="h-4 w-4" /> My profile
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-[13px] font-medium text-destructive hover:bg-destructive/5 text-left border-t border-border"
                    >
                      <LogOut className="h-4 w-4" /> Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="hidden sm:inline-flex items-center h-8 px-3 rounded-md text-[13px] font-medium text-muted-foreground hover:text-foreground"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="rounded-full bg-primary px-3.5 h-8 inline-flex items-center text-[12px] font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition"
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </header>
      )}

      {/* ===== Main Content Area ===== */}
      <main className="flex-1 flex flex-col min-w-0 min-h-0 relative z-10 bg-background overflow-hidden">
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
        {!isGroupPage && <div className="h-[64px] shrink-0 w-full bg-background" aria-hidden />}
      </main>

      {/* ===== Bottom Navigation (desktop + mobile) — hidden on group pages ===== */}
      {!isGroupPage && (
        <nav className="fixed bottom-0 left-0 right-0 h-[64px] bg-card border-t border-border z-50 pb-safe shadow-[0_-5px_15px_-5px_rgba(0,0,0,0.05)]">
          <div className="mx-auto max-w-lg h-full flex items-center justify-around px-2">
            {navItems.map((item) => {
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
                className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${
                  location.pathname === '/login' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <User className="h-5 w-5" />
                <span className="text-[10px] font-bold">Sign In</span>
              </Link>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}
