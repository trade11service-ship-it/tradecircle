import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Bell, User, ArrowRight, Compass, Clock3, BookOpenText, Shield, Globe } from "lucide-react";
import { setMetaTags, SEO_CONFIG } from "@/lib/seo";
import { DashboardHero } from "@/components/DashboardHero";

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
  const [publicSignals, setPublicSignals] = useState<any[]>([]);
  const [featuredAdvisors, setFeaturedAdvisors] = useState<any[]>([]);
  const [subscribedGroups, setSubscribedGroups] = useState<any[]>([]);

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
      // Fetch public signals instead
      const { data: pubSigs } = await supabase
        .from('signals')
        .select('*, advisors!inner(full_name, profile_photo_url)')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(10);
      setPublicSignals(pubSigs || []);
      
      const { data: advs } = await supabase
        .from('advisors')
        .select('id, full_name, profile_photo_url, strategy_type, public_tagline')
        .eq('status', 'approved')
        .eq('is_public_featured', true)
        .limit(4);
      setFeaturedAdvisors(advs || []);
      
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
    setSubscribedGroups(groups || []);
    
    const [{ data: advs }, { data: pubSigs }] = await Promise.all([
      supabase
        .from('advisors')
        .select('id, full_name, profile_photo_url, strategy_type, public_tagline')
        .eq('status', 'approved')
        .eq('is_public_featured', true)
        .limit(4),
      supabase
        .from('signals')
        .select('*, advisors!inner(full_name, profile_photo_url)')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(3),
    ]);
    setFeaturedAdvisors(advs || []);
    setPublicSignals(pubSigs || []);
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
    <div className="min-h-full bg-background p-4 md:p-6 lg:p-8">
      <main className="mx-auto w-full max-w-5xl">
        <DashboardHero
          name={profile?.full_name || "Trader"}
          roleLabel="Trader Account"
          subtitle={hasSubscriptions ? "Your live trading signals from SEBI verified advisors." : "Discover SEBI verified advisors and unlock premium signals."}
          variant="trader"
          stats={[
            { label: "Active Groups", value: subscribedGroups.length },
            { label: "New Signals", value: posts.length },
            { label: "Public Live", value: publicSignals.length },
            { label: "Status", value: hasSubscriptions ? "Live" : "Explore" },
          ]}
          actions={
            <>
              <Link to="/notifications">
                <Button variant="secondary" size="sm" className="gap-1.5 h-9 rounded-full bg-white/15 hover:bg-white/25 text-white border border-white/20 backdrop-blur">
                  <Bell className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/explore">
                <Button size="sm" className="gap-1.5 bg-white text-secondary hover:bg-white/90 h-9 rounded-full font-bold shadow-md">
                  <Compass className="h-4 w-4" /> Explore
                </Button>
              </Link>
            </>
          }
        />

        {/* Main Content */}
        {!hasSubscriptions && loading ? (
          <div className="rounded-2xl border border-border bg-card p-8">
            <div className="py-10 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">Loading your subscriptions...</p>
            </div>
          </div>
        ) : !hasSubscriptions ? (
          <div className="space-y-6">
            {/* PUBLIC SIGNALS */}
            <div>
              <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
                Live Public Feed
              </h2>
              <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
                {publicSignals.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground text-sm">No public signals available right now.</div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {publicSignals.map(sig => (
                      <div key={sig.id} className="rounded-xl border border-border bg-muted/20 p-3 hover:bg-muted/40 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0 border border-primary/20">
                              {sig.advisors?.profile_photo_url ? <img src={sig.advisors.profile_photo_url} className="h-full w-full object-cover" /> : <User className="h-4 w-4 text-primary" />}
                            </div>
                            <div>
                              <span className="text-xs font-bold text-foreground block">{sig.advisors?.full_name}</span>
                              <span className="text-[10px] text-muted-foreground">{new Date(sig.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sig.signal_type === 'BUY' ? 'bg-primary/15 text-primary' : 'bg-destructive/15 text-destructive'}`}>
                            {sig.signal_type}
                          </span>
                        </div>
                        <div className="mb-2">
                          <span className="text-sm font-extrabold text-foreground">{sig.instrument}</span>
                        </div>
                        {sig.entry_price > 0 && (
                          <div className="grid grid-cols-3 gap-2 text-center mt-2">
                            <div className="bg-background rounded-lg border border-border p-1.5">
                              <p className="text-[10px] text-muted-foreground font-semibold">Entry</p>
                              <p className="text-xs font-bold text-foreground">₹{sig.entry_price}</p>
                            </div>
                            <div className="bg-background rounded-lg border border-border p-1.5">
                              <p className="text-[10px] text-muted-foreground font-semibold">Target</p>
                              <p className="text-xs font-bold text-primary">₹{sig.target_price}</p>
                            </div>
                            <div className="bg-background rounded-lg border border-border p-1.5">
                              <p className="text-[10px] text-muted-foreground font-semibold">SL</p>
                              <p className="text-xs font-bold text-destructive">₹{sig.stop_loss}</p>
                            </div>
                          </div>
                        )}
                        {sig.notes && <p className="text-[11px] text-muted-foreground mt-2 line-clamp-2 italic">{sig.notes}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* FEATURED ADVISORS */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-foreground">Featured Advisors</h2>
                <Link to="/discover">
                  <Button variant="ghost" size="sm" className="text-primary gap-1">View All <ArrowRight className="h-4 w-4" /></Button>
                </Link>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {featuredAdvisors.map(adv => (
                  <Link key={adv.id} to={`/advisor/${adv.id}`}>
                    <div className="rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-all hover:shadow-md flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center overflow-hidden shrink-0 text-white font-bold">
                        {adv.profile_photo_url ? <img src={adv.profile_photo_url} className="h-full w-full object-cover" /> : adv.full_name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm font-bold text-foreground truncate">{adv.full_name}</h3>
                          <Shield className="h-3 w-3 text-primary" />
                        </div>
                        <p className="text-xs text-primary font-semibold truncate">{adv.strategy_type || 'Options Specialist'}</p>
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">{adv.public_tagline || 'SEBI Registered Research Analyst'}</p>
                      </div>
                    </div>
                  </Link>
                ))}
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
          <div className="space-y-6">
            {/* MY GROUPS — horizontal scroll */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-foreground">My Groups</h2>
                <Link to="/subscriptions" className="text-xs font-semibold text-primary inline-flex items-center gap-1">
                  Manage <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="-mx-4 px-4 overflow-x-auto">
                <div className="flex gap-2.5 pb-1.5">
                  {subscribedGroups.map(g => (
                    <Link key={g.id} to={`/group/${g.id}`} className="shrink-0 w-[150px] rounded-2xl border border-border bg-card p-3 hover:border-primary/40 hover:shadow-md transition shadow-sm">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-secondary text-white font-bold flex items-center justify-center mb-2">
                        {g.name?.charAt(0)?.toUpperCase() || 'G'}
                      </div>
                      <p className="text-[13px] font-bold text-foreground line-clamp-2 leading-snug">{g.name}</p>
                      <p className="text-[10px] text-primary font-semibold mt-1">Open feed →</p>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* LATEST FROM YOUR GROUPS — top 5 */}
            <div>
              <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
                Latest from your groups
              </h2>
              <div className="space-y-2">
                {posts.length === 0 ? (
                  <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
                    No posts yet. Your advisors will post here soon.
                  </div>
                ) : (
                  posts.slice(0, 5).map(post => {
                    const isSignal = post.post_type === "signal";
                    const isBuy = post.signal_type === "BUY";
                    const advisorName = advisorNames[post.advisor_id] || "Advisor";
                    const groupName = groupNames[post.group_id] || "Group";
                    const advisorPhoto = advisorPhotos[post.advisor_id];
                    return (
                      <Link key={post.id} to={`/group/${post.group_id}`} className="block rounded-xl border border-border bg-card p-3 hover:bg-muted/40 transition-colors">
                        <div className="flex gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 border border-primary/20">
                            {advisorPhoto ? <img src={advisorPhoto} alt="" className="h-full w-full object-cover" /> : <User className="h-4 w-4 text-primary" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-[13px] font-bold text-foreground truncate">{advisorName}</span>
                              <span className="text-[11px] text-muted-foreground truncate">• {groupName}</span>
                              <span className="ml-auto text-[10px] text-muted-foreground inline-flex items-center gap-0.5"><Clock3 className="h-3 w-3" />{post.created_at ? new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                            </div>
                            {isSignal ? (
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[14px] font-extrabold text-foreground">{post.instrument}</span>
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isBuy ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"}`}>{isBuy ? "BUY" : "SELL"}</span>
                                <span className="text-[11px] text-muted-foreground">Entry ₹{Number(post.entry_price||0).toLocaleString("en-IN")} • Tgt ₹{Number(post.target_price||0).toLocaleString("en-IN")} • SL ₹{Number(post.stop_loss||0).toLocaleString("en-IN")}</span>
                              </div>
                            ) : (
                              <p className="text-[13px] text-foreground line-clamp-2">{post.message_text}</p>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>

            {/* MINIMIZED PUBLIC FEED — 3 latest only */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-foreground">Live Public Feed</h2>
                <Link to="/explore" className="text-xs font-semibold text-primary inline-flex items-center gap-1">
                  See more on Explore <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                {publicSignals.slice(0, 3).map(sig => (
                  <Link key={sig.id} to={`/explore`} className="rounded-xl border border-border bg-card p-3 hover:bg-muted/40 transition">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border border-primary/20">
                        {sig.advisors?.profile_photo_url ? <img src={sig.advisors.profile_photo_url} className="h-full w-full object-cover" /> : <User className="h-3.5 w-3.5 text-primary" />}
                      </div>
                      <span className="text-[11px] font-bold text-foreground truncate flex-1">{sig.advisors?.full_name}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${sig.signal_type === 'BUY' ? 'bg-primary/15 text-primary' : 'bg-destructive/15 text-destructive'}`}>{sig.signal_type}</span>
                    </div>
                    <p className="text-[13px] font-extrabold text-foreground truncate">{sig.instrument}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Entry ₹{sig.entry_price} • Tgt ₹{sig.target_price}</p>
                  </Link>
                ))}
                {publicSignals.length === 0 && (
                  <div className="sm:col-span-3 rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">No public signals right now.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
