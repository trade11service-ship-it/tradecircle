import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { SignalCard } from '@/components/SignalCard';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { Shield, Users, ArrowRight, Heart } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import { SUBSCRIPTION_RISK_TEXT, getDeviceInfo, getIpAddress } from '@/lib/legalTexts';
import { useFollow } from '@/hooks/useFollow';

type Advisor = Tables<'advisors'>;
type Group = Tables<'groups'>;
type Signal = Tables<'signals'>;

function FollowButton({ groupId, groupName }: { groupId: string; groupName: string }) {
  const { following, loading, toggleFollow } = useFollow(groupId);
  if (loading) return null;
  return (
    <Button
      variant={following ? 'outline' : 'ghost'}
      size="sm"
      className={`gap-1.5 text-xs ${following ? 'border-primary text-primary' : 'text-muted-foreground'}`}
      onClick={toggleFollow}
    >
      <Heart className={`h-3.5 w-3.5 ${following ? 'fill-primary text-primary' : ''}`} />
      {following ? `Following ${groupName}` : `Follow ${groupName}`}
    </Button>
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
  const [riskAccepted, setRiskAccepted] = useState(false);

  useEffect(() => { if (id) fetchData(); }, [id, user]);

  const fetchData = async () => {
    const { data: adv } = await supabase.from('advisors').select('*').eq('id', id!).single();
    setAdvisor(adv);
    const { data: grps } = await supabase.from('groups').select('*').eq('advisor_id', id!).eq('is_active', true);
    if (grps) {
      const withSubs = await Promise.all(grps.map(async g => {
        const { count } = await supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('group_id', g.id).eq('status', 'active');
        return { ...g, subCount: count || 0 };
      }));
      setGroups(withSubs);
    }
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
    }
    setLoading(false);
  };

  const handleSubscribe = async (group: Group) => {
    if (!user) { navigate('/login'); return; }
    if (!riskAccepted) { toast.error('Please acknowledge the risk disclaimer to proceed'); return; }
    setSubscribing(group.id);
    try {
      // Save risk acceptance
      const ip = await getIpAddress();
      await supabase.from('user_legal_acceptances').insert({
        user_id: user.id,
        full_name: profile?.full_name || '',
        email: profile?.email || user.email || '',
        acceptance_type: 'subscription_risk',
        checkbox_text: SUBSCRIPTION_RISK_TEXT,
        accepted: true,
        ip_address: ip,
        user_agent: navigator.userAgent,
        device_info: getDeviceInfo(),
        page_url: window.location.href,
      });

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

  if (loading) return <div className="min-h-screen bg-off-white"><Navbar /><div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div></div>;
  if (!advisor) return <div className="min-h-screen bg-off-white"><Navbar /><div className="py-20 text-center text-muted-foreground">Advisor not found</div></div>;

  const isOwner = user && advisor && advisor.user_id === user.id;
  const isSubscribedToAny = groups.some(g => subscribedGroupIds.includes(g.id));
  const firstGroupId = groups[0]?.id || '';

  return (
    <div className="min-h-screen flex flex-col bg-off-white">
      <Navbar />

      {/* Top Hero Card */}
      <section className="tc-section pb-0">
        <div className="container mx-auto">
          <div className="tc-card-static p-8">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-muted text-3xl font-bold overflow-hidden">
                {advisor.profile_photo_url ? (
                  <img src={advisor.profile_photo_url} alt={advisor.full_name} className="h-24 w-24 rounded-full object-cover" />
                ) : advisor.full_name.charAt(0)}
              </div>
              <div className="flex-1">
                <h1 className="tc-page-title text-3xl">{advisor.full_name}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="tc-badge-sebi"><Shield className="h-3 w-3" /> SEBI: {advisor.sebi_reg_no}</span>
                  <span className="tc-badge-strategy">{advisor.strategy_type}</span>
                </div>
                {advisor.bio && <p className="mt-3 text-muted-foreground max-w-xl">{advisor.bio}</p>}
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                {groups.length > 0 && (
                  <div className="text-right">
                    <p className="tc-small">Starting from</p>
                    <p className="text-2xl tc-amount">₹{Math.min(...groups.map(g => g.monthly_price))}/mo</p>
                  </div>
                )}
                {/* Follow buttons for each group */}
                {!isOwner && groups.map(g => (
                  <FollowButton key={g.id} groupId={g.id} groupName={g.name} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

  // Already replaced above - this block is now part of the new return

      <div className="container mx-auto px-4 py-10">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left: Groups */}
          <div className="lg:col-span-1">
            <h2 className="tc-section-title text-xl mb-4">Available Groups</h2>
            {groups.length === 0 && (
              <div className="tc-card-static p-6 text-center border-dashed">
                <p className="text-sm text-muted-foreground">This advisor hasn't created any signal groups yet.</p>
              </div>
            )}

            {/* Risk disclaimer checkbox for subscription */}
            {groups.length > 0 && !isOwner && !isSubscribedToAny && (
              <div className="flex items-start gap-3 rounded-lg border p-3 bg-muted/30 mb-4">
                <Checkbox
                  id="risk-accept"
                  checked={riskAccepted}
                  onCheckedChange={(checked) => setRiskAccepted(checked === true)}
                  className="mt-0.5"
                />
                <label htmlFor="risk-accept" className="text-xs leading-relaxed text-muted-foreground cursor-pointer">
                  {SUBSCRIPTION_RISK_TEXT}
                </label>
              </div>
            )}

            <div className="space-y-4">
              {groups.map(group => (
                <div key={group.id} className="tc-card p-5">
                  <div className="flex items-center gap-3">
                    {group.dp_url ? (
                      <img src={group.dp_url} alt={group.name} className="h-12 w-12 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-light-green font-bold text-primary">{group.name.charAt(0)}</div>
                    )}
                    <div>
                      <p className="tc-card-title">{group.name}</p>
                      <p className="tc-small flex items-center gap-1"><Users className="h-3 w-3" /> {group.subCount} subscribers</p>
                    </div>
                  </div>
                  {group.description && <p className="mt-2 tc-small">{group.description}</p>}
                  <p className="mt-3 text-xl tc-amount">₹{group.monthly_price}/month</p>
                  {subscribedGroupIds.includes(group.id) ? (
                    <span className="tc-badge-active mt-3 inline-block">{isOwner ? '👤 Your Group' : '✓ Subscribed'}</span>
                  ) : (
                    <Button className="mt-3 w-full font-semibold tc-btn-click" size="sm" onClick={() => handleSubscribe(group)} disabled={subscribing === group.id}>
                      {subscribing === group.id ? 'Processing...' : `Subscribe ₹${group.monthly_price}/mo`}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right: Signals */}
          <div className="lg:col-span-2">
            <h2 className="tc-section-title text-xl mb-4">Signal History</h2>
            <div className="flex gap-2 mb-6">
              {[{ key: 'all', label: 'All Signals' }, { key: 'past', label: 'Past' }, { key: 'today', label: 'Today (Subscribers Only)' }].map(t => (
                <Button key={t.key} variant={signalTab === t.key ? 'default' : 'outline'} size="sm" className="tc-btn-click" onClick={() => setSignalTab(t.key as any)}>{t.label}</Button>
              ))}
            </div>

            {(signalTab === 'today' || signalTab === 'all') && (
              <div className="mb-6">
                {signalTab === 'all' && <h3 className="tc-card-title mb-3">Today's Signals</h3>}
                {!user || !isSubscribedToAny ? (
                  <div className="space-y-3">
                    <SignalCard signal={{} as Signal} locked />
                    <SignalCard signal={{} as Signal} locked />
                  </div>
                ) : todaySignals.length === 0 ? (
                  <p className="tc-small">No signals posted today yet.</p>
                ) : (
                  <div className="space-y-3">{todaySignals.map(s => <SignalCard key={s.id} signal={s} />)}</div>
                )}
              </div>
            )}

            {(signalTab === 'past' || signalTab === 'all') && (
              <div>
                {signalTab === 'all' && <h3 className="tc-card-title mb-3">Past Signals</h3>}
                {signals.length === 0 ? (
                  <p className="tc-small">No past signals yet.</p>
                ) : (
                  <div className="space-y-3">{signals.map(s => <SignalCard key={s.id} signal={s} />)}</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
