import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { BottomNavigation } from "@/components/BottomNavigation";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import AdvisorProfile from "./pages/AdvisorProfile";
import TraderDashboard from "./pages/TraderDashboard";
import AdvisorRegister from "./pages/AdvisorRegister";
import AdvisorDashboard from "./pages/AdvisorDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import PaymentSuccess from "./pages/PaymentSuccess";
import NotFound from "./pages/NotFound";
import Disclaimer from "./pages/Disclaimer";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Refund from "./pages/Refund";
import ReferralLanding from "./pages/ReferralLanding";
import Discover from "./pages/Discover";
import Home from "./pages/Home";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Notifications from "./pages/Notifications";
import Subscriptions from "./pages/Subscriptions";
import Explore from "./pages/Explore";
import ListedAdvisors from "./pages/ListedAdvisors";
import FeaturedAdvisors from "./pages/FeaturedAdvisors";
import GroupDetails from "./pages/GroupDetails";
import { useAuth } from "@/lib/auth";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center bg-background"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ScrollToTop />
          <div className="pb-16 md:pb-0">
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
              <Route path="/discover" element={<Discover />} />
              <Route path="/listed-advisors" element={<ListedAdvisors />} />
              <Route path="/featured-advisors" element={<FeaturedAdvisors />} />
              <Route path="/groups" element={<Discover />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/advisor-register" element={<AdvisorRegister />} />
              <Route path="/advisor/:id" element={<AdvisorProfile />} />
              <Route path="/group/:id" element={<GroupDetails />} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
              <Route path="/subscriptions" element={<ProtectedRoute><Subscriptions /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><TraderDashboard /></ProtectedRoute>} />
              <Route path="/advisor/dashboard" element={<ProtectedRoute><AdvisorDashboard /></ProtectedRoute>} />
              <Route path="/advisor/dashboard/groups" element={<ProtectedRoute><AdvisorDashboard /></ProtectedRoute>} />
              <Route path="/advisor/dashboard/post" element={<ProtectedRoute><AdvisorDashboard /></ProtectedRoute>} />
              <Route path="/advisor/dashboard/signals" element={<ProtectedRoute><AdvisorDashboard /></ProtectedRoute>} />
              <Route path="/advisor/dashboard/earnings" element={<ProtectedRoute><AdvisorDashboard /></ProtectedRoute>} />
              <Route path="/advisor/dashboard/subscribers" element={<ProtectedRoute><AdvisorDashboard /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/approvals" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/revenue" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/complaints" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
              <Route path="/payment-success" element={<ProtectedRoute><PaymentSuccess /></ProtectedRoute>} />
              <Route path="/disclaimer" element={<Disclaimer />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/refund" element={<Refund />} />
              <Route path="/join/:code" element={<ReferralLanding />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
          <BottomNavigation />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
