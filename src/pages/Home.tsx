import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Bell, User, ArrowRight } from "lucide-react";
import { HeroSection } from "@/components/HeroSection";
import { setMetaTags, SEO_CONFIG } from "@/lib/seo";

type FeedItem = {
  id: string;
  post_type: string;
  instrument: string | null;
  signal_type: string | null;
  entry_price: number | null;
  target_price: number | null;
  stop_loss: number | null;
  notes: string | null;
  message_text: string | null;
  created_at: string | null;
  group_id: string;
  advisor_id: string;
};

export default function Home() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<FeedItem[]>([]);
  const [groupNames, setGroupNames] = useState<Record<string, string>>({});
  const [advisorNames, setAdvisorNames] = useState<Record<string, string>>({});
  const [advisorPhotos, setAdvisorPhotos] = useState<Record<string, string>>({});

  // Set meta tags
  useEffect(() => {
    setMetaTags(SEO_CONFIG.home);
  }, []);

  useEffect(() => {
    if (user) {
      fetchFeed();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchFeed = async () => {
    setLoading(true);
    const now = new Date().toISOString();
    const { data: subs } = await supabase
      .from("subscriptions")
      .select("group_id")
      .eq("user_id", user!.id)
      .eq("status", "active")
      .gte("end_date", now);

    const groupIds = [...new Set((subs || []).map((s) => s.group_id))];
    if (groupIds.length === 0) {
      setPosts([]);
      setLoading(false);
      return;
    }

    const { data: feedRows } = await supabase
      .from("signals")
      .select("id, post_type, instrument, signal_type, entry_price, target_price, stop_loss, notes, message_text, created_at, group_id, advisor_id")
      .in("group_id", groupIds)
      .order("created_at", { ascending: false })
      .limit(120);

    const feed = (feedRows || []) as FeedItem[];
    setPosts(feed);

    const uniqueGroupIds = [...new Set(feed.map((p) => p.group_id))];
    const uniqueAdvisorIds = [...new Set(feed.map((p) => p.advisor_id))];

    const [{ data: groups }, { data: advisors }] = await Promise.all([
      supabase.from("groups").select("id, name").in("id", uniqueGroupIds),
      supabase.from("advisors").select("id, full_name, profile_photo_url").in("id", uniqueAdvisorIds),
    ]);

    setGroupNames(Object.fromEntries((groups || []).map((g) => [g.id, g.name])));
    setAdvisorNames(Object.fromEntries((advisors || []).map((a) => [a.id, a.full_name])));
    setAdvisorPhotos(Object.fromEntries((advisors || []).map((a) => [a.id, a.profile_photo_url || ""])));
    setLoading(false);
  };

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  }, []);

  // If user not authenticated, show hero
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <HeroSection
          title="Get Trading Signals from SEBI Verified Advisors"
          subtitle="Discover 500+ manually verified trading advisors with public track records. Subscribe to premium signals delivered directly to Telegram."
          cta={{
            text: "Browse Advisors",
            href: "/discover",
          }}
          secondaryCta={{
            text: "Login to View Feed",
            href: "/login",
          }}
        />
        <section className="bg-slate-50 py-12 md:py-16">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold text-foreground mb-8">
              Why TradeCircle?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
              <div className="bg-white p-6 rounded-lg border border-slate-200">
                <div className="text-3xl font-bold text-green-600 mb-3">🛡️</div>
                <h3 className="font-bold text-foreground mb-2">SEBI Verified</h3>
                <p className="text-muted-foreground text-sm">
                  Every advisor manually verified and SEBI registered
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg border border-slate-200">
                <div className="text-3xl font-bold text-green-600 mb-3">📊</div>
                <h3 className="font-bold text-foreground mb-2">Public Track Records</h3>
                <p className="text-muted-foreground text-sm">
                  Full WIN/LOSS history visible for every advisor
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg border border-slate-200">
                <div className="text-3xl font-bold text-green-600 mb-3">⚡</div>
                <h3 className="font-bold text-foreground mb-2">Real-Time Telegram Alerts</h3>
                <p className="text-muted-foreground text-sm">
                  Signals delivered instantly to your Telegram
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted">
      <Navbar />
      <main className="mx-auto w-full max-w-4xl px-4 py-5">
        <div className="mb-4 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-extrabold text-foreground">
                {greeting}, {profile?.full_name?.split(" ")[0] || "Trader"}
              </h1>
              <p className="text-xs text-muted-foreground">
                Live signals from your SEBI verified subscribed advisors
              </p>
            </div>
            <Link to="/notifications">
              <Button variant="outline" size="icon" aria-label="Notifications">
                <Bell className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-[hsl(var(--chat-bg))] p-3">
          {loading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Loading your signal feed...</div>
          ) : posts.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-muted-foreground mb-3">
                You haven't subscribed to any advisors yet.
              </p>
              <p className="text-base font-semibold text-foreground mb-4">
                Browse 500+ SEBI verified advisors and start receiving trading signals.
              </p>
              <Link to="/discover">
                <Button className="gap-2">
                  Browse Verified Advisors <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {posts.map((post) => {
                const isSignal = post.post_type === "signal";
                const isBuy = post.signal_type === "BUY";
                const advisorName = advisorNames[post.advisor_id] || "Advisor";
                const groupName = groupNames[post.group_id] || "Group";
                const advisorPhoto = advisorPhotos[post.advisor_id];
                return (
                  <div key={post.id} className="flex gap-2">
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-primary-foreground">
                      {advisorPhoto ? <img src={advisorPhoto} alt="" className="h-full w-full object-cover" /> : <User className="h-4 w-4" />}
                    </div>
                    <div className={`max-w-[88%] rounded-2xl rounded-tl-sm border p-3 shadow-sm ${isSignal ? "bg-card border-primary/30" : "bg-card border-border"}`}>
                      <div className="mb-1 flex items-center gap-2">
                        <span className="text-xs font-bold text-primary">{advisorName}</span>
                        <span className="text-[10px] text-muted-foreground">• {groupName}</span>
                      </div>
                      {isSignal ? (
                        <div>
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <p className="text-sm font-extrabold text-foreground">{post.instrument}</p>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isBuy ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
                              {isBuy ? "BUY" : "SELL"}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted p-2 text-center">
                            <div><p className="text-[10px] text-muted-foreground">Entry</p><p className="text-xs font-bold">₹{Number(post.entry_price || 0).toLocaleString("en-IN")}</p></div>
                            <div><p className="text-[10px] text-muted-foreground">Target</p><p className="text-xs font-bold text-primary">₹{Number(post.target_price || 0).toLocaleString("en-IN")}</p></div>
                            <div><p className="text-[10px] text-muted-foreground">SL</p><p className="text-xs font-bold text-destructive">₹{Number(post.stop_loss || 0).toLocaleString("en-IN")}</p></div>
                          </div>
                          {post.notes && <p className="mt-2 text-xs italic text-muted-foreground">{post.notes}</p>}
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{post.message_text}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
