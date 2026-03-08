import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';

const NotFound = () => {
  const location = useLocation();
  useEffect(() => { console.error("404 Error: User attempted to access non-existent route:", location.pathname); }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-off-white">
      <Navbar />
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-6xl font-extrabold text-foreground">404</h1>
          <p className="mt-4 text-xl text-muted-foreground">Oops! Page not found</p>
          <Link to="/"><Button className="mt-6 tc-btn-click">Return to Home</Button></Link>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default NotFound;
