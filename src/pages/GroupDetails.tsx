import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { GroupFeed } from "@/components/GroupFeed";
import { SubscriptionModal } from "@/components/SubscriptionModal";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, Users, Activity, ArrowLeft } from "lucide-react";
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
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <p className="text-lg font-semibold text-foreground">Group not found</p>
          <Link to="/discover">
            <Button className="mt-4">Back to Discover</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto w-full max-w-4xl px-4 py-6">
        <Link to={`/advisor/${group.advisor_id}`} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Advisor profile
        </Link>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-extrabold text-foreground">{group.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">by {advisorName}</p>
              <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <ShieldCheck className="h-3.5 w-3.5" /> SEBI verified advisor
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-extrabold text-primary">₹{group.monthly_price}</p>
              <p className="text-xs text-muted-foreground">per month</p>
            </div>
          </div>
          {group.description && <p className="mt-4 text-sm text-muted-foreground">{group.description}</p>}

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-muted p-2 text-center">
              <p className="text-xs text-muted-foreground">Members</p>
              <p className="text-base font-bold">{stats.subscriberCount}</p>
            </div>
            <div className="rounded-lg bg-muted p-2 text-center">
              <p className="text-xs text-muted-foreground">Signals</p>
              <p className="text-base font-bold">{stats.signalCount}</p>
            </div>
            <div className="rounded-lg bg-muted p-2 text-center">
              <p className="text-xs text-muted-foreground">Accuracy</p>
              <p className="text-base font-bold">{stats.winRate !== null ? `${stats.winRate}%` : "New"}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => (isSubscribed ? navigate("/dashboard") : setModalOpen(true))}>
              {isSubscribed ? "Open My Feed" : "Subscribe"}
            </Button>
            {!isSubscribed && (
              <Button variant="outline" onClick={() => navigate("/explore")}>
                Follow Public First
              </Button>
            )}
            <Link to="/explore">
              <Button variant="outline" className="gap-1">
                <Activity className="h-4 w-4" /> Public Live Feed
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-card">
          <div className="border-b border-border bg-muted/40 px-3 py-2">
            <h2 className="text-sm font-semibold text-foreground">{group.name} • Live Group Feed</h2>
            <p className="text-[11px] text-muted-foreground">Chat-style stream. Latest posts stay in a fixed screen.</p>
          </div>
          <div className="h-[68vh] min-h-[460px]">
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
      </main>

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
