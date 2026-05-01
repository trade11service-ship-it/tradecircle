
import { PublicMixedFeed } from "@/components/PublicMixedFeed";
import { useEffect, useState } from "react";
import { setMetaTags, SEO_CONFIG } from "@/lib/seo";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Lock, Radio } from "lucide-react";

export default function Explore() {
  const [advisorCount, setAdvisorCount] = useState<number | null>(null);

  useEffect(() => {
    setMetaTags(SEO_CONFIG.explore);
    supabase
      .from("advisors")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved")
      .then(({ count }) => setAdvisorCount(count ?? 0));
  }, []);

  return (
    <div className="min-h-full h-full flex flex-col bg-[hsl(210,20%,96%)]">
      

      {/* Hero Header — dark gradient */}
      <div className="bg-gradient-to-br from-[#0f172a] to-[#1e3a5f] text-white py-8 md:py-12 px-4">
        <div className="container mx-auto max-w-2xl text-center">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-2">
            Live Trading Feed
          </h1>
          <p className="text-sm md:text-base text-white/70 mb-5">
            Real signals from SEBI verified advisors. Updated in real-time.
          </p>
          <div className="flex justify-center gap-3 flex-wrap">
            {[
              { icon: <Shield className="h-3.5 w-3.5" />, label: advisorCount && advisorCount > 0 ? `${advisorCount} Verified Advisors` : "100% SEBI Verified" },
              { icon: <Lock className="h-3.5 w-3.5" />, label: "Tamper-proof" },
              { icon: <Radio className="h-3.5 w-3.5" />, label: "Free to browse" },
            ].map((s) => (
              <span
                key={s.label}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 border border-primary/30 px-3 py-1 text-[12px] font-semibold text-primary"
              >
                {s.icon} {s.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Feed */}
      <main className="container mx-auto px-4 py-6 flex-1 max-w-2xl">
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="border-b border-border bg-muted/40 px-3 py-2">
            <p className="text-sm font-semibold text-foreground">Recent Signals & Analysis</p>
            <p className="text-[11px] text-muted-foreground">Fixed live window with latest public posts.</p>
          </div>
          <div className="h-[70vh] min-h-[500px] overflow-y-auto p-3">
            <PublicMixedFeed preview={false} maxItems={999} />
          </div>
        </div>
      </main>
    </div>
  );
}
