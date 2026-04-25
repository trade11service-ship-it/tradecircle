import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Bell, User, ArrowRight, Compass, Clock3, BookOpenText } from "lucide-react";
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
  const [hasSubscriptions, setHasSubscriptions] = useState(false);

  // Redirect advisors/admins to their dashboards
  useEffect(() => {
    if (profile?.role === 'advisor') navigate('/advisor/dashboard', { replace: true });
    else if (profile?.role === 'admin') navigate('/admin', { replace: true });
  }, [profile?.role, navigate]);
  const [posts, setPosts] = useState<FeedItem[]>([]);
  const [subscribedGroupIds, setSubscribedGroupIds] = useState<string[]>([]);
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
    setSubscribedGroupIds(groupIds);
    
    // Check if user has any subscriptions
    const hasAnySubscriptions = groupIds.length > 0;
    setHasSubscriptions(hasAnySubscriptions);
    
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

  useEffect(() => {
    if (!user || subscribedGroupIds.length === 0) return;
    const channel = supabase
      .channel(`home-live-feed-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "signals" }, (payload) => {
        const next = payload.new as FeedItem;
        if (!subscribedGroupIds.includes(next.group_id)) return;
        setPosts((prev) => (prev.some((p) => p.id === next.id) ? prev : [next, ...prev]));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, subscribedGroupIds.join(",")]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  }, []);

  return (
    <div className="min-h-screen bg-muted">
      <Navbar />
      <main className="mx-auto w-full max-w-4xl px-4 py-5">
        <div className="mb-6 rounded-2xl border border-border bg-gradient-to-r from-primary/5 to-primary/10 p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex-1">
              <h1 className="text-2xl font-extrabold text-foreground">
                {greeting}, {profile?.full_name?.split(" ")[0] || "Trader"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {hasSubscriptions ? "Your live trading signals from SEBI verified advisors" : "See groups and open one feed to start"}
              </p>
            </div>
            <div className="flex gap-2">
              <Link to="/notifications">
                <Button variant="outline" size="icon" aria-label="Notifications">
                  <Bell className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/explore">
                <Button className="gap-2 bg-primary hover:bg-primary/90 text-white">
                  <Compass className="h-4 w-4" />
                  Explore
                </Button>
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-background/70 p-2 text-center">
              <p className="text-xs text-muted-foreground">Live posts</p>
              <p className="text-base font-bold text-foreground">{posts.length}</p>
            </div>
            <div className="rounded-lg bg-background/70 p-2 text-center">
              <p className="text-xs text-muted-foreground">Subscriptions</p>
              <p className="text-base font-bold text-foreground">{hasSubscriptions ? "Active" : "None"}</p>
            </div>
            <div className="rounded-lg bg-background/70 p-2 text-center">
              <p className="text-xs text-muted-foreground">Learning</p>
              <p className="text-base font-bold text-foreground">On</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        {!hasSubscriptions && loading ? (
          <div className="rounded-2xl border border-border bg-card p-8">
            <div className="py-10 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">Loading your subscriptions...</p>
            </div>
          </div>
        ) : !hasSubscriptions ? (
          <div className="rounded-2xl border-2 border-dashed border-primary/30 bg-card p-8">
            <div className="text-center max-w-md mx-auto">
              <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Compass className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">
                No Active Subscriptions
              </h2>
              <p className="text-muted-foreground mb-6">
                See advisor groups, preview their feed, then subscribe if it fits your style.
              </p>
              <div className="flex flex-col gap-2">
                <Link to="/discover">
                  <Button className="w-full gap-2 bg-primary hover:bg-primary/90 text-white">
                    See Groups <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link to="/listed-advisors">
                  <Button variant="outline" className="w-full gap-2">
                    View Featured Advisors <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        ) : loading ? (
          <div className="rounded-2xl border border-border bg-card p-3">
            <div className="py-10 text-center text-sm text-muted-foreground">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
              Loading your signal feed...
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Subscriptions Summary */}
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-foreground">Your Subscriptions</h2>
                  <p className="text-xs text-muted-foreground mt-1">Active advisor feeds you're subscribed to</p>
                </div>
                <Link to="/subscriptions">
                  <Button variant="outline" size="sm" className="gap-2">
                    Manage <ArrowRight size={14} />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Live Feed Section */}
            <div>
              <h2 className="text-lg font-bold text-foreground mb-3">Live Trading Signals</h2>
              <div className="rounded-2xl border border-border bg-card/50 backdrop-blur-sm p-2">
                {posts.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-sm text-muted-foreground mb-3">
                      No signals yet from your subscribed advisors
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Signals will appear here as soon as your advisors post them
                    </p>
                  </div>
                ) : (
                  <div className="h-[62vh] min-h-[420px] overflow-y-auto space-y-3 p-2">
                    {posts.map((post) => {
                      const isSignal = post.post_type === "signal";
                      const isBuy = post.signal_type === "BUY";
                      const advisorName = advisorNames[post.advisor_id] || "Advisor";
                      const groupName = groupNames[post.group_id] || "Group";
                      const advisorPhoto = advisorPhotos[post.advisor_id];
                      return (
                        <div key={post.id} className="flex gap-3 rounded-xl border border-border bg-card p-3 hover:bg-muted/40 transition-colors">
                          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/20 text-primary-foreground border border-primary/30">
                            {advisorPhoto ? <img src={advisorPhoto} alt="" className="h-full w-full object-cover" /> : <User className="h-5 w-5" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-bold text-primary truncate">{advisorName}</span>
                              <span className="text-xs text-muted-foreground">• {groupName}</span>
                            </div>
                            {isSignal ? (
                              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-base font-extrabold text-foreground">{post.instrument}</p>
                                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${isBuy ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"}`}>
                                    {isBuy ? "BUY" : "SELL"}
                                  </span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-center">
                                  <div className="bg-background/50 rounded p-2">
                                    <p className="text-xs text-muted-foreground">Entry</p>
                                    <p className="text-xs font-bold text-foreground">₹{Number(post.entry_price || 0).toLocaleString("en-IN")}</p>
                                  </div>
                                  <div className="bg-background/50 rounded p-2">
                                    <p className="text-xs text-muted-foreground">Target</p>
                                    <p className="text-xs font-bold text-primary">₹{Number(post.target_price || 0).toLocaleString("en-IN")}</p>
                                  </div>
                                  <div className="bg-background/50 rounded p-2">
                                    <p className="text-xs text-muted-foreground">SL</p>
                                    <p className="text-xs font-bold text-destructive">₹{Number(post.stop_loss || 0).toLocaleString("en-IN")}</p>
                                  </div>
                                </div>
                                {post.notes && <p className="text-xs italic text-muted-foreground mt-1 line-clamp-2">{post.notes}</p>}
                              </div>
                            ) : (
                              <div className="bg-muted/30 rounded-lg p-3">
                                <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                                  <BookOpenText className="h-3 w-3" /> Mentor Note
                                </div>
                                <p className="text-sm text-foreground line-clamp-3">{post.message_text}</p>
                              </div>
                            )}
                            <div className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Clock3 className="h-3.5 w-3.5" />
                              {post.created_at ? new Date(post.created_at).toLocaleString("en-IN") : ""}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
