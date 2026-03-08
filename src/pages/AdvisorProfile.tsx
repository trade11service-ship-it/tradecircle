import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { SignalCard } from '@/components/SignalCard';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { Shield, Users, Heart, Share2, Bell, BarChart2, Lock, CheckCircle } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import { SUBSCRIPTION_RISK_TEXT, getDeviceInfo, getIpAddress } from '@/lib/legalTexts';
import { useFollow } from '@/hooks/useFollow';

type Advisor = Tables<'advisors'>;
type Group = Tables<'groups'>;
type Signal = Tables<'signals'>;

function FollowButton({ groupId }: { groupId: string }) {
  const { following, loading, toggleFollow } = useFollow(groupId);
  if (loading) return null;
  return (
    <button
      onClick={toggleFollow}
      className={`flex h-10 flex-1 items-center justify-center gap-2 rounded-[10px] border-[1.5px] text-[13px] font-semibold transition-all ${
        following
          ? 'border-[hsl(0,60%,80%)] bg-[hsl(0,100%,97%)] text-[hsl(0,60%,45%)]'
          : 'border-border bg-card text-muted-foreground'
      }`}
    >
      <Heart className={`h-3.5 w-3.5 ${following ? 'fill-current' : ''}`} />
      {following ? 'Following' : 'Follow'}
    </button>
  );
}

function ShareButton() {
  const handleShare = async () => {
    try {
      await navigator.share({ url: window.location.href, title: document.title });
    } catch {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied!');
    }
  };
  return (
    <button
      onClick={handleShare}
      className="flex h-10 w-10 min-w-[40px] items-center justify-center rounded-[10px] border-[1.5px] border-border bg-card text-muted-foreground transition-colors hover:bg-muted"
    >
      <Share2 className="h-4 w-4" />
    </button>
  );
}

