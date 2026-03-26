import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PublicMixedFeed } from "@/components/PublicMixedFeed";

export default function Explore() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-6 md:py-10 flex-1">
        <div className="mb-4">
          <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
            Explore Advisor Posts
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Public mixed feed (analysis visible, signals limited for non-subscribers).
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-3 md:p-4">
          <PublicMixedFeed preview={false} maxItems={999} />
        </div>
      </main>
      <Footer />
    </div>
  );
}

