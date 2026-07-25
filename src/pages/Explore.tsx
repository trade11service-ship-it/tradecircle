import { PublicMixedFeed } from "@/components/PublicMixedFeed";
import { useEffect, useState } from "react";
import { setMetaTags, SEO_CONFIG } from "@/lib/seo";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Lock, Radio } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

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
      <PageHeader
        eyebrow="Public Feed"
        title="Live Trading Feed"
        subtitle="Real signals from SEBI verified advisors. Newest posts appear at the bottom — like a live chat."
        badges={[
          { icon: <Shield className="h-3 w-3 text-primary" />, label: advisorCount && advisorCount > 0 ? `${advisorCount} Verified Advisors` : "100% SEBI Verified" },
          { icon: <Lock className="h-3 w-3 text-primary" />, label: "Tamper-proof" },
          { icon: <Radio className="h-3 w-3 text-primary" />, label: "Free to browse" },
        ]}
      />

      <main className="container mx-auto px-4 py-6 flex-1 max-w-2xl w-full min-h-0 flex">
        <div className="flex-1 min-h-0 overflow-hidden rounded-2xl border border-border bg-card flex flex-col">
          <div className="shrink-0 border-b border-border bg-muted/40 px-3 py-2">
            <p className="text-sm font-semibold text-foreground">Recent Signals & Analysis</p>
            <p className="text-[11px] text-muted-foreground">Live window · scroll up for older, new signals arrive below.</p>
          </div>
          <div className="flex-1 min-h-0 h-[70vh] min-h-[500px]">
            <PublicMixedFeed chatMode preview={false} maxItems={999} />
          </div>
        </div>
      </main>
    </div>
  );
}
