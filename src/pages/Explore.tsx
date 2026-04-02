import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PublicMixedFeed } from "@/components/PublicMixedFeed";
import { useEffect } from "react";
import { setMetaTags, SEO_CONFIG } from "@/lib/seo";

export default function Explore() {
  // Set meta tags
  useEffect(() => {
    setMetaTags(SEO_CONFIG.explore);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 md:py-12 flex-1">
        {/* Hero Section */}
        <div className="mb-12 text-center max-w-2xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight mb-4">
            Public Feed
          </h1>
          <p className="text-lg text-muted-foreground mb-6">
            Discover public analysis and insights from SEBI verified trading advisors. Follow advisors to get their latest free posts directly in your feed.
          </p>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary mb-1">500+</p>
              <p className="text-xs text-muted-foreground">Verified Advisors</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary mb-1">100%</p>
              <p className="text-xs text-muted-foreground">SEBI Registered</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary mb-1">Free</p>
              <p className="text-xs text-muted-foreground">Public Posts</p>
            </div>
          </div>
        </div>

        {/* Feed Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-6">Latest Public Posts & Signals</h2>
          <div className="rounded-2xl border border-border bg-card p-3 md:p-4">
            <PublicMixedFeed preview={false} maxItems={999} />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

