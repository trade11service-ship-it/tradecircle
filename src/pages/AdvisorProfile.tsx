import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { GroupFeed } from '@/components/GroupFeed';
import { SignalCard } from '@/components/SignalCard';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { Shield, Users, Heart, Share2, Bell, BarChart2, Lock, CheckCircle, Calendar, TrendingUp } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import { SUBSCRIPTION_RISK_TEXT, getDeviceInfo, getIpAddress } from '@/lib/legalTexts';
import { useFollow } from '@/hooks/useFollow';

type Advisor = Pick<Tables<'advisors'>, 'id' | 'full_name' | 'email' | 'phone' | 'bio' | 'sebi_reg_no' | 'strategy_type' | 'profile_photo_url' | 'status' | 'created_at' | 'user_id'>;
type Group = Tables<'groups'>;
type Signal = Tables<'signals'>;

const toTitleCase = (s: string) => s.replace(/\b\w/g, c => c.toUpperCase());

const formatRelativeDate = (date: string | null) => {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const dateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  
  const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  if (dateOnly.getTime() === today.getTime()) return `Today ${time}`;
  if (dateOnly.getTime() === yesterday.getTime()) return `Yesterday ${time}`;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) + ` ${time}`;
};

function FollowButton({ groupId }: { groupId: string }) {
  const { following, loading, toggleFollow } = useFollow(groupId);
  if (loading) return null;
  return (
    <button onClick={toggleFollow} className={`flex h-10 flex-1 items-center justify-center gap-2 rounded-[10px] border-[1.5px] text-[13px] font-semibold transition-all ${following ? 'border-destructive/30 bg-destructive/5 text-destructive' : 'border-border bg-card text-muted-foreground'}`}>
      <Heart className={`h-3.5 w-3.5 ${following ? 'fill-current' : ''}`} />
      {following ? 'Following' : 'Follow'}
    </button>
  );
}

