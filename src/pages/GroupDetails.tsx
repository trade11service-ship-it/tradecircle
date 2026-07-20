import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GroupFeed } from "@/components/GroupFeed";
import { SubscriptionModal } from "@/components/SubscriptionModal";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, Users, Activity, ArrowLeft, CheckCircle2, TrendingUp, AlertCircle, User as UserIcon } from "lucide-react";
import { FollowButton } from "@/components/FollowButton";
import type { Tables } from "@/integrations/supabase/types";

type Group = Tables<"groups">;
type Advisor = Tables<"advisors">;

type AdvisorSignalStats = {
  total_signals?: number;
  win_count?: number;
  resolved_count?: number;
};

export default function GroupDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const goBack = () => {
    // If we have history (came from another in-app page), pop. Otherwise route Home.
    const hasHistory = (location.key && location.key !== "default") || window.history.length > 1;
    if (hasHistory) {
      navigate(-1);
    } else {
      navigate(user ? "/home" : "/");
    }
  };

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

  // (removed previous resize-dispatch hack — strict flex layout makes it unnecessary)


  const fetchGroup = async () => {
    if (!id) return;
    setLoading(true);

    // 1) Fetch the group by itself (public RLS = true). This must not depend on advisor visibility.
    const { data: grp, error: grpErr } = await supabase
      .from("groups")
      .select("*")
      .eq("id", id)
      .eq("is_active", true)
      .maybeSingle();

    if (grpErr) console.error("[GroupDetails] group fetch error:", grpErr);

    if (!grp) {
      setGroup(null);
      setLoading(false);
      return;
    }

    // 2) Fetch advisor separately (best-effort — never block the group page if this fails).
    const { data: adv, error: advErr } = await supabase
      .from("advisors")
      .select("id, user_id, full_name, sebi_reg_no, bio, strategy_type, status, profile_photo_url, cover_image_url, public_tagline, public_description, public_years_experience, risk_level, preferred_trading_hours")
      .eq("id", grp.advisor_id)
      .maybeSingle();
    if (advErr) console.error("[GroupDetails] advisor fetch error:", advErr);

    const advisor = (adv as Advisor | null) || undefined;
    const normalized = { ...(grp as Group), advisor };
    setGroup(normalized);

    const [subCountRes, statsRes] = await Promise.all([
      supabase.rpc("get_advisor_subscriber_count", { _advisor_id: normalized.advisor_id }),
      supabase.rpc("get_advisor_signal_stats", { _advisor_id: normalized.advisor_id }),
    ]);

    const stat = (statsRes.data as AdvisorSignalStats | null) || { total_signals: 0, win_count: 0, resolved_count: 0 };
    const resolvedCount = stat.resolved_count || 0;
    const winRate = resolvedCount > 0 ? Math.round(((stat.win_count || 0) / resolvedCount) * 100) : null;
    setStats({
      subscriberCount: (subCountRes.data as number) || 0,
      signalCount: stat.total_signals || 0,
      winRate,
    });

    if (user) {
      // Owner advisor always has full access to their own group
      if (advisor && advisor.user_id === user.id) {
        setIsSubscribed(true);
      } else {
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
      }
    } else {
      setIsSubscribed(false);
    }

    setLoading(false);
  };

  const handleSubscribe = async (data: { panNumber: string; riskConsentText: string; dataConsentText: string; consentVersion: string }) => {
    if (!group) return;
    if (!user) {
      navigate("/login");
      return;
    }

    setSubscribing(true);
    try {
      sessionStorage.setItem("subscription_pan", data.panNumber);
      sessionStorage.setItem("subscription_consent", "true");
      sessionStorage.setItem("subscription_consent_timestamp", new Date().toISOString());
      sessionStorage.setItem("subscription_consent_version", data.consentVersion);
      sessionStorage.setItem("subscription_risk_text", data.riskConsentText);
      sessionStorage.setItem("subscription_data_text", data.dataConsentText);

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
    <div className="w-full h-full min-h-0 bg-background flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col min-h-0 h-full overflow-hidden">

        {/* Unified Header (desktop + mobile). Compact on mobile; rich on desktop. */}
        <div className="shrink-0 bg-card border-b border-border z-20 relative">
          {/* Cover strip — desktop only */}
          <div className="hidden md:block relative h-28 lg:h-36 w-full overflow-hidden bg-gradient-to-r from-primary/15 via-primary/5 to-secondary/15">
            {group.advisor?.cover_image_url && (
              <img src={group.advisor.cover_image_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-card"></div>
          </div>

          {/* Mobile compact chat-style header */}
          <div className="md:hidden flex items-center gap-2 px-3 py-2">
            <button
              onClick={goBack}
              aria-label="Back"
              className="p-1.5 -ml-1 text-muted-foreground hover:bg-muted rounded-full transition-colors shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <Link
              to={`/advisor/${group.advisor_id}`}
              className="h-10 w-10 rounded-full border border-border overflow-hidden bg-primary/10 flex shrink-0 items-center justify-center text-primary font-bold shadow-sm"
            >
              {group.dp_url ? (
                <img src={group.dp_url} alt={group.name} className="h-full w-full object-cover" />
              ) : group.advisor?.profile_photo_url ? (
                <img src={group.advisor.profile_photo_url} alt={advisorName} className="h-full w-full object-cover" />
              ) : advisorName.charAt(0)}
            </Link>
            <Link to={`/advisor/${group.advisor_id}`} className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <h2 className="text-[15px] font-bold text-foreground truncate leading-tight">{group.name}</h2>
                <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
              </div>
              <div className="text-[11px] text-muted-foreground font-medium truncate">
                {advisorName} • 📊 {stats.signalCount} • ✅ {stats.winRate !== null ? `${stats.winRate}%` : '—'}
              </div>
            </Link>
            <FollowButton groupId={group.id} size="sm" />
          </div>

          {/* Desktop rich header row */}
          <div className="hidden md:flex items-end gap-5 px-6 lg:px-8 pb-5 -mt-12 lg:-mt-14 relative">
            <div className="h-24 w-24 lg:h-28 lg:w-28 rounded-2xl border-4 border-card shadow-xl overflow-hidden bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-3xl font-bold shrink-0">
              {group.dp_url ? (
                <img src={group.dp_url} alt={group.name} className="h-full w-full object-cover" />
              ) : group.advisor?.profile_photo_url ? (
                <img src={group.advisor.profile_photo_url} alt={advisorName} className="h-full w-full object-cover" />
              ) : advisorName.charAt(0)}
            </div>
            <div className="min-w-0 flex-1 pb-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight truncate">{group.name}</h1>
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
              </div>
              <Link to={`/advisor/${group.advisor_id}`} className="inline-flex items-center gap-1.5 mt-1 text-sm font-semibold text-muted-foreground hover:text-primary transition">
                <UserIcon className="h-3.5 w-3.5" /> {advisorName}
              </Link>
              {group.advisor?.sebi_reg_no && (
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary border border-primary/20">
                  <ShieldCheck className="h-3 w-3" /> SEBI: {group.advisor.sebi_reg_no}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 pb-1 shrink-0">
              <div className="hidden lg:flex items-center gap-4 mr-2 pr-4 border-r border-border">
                <div className="text-center">
                  <div className="flex items-center gap-1 text-foreground font-bold text-base leading-none"><Users className="h-3.5 w-3.5 text-muted-foreground" />{stats.subscriberCount}</div>
                  <div className="text-[10px] uppercase font-bold text-muted-foreground mt-1">Members</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center gap-1 text-foreground font-bold text-base leading-none"><Activity className="h-3.5 w-3.5 text-muted-foreground" />{stats.signalCount}</div>
                  <div className="text-[10px] uppercase font-bold text-muted-foreground mt-1">Signals</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center gap-1 text-primary font-bold text-base leading-none"><TrendingUp className="h-3.5 w-3.5" />{stats.winRate !== null ? `${stats.winRate}%` : '—'}</div>
                  <div className="text-[10px] uppercase font-bold text-primary mt-1">Accuracy</div>
                </div>
              </div>
              <FollowButton groupId={group.id} size="md" />
              <Link to={`/advisor/${group.advisor_id}`}>
                <Button variant="outline" size="sm" className="rounded-full h-9 font-bold">
                  <UserIcon className="h-4 w-4 mr-1" /> Profile
                </Button>
              </Link>
              {!isSubscribed ? (
                <Button size="sm" className="rounded-full h-9 px-5 font-bold shadow-md" onClick={() => setModalOpen(true)}>
                  Subscribe ₹{group.monthly_price}/mo
                </Button>
              ) : (
                <div className="flex items-center gap-1 text-xs font-bold text-primary bg-primary/10 px-3 h-9 rounded-full">
                  <CheckCircle2 className="h-4 w-4" /> Subscribed
                </div>
              )}
            </div>
          </div>

          {/* Description strip (desktop) */}
          {group.description && (
            <div className="hidden md:block px-6 lg:px-8 pb-4 -mt-1">
              <p className="text-sm text-muted-foreground max-w-4xl line-clamp-2">{group.description}</p>
            </div>
          )}
        </div>

        {/* Feed area — only scrollable region */}
        <div className="flex-1 min-h-0 relative bg-muted/40 overflow-hidden">
          <div className="absolute inset-0 opacity-[0.25] dark:opacity-[0.05] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M54.627 0l.83.83v58.34h-58.34l-.83-.83L0 54.628l54.627-54.627zM58.34 0v58.34L0 0h58.34zM0 58.34h58.34v.83l-58.34-.83v-.83zM0 0v.83L.83 0H0z' fill='%23000000' fill-opacity='0.05' fill-rule='evenodd'/%3E%3C/svg%3E")` }}></div>
          <div className="relative z-10 h-full">
            <GroupFeed
              groupId={group.id}
              advisorId={group.advisor_id}
              advisorName={advisorName}
              advisorPhoto={group.advisor?.profile_photo_url || undefined}
              isSubscribed={isSubscribed}
              isOwner={!!user && group.advisor?.user_id === user.id}
              onSubscribe={() => setModalOpen(true)}
              subscribePrice={group.monthly_price}
            />
          </div>
        </div>

        {/* Mobile bottom Subscribe CTA */}
        {!isSubscribed && (
          <div className="md:hidden shrink-0 z-30 bg-card border-t border-border shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.18)] relative" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
            <div className="flex items-center gap-3 p-3">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Monthly</span>
                <span className="text-lg font-extrabold text-foreground leading-none">₹{group.monthly_price}</span>
              </div>
              <Button
                size="lg"
                className="flex-1 h-12 rounded-xl text-[15px] font-bold shadow-md"
                onClick={() => setModalOpen(true)}
                disabled={subscribing}
              >
                {subscribing ? 'Processing…' : 'Subscribe Now'}
              </Button>
            </div>
          </div>
        )}
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