export default function AdvisorProfile() {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [advisor, setAdvisor] = useState<Advisor | null>(null);
  const [groups, setGroups] = useState<(Group & { subCount: number })[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [todaySignals, setTodaySignals] = useState<Signal[]>([]);
  const [subscribedGroupIds, setSubscribedGroupIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [signalTab, setSignalTab] = useState<'all' | 'past' | 'today'>('all');
  const [riskAlreadyAccepted, setRiskAlreadyAccepted] = useState(false);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [signalStats, setSignalStats] = useState<{ total_signals: number; win_count: number; loss_count: number; resolved_count: number }>({ total_signals: 0, win_count: 0, loss_count: 0, resolved_count: 0 });
  const [totalSubs, setTotalSubs] = useState(0);

  useEffect(() => { if (id) fetchData(); }, [id, user]);

  const fetchData = async () => {
    const { data: adv } = await supabase.from('advisors').select('id, full_name, email, phone, bio, sebi_reg_no, strategy_type, profile_photo_url, status, created_at, user_id').eq('id', id!).single();
    setAdvisor(adv);

    const { data: grps } = await supabase.from('groups').select('*').eq('advisor_id', id!).eq('is_active', true);
    if (grps) {
      const withSubs = await Promise.all(grps.map(async g => {
        const { count } = await supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('group_id', g.id).eq('status', 'active');
        return { ...g, subCount: count || 0 };
      }));
      setGroups(withSubs);
      setTotalSubs(withSubs.reduce((sum, g) => sum + g.subCount, 0));
    }

    const [{ data: statsData }, { data: subCountData }] = await Promise.all([
      supabase.rpc('get_advisor_signal_stats', { _advisor_id: id! }),
      supabase.rpc('get_advisor_subscriber_count', { _advisor_id: id! }),
    ]);
    if (statsData) setSignalStats(statsData as any);
    if (subCountData) setTotalSubs(subCountData as number);

    const { data: pastSigs } = await supabase.from('signals').select('*').eq('advisor_id', id!).lt('signal_date', new Date().toISOString().split('T')[0]).order('signal_date', { ascending: false }).limit(20);
    setSignals(pastSigs || []);
    const today = new Date().toISOString().split('T')[0];
    const { data: todaySigs } = await supabase.from('signals').select('*').eq('advisor_id', id!).eq('signal_date', today).order('created_at', { ascending: false });
    setTodaySignals(todaySigs || []);

    if (user) {
      const { data: subs } = await supabase.from('subscriptions').select('group_id').eq('user_id', user.id).eq('status', 'active');
      const subIds = (subs || []).map(s => s.group_id);
      if (adv && adv.user_id === user.id) {
        const allGroupIds = (grps || []).map(g => g.id);
        setSubscribedGroupIds([...new Set([...subIds, ...allGroupIds])]);
      } else {
        setSubscribedGroupIds(subIds);
      }
      const { data: acceptance } = await supabase
        .from('user_legal_acceptances').select('id')
        .eq('user_id', user.id).eq('acceptance_type', 'subscription_risk').limit(1);
      if (acceptance && acceptance.length > 0) setRiskAlreadyAccepted(true);
    }
    setLoading(false);
  };

  const handleSubscribe = async (group: Group) => {
    if (!user) { navigate('/login'); return; }
    setSubscribing(group.id);
    try {
      if (!riskAlreadyAccepted) {
        const ip = await getIpAddress();
        await supabase.from('user_legal_acceptances').insert({
          user_id: user.id, full_name: profile?.full_name || '',
          email: profile?.email || user.email || '', acceptance_type: 'subscription_risk',
          checkbox_text: SUBSCRIPTION_RISK_TEXT, accepted: true, ip_address: ip,
          user_agent: navigator.userAgent, device_info: getDeviceInfo(), page_url: window.location.href,
        });
        setRiskAlreadyAccepted(true);
      }
      const { data: session } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/initiate-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.session?.access_token}` },
        body: JSON.stringify({ group_id: group.id, origin_url: window.location.origin }),
      });
      const result = await res.json();
      if (res.ok && result.payment_url) window.location.href = result.payment_url;
      else toast.error(result.error || 'Failed to initiate payment');
    } catch { toast.error('Payment initiation failed'); }
    finally { setSubscribing(null); }
  };

  if (loading) return (
    <div className="min-h-screen bg-muted">
      <Navbar />
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    </div>
  );

  if (!advisor) return (
    <div className="min-h-screen bg-muted">
      <Navbar />
      <div className="py-20 text-center text-muted-foreground">Advisor not found</div>
    </div>
  );

  const isOwner = user && advisor && advisor.user_id === user.id;
  const isSubscribedToAny = groups.some(g => subscribedGroupIds.includes(g.id));
  const firstGroupId = groups[0]?.id || '';

  const winRate = signalStats.resolved_count > 0
    ? Math.round((signalStats.win_count / signalStats.resolved_count) * 100)
    : null;

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

  return (
    <div className="min-h-screen flex flex-col bg-muted">
      <Navbar />

      {/* SECTION 1: Profile Hero Card */}
      <section className="bg-card rounded-b-3xl shadow-[0_4px_20px_rgba(0,0,0,0.06)] mb-4">
        {/* Gradient strip */}
        <div className="h-20 bg-gradient-to-br from-secondary to-primary" />

        <div className="px-5 pb-7">
          {/* Avatar */}
          <div className="relative -mt-8 w-[72px]">
            <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full border-[3px] border-card bg-gradient-to-br from-primary to-secondary text-[28px] font-extrabold text-primary-foreground shadow-[0_4px_12px_rgba(0,0,0,0.15)] overflow-hidden">
              {advisor.profile_photo_url ? (
                <img src={advisor.profile_photo_url} alt={advisor.full_name} className="h-full w-full object-cover" />
              ) : (
                advisor.full_name.charAt(0).toUpperCase()
              )}
            </div>
            {/* Verified badge */}
            <div className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-card bg-primary">
              <CheckCircle className="h-2.5 w-2.5 text-primary-foreground" />
            </div>
          </div>

          {/* Name */}
          <h1 className="mt-2.5 text-[22px] font-extrabold text-foreground capitalize">
            {advisor.full_name}
          </h1>

          {/* Badges */}
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-primary bg-light-green px-3 py-1 text-[11px] font-bold text-primary">
              <Shield className="h-3 w-3" /> SEBI {advisor.sebi_reg_no.length > 12 ? advisor.sebi_reg_no.slice(0, 8) + '…' : advisor.sebi_reg_no}
            </span>
            {advisor.strategy_type && (
              <span className="inline-flex rounded-full border border-secondary bg-light-blue px-3 py-1 text-[11px] font-semibold text-secondary">
                {advisor.strategy_type}
              </span>
            )}
          </div>

          {/* Stats Row */}
          <div className="mt-4 grid grid-cols-4 gap-0 rounded-xl bg-muted p-3.5">
            {[
              { value: winRate !== null ? `${winRate}%` : '—', label: 'Win Rate', color: 'text-primary' },
              { value: signalStats.total_signals, label: 'Signals', color: 'text-foreground' },
              { value: totalSubs, label: 'Members', color: 'text-secondary' },
              { value: '—', label: 'Rating', color: 'text-[hsl(var(--warning))]' },
            ].map((stat, i) => (
              <div key={i} className={`text-center ${i > 0 ? 'border-l border-border' : ''}`}>
                <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-[10px] text-[hsl(var(--small-text))]">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Bio */}
          {advisor.bio && (
            <div className="mt-3.5">
              <p className={`text-[13px] text-muted-foreground leading-relaxed ${!bioExpanded ? 'line-clamp-3' : ''}`}>
                {advisor.bio}
              </p>
              {advisor.bio.length > 120 && (
                <button onClick={() => setBioExpanded(!bioExpanded)} className="mt-1 text-xs font-semibold text-secondary">
                  {bioExpanded ? 'Show less' : 'Read more'}
                </button>
              )}
            </div>
          )}

          {/* Follow + Share */}
          {!isOwner && (
            <div className="mt-3.5 flex items-center gap-2.5">
              <FollowButton groupId={firstGroupId} />
              <ShareButton />
            </div>
          )}
        </div>
      </section>

      {/* SECTION 2: Available Groups */}
      <section className="px-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[17px] font-extrabold text-foreground">Subscribe to a Group</h2>
          <span className="rounded-full bg-light-green px-2.5 py-0.5 text-xs font-bold text-primary">
            {groups.length} available
          </span>
        </div>

        {groups.length === 0 && (
          <div className="rounded-2xl border-[1.5px] border-dashed border-border bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">This advisor hasn't created any signal groups yet.</p>
          </div>
        )}

        {groups.map(group => (
          <div key={group.id} className="mb-3 overflow-hidden rounded-2xl border-[1.5px] border-border bg-card shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            {/* Top gradient bar */}
            <div className="h-[3px] bg-gradient-to-r from-primary to-secondary" />

            <div className="p-4">
              {/* Row 1: Identity + Price */}
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 min-w-[44px] items-center justify-center rounded-[10px] bg-gradient-to-br from-light-green to-light-blue overflow-hidden">
                  {group.dp_url ? (
                    <img src={group.dp_url} alt={group.name} className="h-full w-full object-cover" />
                  ) : (
                    <Users className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-bold text-foreground truncate">{group.name}</p>
                  <p className="flex items-center gap-1 text-[11px] text-[hsl(var(--small-text))]">
                    <Users className="h-2.5 w-2.5" /> {group.subCount} members
                  </p>
                </div>
                <span className="rounded-lg border border-[hsl(120,30%,75%)] bg-[hsl(120,60%,97%)] px-2.5 py-1 text-sm font-extrabold text-primary">
                  ₹{group.monthly_price}/mo
                </span>
              </div>

              {/* Row 2: Description */}
              {group.description && (
                <p className="mt-2.5 text-[13px] text-muted-foreground leading-normal line-clamp-2">
                  {group.description}
                </p>
              )}

              {/* Row 3: Feature tags */}
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  { icon: Bell, text: 'Telegram alerts' },
                  { icon: BarChart2, text: 'Signal history' },
                  { icon: Lock, text: 'Cancel anytime' },
                ].map((tag, i) => (
                  <span key={i} className="inline-flex items-center gap-1 rounded-md bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
                    <tag.icon className="h-3 w-3" /> {tag.text}
                  </span>
                ))}
              </div>

              {/* Row 4: Subscribe button */}
              {subscribedGroupIds.includes(group.id) ? (
                <div className="mt-3.5 flex h-[50px] items-center justify-center rounded-xl bg-light-green text-base font-bold text-primary">
                  {isOwner ? '👤 Your Group' : '✓ Subscribed'}
                </div>
              ) : (
                <>
                  <button
                    onClick={() => handleSubscribe(group)}
                    disabled={subscribing === group.id}
                    className="mt-3.5 flex h-[50px] w-full items-center justify-center rounded-xl bg-primary text-base font-bold text-primary-foreground shadow-[0_4px_14px_hsl(var(--primary)/0.25)] transition-all active:scale-[0.98] active:shadow-none disabled:opacity-60"
                  >
                    {subscribing === group.id ? 'Processing...' : `Subscribe — ₹${group.monthly_price}/month`}
                  </button>
                  <p className="mt-1.5 text-center text-[11px] text-[hsl(var(--small-text))]">
                    ✓ Cancel anytime  ·  ✓ Signals on Telegram
                  </p>
                </>
              )}
            </div>
          </div>
        ))}
      </section>

      {/* SECTION 3: Signal History */}
      <section className="px-4 mb-4 flex-1">
        <h2 className="text-[17px] font-extrabold text-foreground mb-3">Signal History</h2>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-4">
          {[
            { key: 'all' as const, label: 'All' },
            { key: 'past' as const, label: 'Past' },
            { key: 'today' as const, label: 'Today' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setSignalTab(t.key)}
              className={`rounded-full px-[18px] py-[7px] text-[13px] font-semibold transition-colors ${
                signalTab === t.key
                  ? 'bg-foreground text-background'
                  : 'border-[1.5px] border-border bg-card text-muted-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Today's signals */}
        {(signalTab === 'today' || signalTab === 'all') && (
          <div className="mb-4">
            {signalTab === 'all' && <h3 className="text-sm font-bold text-foreground mb-2">Today's Signals</h3>}
            {!user || !isSubscribedToAny ? (
              <div className="relative overflow-hidden rounded-2xl border-[1.5px] border-border bg-card">
                {/* Blurred fake signals */}
                <div className="pointer-events-none blur-[6px] p-4 space-y-3">
                  <div className="flex items-center gap-3"><div className="h-4 w-24 rounded bg-muted" /><div className="h-4 w-16 rounded bg-muted" /></div>
                  <div className="flex items-center gap-3"><div className="h-4 w-20 rounded bg-muted" /><div className="h-4 w-12 rounded bg-muted" /></div>
                  <div className="flex items-center gap-3"><div className="h-4 w-28 rounded bg-muted" /><div className="h-4 w-14 rounded bg-muted" /></div>
                </div>
                {/* Lock overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/85 backdrop-blur-[2px] px-5 py-7">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-border bg-muted">
                    <Lock className="h-[22px] w-[22px] text-primary" />
                  </div>
                  <p className="mt-3 text-base font-bold text-foreground">Today's Signals are Live</p>
                  <p className="mt-1 text-center text-[13px] text-muted-foreground">Subscribe to get real-time access to every signal</p>
                  <button
                    onClick={() => {
                      if (groups[0]) handleSubscribe(groups[0]);
                      else navigate('/login');
                    }}
                    className="mt-4 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground"
                  >
                    Subscribe to Unlock
                  </button>
                </div>
              </div>
            ) : todaySignals.length === 0 ? (
              <p className="text-sm text-muted-foreground">No signals posted today yet.</p>
            ) : (
              <div className="space-y-2.5">{todaySignals.map(s => <SignalCard key={s.id} signal={s} />)}</div>
            )}
          </div>
        )}

        {/* Past signals */}
        {(signalTab === 'past' || signalTab === 'all') && (
          <div>
            {signalTab === 'all' && <h3 className="text-sm font-bold text-foreground mb-2">Past Signals</h3>}
            {signals.length === 0 ? (
              <p className="text-sm text-muted-foreground">No past signals yet.</p>
            ) : (
              <div className="space-y-2.5">{signals.map(s => <SignalCard key={s.id} signal={s} />)}</div>
            )}
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
}
