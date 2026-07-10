
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
        subtitle="Real signals from SEBI verified advisors. Updated in real-time."
        badges={[
          { icon: <Shield className="h-3 w-3 text-primary" />, label: advisorCount && advisorCount > 0 ? `${advisorCount} Verified Advisors` : "100% SEBI Verified" },
          { icon: <Lock className="h-3 w-3 text-primary" />, label: "Tamper-proof" },
          { icon: <Radio className="h-3 w-3 text-primary" />, label: "Free to browse" },
        ]}
      />

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