function ShareButton() {
  const handleShare = async () => {
    try { await navigator.share({ url: window.location.href, title: document.title }); }
    catch { await navigator.clipboard.writeText(window.location.href); toast.success('Link copied!'); }
  };
  return (
    <button onClick={handleShare} className="flex h-10 w-10 min-w-[40px] items-center justify-center rounded-[10px] border-[1.5px] border-border bg-card text-muted-foreground transition-colors hover:bg-muted">
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
  const [activeTab, setActiveTab] = useState<'feed' | 'track' | 'about'>('feed');
  const [riskAlreadyAccepted, setRiskAlreadyAccepted] = useState(false);
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

    const { data: pastSigs } = await supabase.from('signals').select('*').eq('advisor_id', id!).lt('signal_date', new Date().toISOString().split('T')[0]).order('signal_date', { ascending: false }).limit(50);
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
      const { data: acceptance } = await supabase.from('user_legal_acceptances').select('id').eq('user_id', user.id).eq('acceptance_type', 'subscription_risk').limit(1);
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
    <div className="min-h-screen bg-muted"><Navbar /><div className="py-20 text-center text-muted-foreground">Advisor not found</div></div>
  );

  const isOwner = user && advisor && advisor.user_id === user.id;
  const isSubscribedToAny = groups.some(g => subscribedGroupIds.includes(g.id));
  const firstGroupId = groups[0]?.id || '';
  const winRate = signalStats.resolved_count > 0 ? Math.round((signalStats.win_count / signalStats.resolved_count) * 100) : null;
  const allSignals = [...todaySignals, ...signals];
  const signalOnlyPosts = allSignals.filter(s => s.post_type === 'signal');

  return (
    <div className="min-h-screen flex flex-col bg-muted">
      <Navbar />

      {/* Profile Hero */}
      <section className="bg-card shadow-sm">
        <div className="h-16 bg-gradient-to-br from-secondary to-primary" />
        <div className="px-4 pb-4 -mt-6">
          <div className="flex items-end gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-card bg-gradient-to-br from-primary to-secondary text-2xl font-extrabold text-primary-foreground shadow-lg overflow-hidden">
              {advisor.profile_photo_url ? <img src={advisor.profile_photo_url} alt={advisor.full_name} className="h-full w-full object-cover" /> : toTitleCase(advisor.full_name).charAt(0)}
            </div>
            <div className="flex-1 min-w-0 pb-1">
              <h1 className="text-lg font-extrabold text-foreground truncate">{toTitleCase(advisor.full_name)}</h1>
              <p className="text-[11px] text-muted-foreground">TradeCircle Verified</p>
            </div>
          </div>

          {/* Badges */}
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-primary bg-primary/5 px-2.5 py-0.5 text-[11px] font-bold text-primary">
              <Shield className="h-3 w-3" /> SEBI {advisor.sebi_reg_no}
            </span>
            {advisor.strategy_type && (
              <span className="inline-flex rounded-full border border-secondary bg-secondary/5 px-2.5 py-0.5 text-[11px] font-semibold text-secondary">{advisor.strategy_type}</span>
            )}
          </div>

          {/* Stats */}
          <div className="mt-3 grid grid-cols-4 gap-0 rounded-xl bg-muted p-3">
            {[
              { value: winRate !== null ? `${winRate}%` : '—', label: 'Accuracy', color: 'text-primary' },
              { value: signalStats.total_signals, label: 'Signals', color: 'text-foreground' },
              { value: totalSubs, label: 'Members', color: 'text-secondary' },
              { value: groups.length, label: 'Groups', color: 'text-foreground' },
            ].map((stat, i) => (
              <div key={i} className={`text-center ${i > 0 ? 'border-l border-border' : ''}`}>
                <p className={`text-base font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-[10px] text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Actions */}
          {!isOwner && (
            <div className="mt-3 flex items-center gap-2">
              <FollowButton groupId={firstGroupId} />
              <ShareButton />
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-t border-border">
          {[
            { key: 'feed' as const, label: 'Feed' },
            { key: 'track' as const, label: 'Track Record' },
            { key: 'about' as const, label: 'About' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex-1 py-3 text-[13px] font-semibold text-center transition-colors border-b-2 ${
                activeTab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      {/* Tab Content */}
      <div className="flex-1 px-4 py-4">
        {/* FEED TAB */}
        {activeTab === 'feed' && (
          <div>
            {groups.length > 0 && (isSubscribedToAny || isOwner) ? (
              <GroupFeed
                groupId={groups[0].id}
                advisorName={toTitleCase(advisor.full_name)}
                advisorPhoto={advisor.profile_photo_url || undefined}
              />
            ) : (
              <div>
                {/* Show first 2 posts visible, rest blurred */}
                {allSignals.length === 0 ? (
                  <div className="tc-card-static p-10 text-center">
                    <p className="text-3xl mb-2">📊</p>
                    <p className="text-sm font-medium text-foreground">No posts yet</p>
                    <p className="text-sm text-muted-foreground mt-1">{toTitleCase(advisor.full_name)} hasn't posted anything yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {allSignals.slice(0, 2).map(s => (
                      <SignalCard key={s.id} signal={s} advisorName={toTitleCase(advisor.full_name)} />
                    ))}
                    {allSignals.length > 2 && (
                      <div className="relative">
                        <div className="pointer-events-none space-y-3">
                          {allSignals.slice(2, 4).map(s => (
                            <div key={s.id} className="blur-[6px]">
                              <SignalCard signal={s} />
                            </div>
                          ))}
                        </div>
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/70 backdrop-blur-[2px] rounded-xl">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-border bg-muted">
                            <Lock className="h-5 w-5 text-primary" />
                          </div>
                          <p className="mt-3 text-base font-bold text-foreground">Subscribe to see all signals</p>
                          <p className="mt-1 text-[13px] text-muted-foreground text-center">Get real-time access to every trade signal</p>
                          {groups[0] && (
                            <button
                              onClick={() => handleSubscribe(groups[0])}
                              className="mt-4 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground"
                            >
                              Subscribe — ₹{groups[0].monthly_price}/month
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TRACK RECORD TAB */}
        {activeTab === 'track' && (
          <div>
            {/* Summary */}
            <div className="rounded-2xl border border-border bg-card p-5 mb-4">
              <h3 className="text-base font-bold text-foreground mb-3">Performance Summary</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-muted p-3 text-center">
                  <p className="text-2xl font-black text-foreground">{signalStats.total_signals}</p>
                  <p className="text-[11px] text-muted-foreground">Total Signals</p>
                </div>
                <div className="rounded-xl bg-primary/5 p-3 text-center">
                  <p className="text-2xl font-black text-primary">{winRate !== null ? `${winRate}%` : '—'}</p>
                  <p className="text-[11px] text-muted-foreground">Accuracy</p>
                </div>
                <div className="rounded-xl bg-primary/5 p-3 text-center">
                  <p className="text-2xl font-black text-primary">{signalStats.win_count}</p>
                  <p className="text-[11px] text-muted-foreground">Target Hit ✅</p>
                </div>
                <div className="rounded-xl bg-destructive/5 p-3 text-center">
                  <p className="text-2xl font-black text-destructive">{signalStats.loss_count}</p>
                  <p className="text-[11px] text-muted-foreground">SL Hit ❌</p>
                </div>
              </div>
            </div>

            {/* Signal History Table */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <h3 className="text-sm font-bold text-foreground">Closed Signals</h3>
              </div>
              {signalOnlyPosts.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">No signals yet</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        <th className="px-3 py-2 text-left">Date</th>
                        <th className="px-3 py-2 text-left">Stock</th>
                        <th className="px-3 py-2 text-left">Type</th>
                        <th className="px-3 py-2 text-right">Entry</th>
                        <th className="px-3 py-2 text-right">Target</th>
                        <th className="px-3 py-2 text-right">SL</th>
                        <th className="px-3 py-2 text-center">Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {signalOnlyPosts.slice(0, 30).map(s => (
                        <tr key={s.id} className="border-t border-muted">
                          <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                            {s.signal_date ? new Date(s.signal_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                          </td>
                          <td className="px-3 py-2 font-semibold text-foreground">{s.instrument}</td>
                          <td className="px-3 py-2">
                            <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${s.signal_type === 'BUY' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>{s.signal_type}</span>
                          </td>
                          <td className="px-3 py-2 text-right font-medium">₹{Number(s.entry_price).toLocaleString('en-IN')}</td>
                          <td className="px-3 py-2 text-right font-medium text-primary">₹{Number(s.target_price).toLocaleString('en-IN')}</td>
                          <td className="px-3 py-2 text-right font-medium text-destructive">₹{Number(s.stop_loss).toLocaleString('en-IN')}</td>
                          <td className="px-3 py-2 text-center">
                            {s.result === 'TARGET_HIT' || s.result === 'WIN' ? (
                              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">✅ Hit</span>
                            ) : s.result === 'SL_HIT' || s.result === 'LOSS' ? (
                              <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">❌ SL</span>
                            ) : (
                              <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-bold text-[hsl(var(--warning))]">⏳</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ABOUT TAB */}
        {activeTab === 'about' && (
          <div className="space-y-4">
            {/* Photo + Name */}
            <div className="rounded-2xl border border-border bg-card p-5 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-3xl font-extrabold text-primary-foreground overflow-hidden">
                {advisor.profile_photo_url ? <img src={advisor.profile_photo_url} alt="" className="h-full w-full object-cover" /> : toTitleCase(advisor.full_name).charAt(0)}
              </div>
              <h2 className="mt-3 text-xl font-extrabold text-foreground">{toTitleCase(advisor.full_name)}</h2>
              <p className="text-xs text-muted-foreground mt-1">TradeCircle Verified Advisor</p>
            </div>

            {/* Details */}
            <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <p className="text-[11px] text-muted-foreground">SEBI Registration No.</p>
                  <p className="text-sm font-semibold text-foreground">{advisor.sebi_reg_no}</p>
                </div>
              </div>
              {advisor.strategy_type && (
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-4 w-4 text-secondary shrink-0" />
                  <div>
                    <p className="text-[11px] text-muted-foreground">Speciality</p>
                    <p className="text-sm font-semibold text-foreground">{advisor.strategy_type}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-[11px] text-muted-foreground">Member Since</p>
                  <p className="text-sm font-semibold text-foreground">
                    {advisor.created_at ? new Date(advisor.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* Bio */}
            {advisor.bio && (
              <div className="rounded-2xl border border-border bg-card p-5">
                <h3 className="text-sm font-bold text-foreground mb-2">About</h3>
                <p className="text-[13px] text-muted-foreground leading-relaxed">{advisor.bio}</p>
              </div>
            )}

            {/* Subscribe CTA */}
            {groups.length > 0 && !isSubscribedToAny && !isOwner && (
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 text-center">
                <p className="text-sm font-bold text-foreground">Ready to subscribe?</p>
                <p className="text-xs text-muted-foreground mt-1">Get signals delivered to your Telegram instantly</p>
                <button
                  onClick={() => handleSubscribe(groups[0])}
                  disabled={subscribing === groups[0].id}
                  className="mt-3 w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
                >
                  {subscribing === groups[0].id ? 'Processing...' : `Subscribe — ₹${groups[0].monthly_price}/month`}
                </button>
                <p className="mt-1.5 text-[11px] text-muted-foreground">✓ Cancel anytime · ✓ Signals on Telegram</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sticky Subscribe Button - for non-subscribers */}
      {groups.length > 0 && !isSubscribedToAny && !isOwner && activeTab === 'feed' && (
        <div className="sticky bottom-14 md:bottom-0 bg-card border-t border-border p-3 safe-area-bottom">
          <button
            onClick={() => handleSubscribe(groups[0])}
            disabled={subscribing === groups[0].id}
            className="w-full rounded-xl bg-primary py-3.5 text-base font-bold text-primary-foreground shadow-[0_-4px_20px_rgba(27,94,32,0.2)] disabled:opacity-60"
          >
            {subscribing === groups[0].id ? 'Processing...' : `Subscribe — ₹${groups[0].monthly_price}/month`}
          </button>
        </div>
      )}

      {/* Subscribed badge */}
      {isSubscribedToAny && !isOwner && (
        <div className="sticky bottom-14 md:bottom-0 bg-card border-t border-border p-3">
          <div className="flex items-center justify-center gap-2 rounded-xl bg-primary/5 py-3 text-sm font-bold text-primary">
            <CheckCircle className="h-4 w-4" /> Subscribed ✓
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
