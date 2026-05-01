import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GroupFeed } from "@/components/GroupFeed";
import { SubscriptionModal } from "@/components/SubscriptionModal";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, Users, Activity, ArrowLeft, CheckCircle2, TrendingUp, BellRing, Lock, AlertCircle } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Group = Tables<"groups">;
type Advisor = Tables<"advisors">;

export default function GroupDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [group, setGroup] = useState<(Group & { advisor?: Advisor }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [stats, setStats] = useState({ subscriberCount: 0, signalCount: 0, winRate: null as number | null });
  const [modalOpen, setModalOpen] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchGroup();
  }, [id, user?.id]);

  const fetchGroup = async () => {
    if (!id) return;
    setLoading(true);
    const { data: grp } = await supabase
      .from("groups")
      .select("*, advisors!inner(*)")
      .eq("id", id)
      .eq("is_active", true)
      .maybeSingle();

    if (!grp) {
      setGroup(null);
      setLoading(false);
      return;
    }

    const advisor = (grp as any).advisors as Advisor;
    const normalized = { ...(grp as Group), advisor };
    setGroup(normalized);

    const [subCountRes, statsRes] = await Promise.all([
      supabase.rpc("get_advisor_subscriber_count", { _advisor_id: normalized.advisor_id }),
      supabase.rpc("get_advisor_signal_stats", { _advisor_id: normalized.advisor_id }),
    ]);

    const stat = (statsRes.data as any) || { total_signals: 0, win_count: 0, resolved_count: 0 };
    const winRate = stat.resolved_count > 0 ? Math.round((stat.win_count / stat.resolved_count) * 100) : null;
    setStats({
      subscriberCount: (subCountRes.data as number) || 0,
      signalCount: stat.total_signals || 0,
      winRate,
    });

    if (user) {
      const now = new Date().toISOString();
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("user_id", user.id)
        .eq("group_id", id)
        .eq("status", "active")
        .gte("end_date", now)
        .maybeSingle();
      setIsSubscribed(!!sub);
    } else {
      setIsSubscribed(false);
    }

    setLoading(false);
  };

  const handleSubscribe = async (panNumber: string) => {
    if (!group) return;
    if (!user) {
      navigate("/login");
      return;
    }

    setSubscribing(true);
    try {
      sessionStorage.setItem("subscription_pan", panNumber);
      sessionStorage.setItem("subscription_consent", "true");
      sessionStorage.setItem("subscription_consent_timestamp", new Date().toISOString());

      const { data: session } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/initiate-payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.session?.access_token}`,
        },
        body: JSON.stringify({ group_id: group.id, origin_url: window.location.origin }),
      });
      const result = await res.json();
      if (!res.ok || !result.payment_url) {
        throw new Error(result.error || "Failed to start payment");
      }
      window.location.href = result.payment_url;
    } finally {
      setSubscribing(false);
    }
  };

  const advisorName = useMemo(() => group?.advisor?.full_name || "Advisor", [group]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent shadow-lg" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 text-center h-full">
        <AlertCircle className="h-16 w-16 text-muted-foreground mb-4 opacity-20" />
        <h2 className="text-2xl font-bold text-foreground mb-2">Group not found</h2>
        <p className="text-muted-foreground mb-6">The channel you are looking for does not exist or has been removed.</p>
        <Link to="/discover">
          <Button size="lg" className="rounded-full px-8">Browse Active Channels</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-10 bg-background flex flex-col overflow-hidden">
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar (Desktop Only) */}
        <div className="hidden md:flex w-[380px] lg:w-[420px] flex-col border-r border-border bg-card shadow-sm z-10 overflow-y-auto">
          {/* Back link */}
          <div className="p-4 border-b border-border/50">
            <Link to={`/advisor/${group.advisor_id}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back to Advisor Profile
            </Link>
          </div>

          {/* Advisor & Group Identity */}
          <div className="p-6 text-center border-b border-border/50 bg-muted/10 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-primary/10 to-transparent"></div>
            
            <div className="relative inline-block mb-4 mt-2">
              <div className="h-24 w-24 rounded-full border-4 border-background shadow-xl overflow-hidden bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-3xl font-bold">
                {group.advisor?.profile_photo_url ? (
                  <img src={group.advisor.profile_photo_url} alt={advisorName} className="h-full w-full object-cover" />
                ) : (
                  advisorName.charAt(0)
                )}
              </div>
              <div className="absolute bottom-0 right-0 bg-primary rounded-full p-1.5 border-4 border-background shadow-sm">
                <CheckCircle2 className="h-5 w-5 text-white" />
              </div>
            </div>
            
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight leading-tight mb-1">{group.name}</h1>
            <p className="text-sm font-medium text-muted-foreground mb-3">by {advisorName}</p>
            
            <div className="inline-flex items-center justify-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary border border-primary/20">
              <ShieldCheck className="h-3.5 w-3.5" /> SEBI Registered: {group.advisor?.sebi_reg_no}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="p-6 border-b border-border/50">
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col items-center justify-center rounded-2xl bg-muted/50 p-3 border border-border/50">
                <Users className="h-5 w-5 text-muted-foreground mb-1" />
                <span className="text-xl font-bold text-foreground">{stats.subscriberCount}</span>
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Members</span>
              </div>
              <div className="flex flex-col items-center justify-center rounded-2xl bg-muted/50 p-3 border border-border/50">
                <Activity className="h-5 w-5 text-muted-foreground mb-1" />
                <span className="text-xl font-bold text-foreground">{stats.signalCount}</span>
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Signals</span>
              </div>
              <div className="flex flex-col items-center justify-center rounded-2xl bg-primary/5 p-3 border border-primary/20">
                <TrendingUp className="h-5 w-5 text-primary mb-1" />
                <span className="text-xl font-bold text-primary">{stats.winRate !== null ? `${stats.winRate}%` : "—"}</span>
                <span className="text-[10px] uppercase font-bold text-primary">Accuracy</span>
              </div>
            </div>
          </div>

          {/* Description */}
          {group.description && (
            <div className="p-6 border-b border-border/50">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">About Channel</h3>
              <p className="text-sm text-foreground/80 leading-relaxed">{group.description}</p>
            </div>
          )}

          {/* Subscribe CTA Area */}
          <div className="p-6 mt-auto">
            {!isSubscribed ? (
              <div className="rounded-3xl border-2 border-primary/20 bg-card p-1 shadow-[0_0_40px_-10px_rgba(13,159,110,0.2)] overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary animate-pulse"></div>
                <div className="p-5 text-center">
                  <div className="flex items-center justify-center gap-2 text-xs font-bold text-destructive mb-3">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
                    </span>
                    HIGH DEMAND • SECURE YOUR SPOT
                  </div>
                  
                  <div className="flex items-end justify-center gap-1 mb-4">
                    <span className="text-4xl font-extrabold tracking-tighter text-foreground">₹{group.monthly_price}</span>
                    <span className="text-sm font-medium text-muted-foreground mb-1">/ month</span>
                  </div>
                  
                  <ul className="text-left space-y-2 mb-6">
                    <li className="flex items-start gap-2 text-sm text-foreground/80">
                      <BellRing className="h-4 w-4 text-primary shrink-0 mt-0.5" /> <span>Instant trade notifications</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-foreground/80">
                      <Lock className="h-4 w-4 text-primary shrink-0 mt-0.5" /> <span>Tamper-proof SEBI verified signals</span>
                    </li>
                  </ul>
                  
                  <Button 
                    size="lg" 
                    className="w-full h-14 rounded-xl text-lg font-bold shadow-lg hover:shadow-xl transition-all"
                    onClick={() => setModalOpen(true)}
                  >
                    Subscribe Now
                  </Button>
                  <p className="text-[10px] text-muted-foreground mt-3 uppercase tracking-wider font-semibold">Cancel anytime • No lock-in</p>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center">
                <CheckCircle2 className="h-10 w-10 text-primary mx-auto mb-2" />
                <h3 className="text-lg font-bold text-foreground">You are subscribed</h3>
                <p className="text-sm text-muted-foreground mt-1">You have full access to this channel's live feed.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Area - Chat Interface */}
        <div className="flex-1 flex flex-col relative bg-[#EBE5DE] dark:bg-[#0B141A]">
          {/* Telegram/WhatsApp style Chat Background Pattern */}
          <div className="absolute inset-0 opacity-[0.4] dark:opacity-[0.05] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M54.627 0l.83.83v58.34h-58.34l-.83-.83L0 54.628l54.627-54.627zM58.34 0v58.34L0 0h58.34zM0 58.34h58.34v.83l-58.34-.83v-.83zM0 0v.83L.83 0H0z' fill='%23000000' fill-opacity='0.05' fill-rule='evenodd'/%3E%3C/svg%3E")` }}></div>

          {/* Chat Header (Sticky top for stability) */}
          <div className="flex items-center justify-between px-3 py-2.5 bg-card border-b border-border shadow-[0_2px_10px_rgba(0,0,0,0.05)] z-20 shrink-0 sticky top-0">
            <div className="flex items-center gap-2">
              <Link to={`/advisor/${group.advisor_id}`} className="md:hidden p-1.5 -ml-1 text-muted-foreground hover:bg-muted rounded-full transition-colors">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              
              <div className="h-10 w-10 rounded-full border border-border overflow-hidden bg-primary/10 flex shrink-0 items-center justify-center text-primary font-bold shadow-sm">
                {group.advisor?.profile_photo_url ? (
                  <img src={group.advisor.profile_photo_url} alt={advisorName} className="h-full w-full object-cover" />
                ) : (
                  advisorName.charAt(0)
                )}
              </div>
              
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <h2 className="text-[15px] font-bold text-foreground truncate leading-tight">{group.name}</h2>
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                </div>
                <p className="text-[12px] text-muted-foreground truncate font-medium">{stats.subscriberCount} members • SEBI Verified</p>
              </div>
            </div>

            {/* Header Subscribe Button */}
            <div className="flex items-center gap-2">
              {!isSubscribed && (
                <Button size="sm" className="rounded-full px-4 h-8 text-xs font-bold shadow-md hover:shadow-lg transition-all" onClick={() => setModalOpen(true)}>
                  Subscribe
                </Button>
              )}
              {isSubscribed && (
                <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-full">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Subscribed
                </div>
              )}
            </div>
          </div>

          {/* The Actual Feed */}
          <div className="flex-1 overflow-hidden relative">
            <GroupFeed
              groupId={group.id}
              advisorName={advisorName}
              advisorPhoto={group.advisor?.profile_photo_url || undefined}
              isSubscribed={isSubscribed}
              onSubscribe={() => setModalOpen(true)}
              subscribePrice={group.monthly_price}
            />
          </div>
        </div>
      </div>

      <SubscriptionModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        group={group}
        advisorName={advisorName}
        onConfirm={handleSubscribe}
        isLoading={subscribing}
      />
    </div>
  );
}
