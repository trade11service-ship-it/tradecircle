import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { GroupFeed } from '@/components/GroupFeed';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { Shield, Users, Heart, Share2, Lock, CheckCircle, Calendar, TrendingUp, Camera, BarChart3, User, ExternalLink } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import { SUBSCRIPTION_RISK_TEXT, getDeviceInfo, getIpAddress } from '@/lib/legalTexts';
import { useFollow } from '@/hooks/useFollow';

type Advisor = Tables<'advisors'>;
type Group = Tables<'groups'>;
type Signal = Tables<'signals'>;

const toTitleCase = (s: string) => s.replace(/\b\w/g, c => c.toUpperCase());

function FollowButton({ groupId }: { groupId: string }) {
  const { following, loading, toggleFollow } = useFollow(groupId);
  if (loading) return null;
  return (
    <button onClick={toggleFollow} className={`flex h-9 items-center gap-1.5 rounded-full px-4 text-[12px] font-semibold transition-all ${following ? 'bg-destructive/10 text-destructive border border-destructive/30' : 'bg-card text-muted-foreground border border-border'}`}>
      <Heart className={`h-3 w-3 ${following ? 'fill-current' : ''}`} />
      {following ? 'Following' : 'Follow'}
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
  const [subscribedGroupIds, setSubscribedGroupIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'feed' | 'signals' | 'about'>('feed');
  const [riskAlreadyAccepted, setRiskAlreadyAccepted] = useState(false);
  const [signalStats, setSignalStats] = useState<{ total_signals: number; win_count: number; loss_count: number; resolved_count: number }>({ total_signals: 0, win_count: 0, loss_count: 0, resolved_count: 0 });
  const [totalSubs, setTotalSubs] = useState(0);
  const [signalFilter, setSignalFilter] = useState<'all' | 'PENDING' | 'WIN' | 'LOSS'>('all');
  const coverInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

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
      setTotalSubs(withSubs.reduce((sum, g) => sum + g.subCount, 0));
    }

    const [{ data: statsData }, { data: subCountData }] = await Promise.all([
      supabase.rpc('get_advisor_signal_stats', { _advisor_id: id! }),
      supabase.rpc('get_advisor_subscriber_count', { _advisor_id: id! }),
    ]);
    if (statsData) setSignalStats(statsData as any);
    if (subCountData) setTotalSubs(subCountData as number);

    // Fetch all signals for signals tab
    const { data: allSigs } = await supabase.from('signals').select('*').eq('advisor_id', id!).eq('post_type', 'signal').order('created_at', { ascending: false }).limit(100);
    setSignals(allSigs || []);

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

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !advisor) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Max 5MB'); return; }
    const path = `${user.id}/cover.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from('advisor-covers').upload(path, file, { upsert: true });
    if (error) { toast.error('Upload failed'); return; }
    const { data: { publicUrl } } = supabase.storage.from('advisor-covers').getPublicUrl(path);
    await supabase.from('advisors').update({ cover_image_url: publicUrl } as any).eq('id', advisor.id);
    setAdvisor({ ...advisor, cover_image_url: publicUrl } as any);
    toast.success('Cover photo updated!');
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !advisor) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Max 5MB'); return; }
    const path = `${user.id}/avatar.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from('advisor-avatars').upload(path, file, { upsert: true });
    if (error) { toast.error('Upload failed'); return; }
    const { data: { publicUrl } } = supabase.storage.from('advisor-avatars').getPublicUrl(path);
    await supabase.from('advisors').update({ profile_photo_url: publicUrl }).eq('id', advisor.id);
    setAdvisor({ ...advisor, profile_photo_url: publicUrl });
    toast.success('Profile photo updated!');
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
  const coverUrl = (advisor as any).cover_image_url;

  const filteredSignals = signals.filter(s => {
    if (signalFilter === 'all') return true;
    if (signalFilter === 'PENDING') return !s.result || s.result === 'PENDING';
    if (signalFilter === 'WIN') return s.result === 'WIN' || s.result === 'TARGET_HIT';
    if (signalFilter === 'LOSS') return s.result === 'LOSS' || s.result === 'SL_HIT';
    return true;
  });

  const pendingCount = signals.filter(s => !s.result || s.result === 'PENDING').length;
  const winCount = signals.filter(s => s.result === 'WIN' || s.result === 'TARGET_HIT').length;
  const lossCount = signals.filter(s => s.result === 'LOSS' || s.result === 'SL_HIT').length;

  return (
    <div className="min-h-screen flex flex-col bg-muted">
      <Navbar />

      {/* COVER PHOTO */}
      <div className="relative w-full h-[160px] md:h-[200px] bg-gradient-to-br from-primary to-secondary overflow-hidden">
        {coverUrl && <img src={coverUrl} alt="Cover" className="absolute inset-0 w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        {isOwner && (
          <>
            <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
            <button onClick={() => coverInputRef.current?.click()} className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors">
              <Camera className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {/* PROFILE HEADER */}
      <section className="bg-card border-b border-border relative">
        <div className="px-4 pb-4">
          {/* Avatar */}
          <div className="flex items-end gap-3 -mt-10 relative z-10">
            <div className="relative">
              <div className="flex h-20 w-20 items-center justify-center rounded-full border-[3px] border-primary bg-gradient-to-br from-primary to-secondary text-2xl font-extrabold text-primary-foreground shadow-lg overflow-hidden ring-4 ring-card">
                {advisor.profile_photo_url
                  ? <img src={advisor.profile_photo_url} alt={advisor.full_name} className="h-full w-full object-cover" />
                  : toTitleCase(advisor.full_name).charAt(0)}
              </div>
              {isOwner && (
                <>
                  <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                  <button onClick={() => avatarInputRef.current?.click()} className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md border-2 border-card">
                    <Camera className="h-3 w-3" />
                  </button>
                </>
              )}
            </div>
            <div className="flex-1 min-w-0 pb-1">
              <h1 className="text-[18px] font-extrabold text-foreground truncate leading-tight">{toTitleCase(advisor.full_name)}</h1>
              <p className="text-[12px] font-medium text-primary flex items-center gap-1">
                <CheckCircle className="h-3 w-3" /> TradeCircle Verified
              </p>
            </div>
            <div className="flex items-center gap-2 pb-1">
              {!isOwner && firstGroupId && <FollowButton groupId={firstGroupId} />}
              <button
                onClick={async () => {
                  try { await navigator.share({ url: window.location.href, title: document.title }); }
                  catch { await navigator.clipboard.writeText(window.location.href); toast.success('Link copied!'); }
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground"
              >
                <Share2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Bio */}
          {advisor.bio && (
            <p className="mt-2 text-[13px] text-muted-foreground leading-snug line-clamp-2">{advisor.bio}</p>
          )}

          {/* SEBI badge */}
          <div className="mt-2">
            <a href="https://www.sebi.gov.in/sebiweb/other/OtherAction.do?doRecognisedFpi=yes&intmId=13" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-[11px] font-bold text-primary hover:bg-primary/10 transition-colors">
              <Shield className="h-3 w-3" /> SEBI ✓ {advisor.sebi_reg_no}
              <ExternalLink className="h-2.5 w-2.5 ml-0.5" />
            </a>
          </div>

          {/* Stats row */}
          <div className="mt-3 flex items-center justify-between rounded-xl bg-muted p-3">
            {[
              { value: signalStats.total_signals, label: 'Signals' },
              { value: totalSubs, label: 'Members' },
              { value: winRate !== null ? `${winRate}%` : '—', label: 'Accuracy' },
              { value: groups.length, label: 'Groups' },
            ].map((stat, i) => (
              <div key={i} className={`text-center flex-1 ${i > 0 ? 'border-l border-border' : ''}`}>
                <p className="text-[16px] font-bold text-foreground">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex">
          {[
            { key: 'feed' as const, label: 'Feed' },
            { key: 'signals' as const, label: 'Signals' },
            { key: 'about' as const, label: 'About' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex-1 py-3 text-[14px] font-medium text-center transition-colors border-b-2 ${
                activeTab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      {/* TAB CONTENT */}
      <div className="flex-1 flex flex-col">
        {/* FEED TAB */}
        {activeTab === 'feed' && (
          <div className="flex-1 flex flex-col" style={{ minHeight: '60vh' }}>
            {groups.length > 0 ? (
              <GroupFeed
                groupId={groups[0].id}
                advisorName={toTitleCase(advisor.full_name)}
                advisorPhoto={advisor.profile_photo_url || undefined}
                isSubscribed={!!(isSubscribedToAny || isOwner)}
                onSubscribe={() => groups[0] && handleSubscribe(groups[0])}
                subscribePrice={groups[0]?.monthly_price}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="text-4xl mb-3">💬</div>
                <p className="text-[15px] font-semibold text-foreground">No groups yet</p>
                <p className="text-[13px] text-muted-foreground mt-1">This advisor hasn't created any groups.</p>
              </div>
            )}
          </div>
        )}

        {/* SIGNALS TAB */}
        {activeTab === 'signals' && (
          <div className="px-4 py-4">
            {/* Summary bar */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-3">
              {[
                { label: `Total: ${signals.length}`, cls: 'bg-card border border-border text-foreground' },
                { label: `✅ Hit: ${winCount}`, cls: 'bg-primary/5 border border-primary/20 text-primary' },
                { label: `❌ SL: ${lossCount}`, cls: 'bg-destructive/5 border border-destructive/20 text-destructive' },
                { label: `⏳ Pending: ${pendingCount}`, cls: 'bg-[hsl(45,100%,94%)] border border-[hsl(45,80%,70%)] text-[hsl(35,100%,35%)]' },
                { label: `Accuracy: ${winRate !== null ? winRate + '%' : '—'}`, cls: 'bg-primary/10 border border-primary/30 text-primary font-bold' },
              ].map((item, i) => (
                <span key={i} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-semibold ${item.cls}`}>{item.label}</span>
              ))}
            </div>

            {/* Filter chips */}
            <div className="flex gap-2 mb-4">
              {[
                { key: 'all' as const, label: 'All' },
                { key: 'PENDING' as const, label: 'Pending' },
                { key: 'WIN' as const, label: 'Target Hit' },
                { key: 'LOSS' as const, label: 'SL Hit' },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setSignalFilter(f.key)}
                  className={`rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                    signalFilter === f.key ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Signal cards */}
            {filteredSignals.length === 0 ? (
              <div className="py-12 text-center">
                <BarChart3 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-[14px] text-muted-foreground">No signals found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredSignals.map(s => {
                  const isBuy = s.signal_type === 'BUY';
                  const resultStatus = (s.result === 'WIN' || s.result === 'TARGET_HIT') ? 'win'
                    : (s.result === 'LOSS' || s.result === 'SL_HIT') ? 'loss' : 'pending';
                  const borderColor = resultStatus === 'win' ? 'border-l-primary' : resultStatus === 'loss' ? 'border-l-destructive' : 'border-l-[hsl(45,100%,51%)]';

                  return (
                    <div key={s.id} className={`rounded-xl border border-border bg-card p-3 pl-4 border-l-[3px] ${borderColor}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[15px] font-bold text-foreground">{s.instrument}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isBuy ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                          {isBuy ? '🟢' : '🔴'} {s.signal_type}
                        </span>
                      </div>
                      <div className="mt-1.5 flex gap-4 text-[12px]">
                        <span className="text-muted-foreground">Entry <span className="font-bold text-foreground">₹{Number(s.entry_price).toLocaleString('en-IN')}</span></span>
                        <span className="text-muted-foreground">Target <span className="font-bold text-primary">₹{Number(s.target_price).toLocaleString('en-IN')}</span></span>
                        <span className="text-muted-foreground">SL <span className="font-bold text-destructive">₹{Number(s.stop_loss).toLocaleString('en-IN')}</span></span>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {s.timeframe && <span className="text-[10px] rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{s.timeframe}</span>}
                          <span className="text-[10px] text-muted-foreground">
                            {s.signal_date ? new Date(s.signal_date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : ''}
                          </span>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          resultStatus === 'win' ? 'bg-primary/10 text-primary' :
                          resultStatus === 'loss' ? 'bg-destructive/10 text-destructive' :
                          'bg-[hsl(45,100%,92%)] text-[hsl(35,100%,35%)]'
                        }`}>
                          {resultStatus === 'win' ? '✅ Target Hit' : resultStatus === 'loss' ? '❌ SL Hit' : '⏳ Pending'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ABOUT TAB */}
        {activeTab === 'about' && (
          <div className="px-4 py-4 space-y-4">
            {/* Advisor card */}
            <div className="rounded-2xl border border-border bg-card p-5 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-3xl font-extrabold text-primary-foreground overflow-hidden ring-4 ring-primary/20">
                {advisor.profile_photo_url ? <img src={advisor.profile_photo_url} alt="" className="h-full w-full object-cover" /> : toTitleCase(advisor.full_name).charAt(0)}
              </div>
              <h2 className="mt-3 text-xl font-extrabold text-foreground">{toTitleCase(advisor.full_name)}</h2>
              <p className="text-[12px] text-primary font-medium flex items-center justify-center gap-1 mt-1">
                <CheckCircle className="h-3 w-3" /> TradeCircle Verified Advisor
              </p>
            </div>

            {/* Details */}
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <p className="text-[11px] text-muted-foreground">SEBI Registration</p>
                  <a href="https://www.sebi.gov.in/sebiweb/other/OtherAction.do?doRecognisedFpi=yes&intmId=13" target="_blank" rel="noopener noreferrer" className="text-[14px] font-semibold text-primary hover:underline flex items-center gap-1">
                    {advisor.sebi_reg_no} <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-[11px] text-muted-foreground">Member Since</p>
                  <p className="text-[14px] font-semibold text-foreground">
                    {advisor.created_at ? new Date(advisor.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : '—'}
                  </p>
                </div>
              </div>
              {advisor.strategy_type && (
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-4 w-4 text-secondary shrink-0" />
                  <div>
                    <p className="text-[11px] text-muted-foreground">Speciality</p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {advisor.strategy_type.split(',').map((tag, i) => (
                        <span key={i} className="tc-badge-strategy text-[11px]">{tag.trim()}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bio */}
            {advisor.bio && (
              <div className="rounded-2xl border border-border bg-card p-5">
                <h3 className="text-[14px] font-bold text-foreground mb-2">About</h3>
                <p className="text-[13px] text-muted-foreground leading-relaxed whitespace-pre-wrap">{advisor.bio}</p>
              </div>
            )}

            {/* Stats card */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="text-[14px] font-bold text-foreground mb-3">Performance Stats</h3>
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

            {/* Groups list */}
            {groups.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-5">
                <h3 className="text-[14px] font-bold text-foreground mb-3">Groups</h3>
                <div className="space-y-3">
                  {groups.map(g => {
                    const isSub = subscribedGroupIds.includes(g.id);
                    return (
                      <div key={g.id} className="flex items-center justify-between rounded-xl border border-border bg-muted/50 p-3">
                        <div>
                          <p className="text-[14px] font-semibold text-foreground">{g.name}</p>
                          <p className="text-[12px] text-muted-foreground">₹{g.monthly_price}/mo · {g.subCount} members</p>
                        </div>
                        {isSub || isOwner ? (
                          <span className="flex items-center gap-1 text-[12px] font-semibold text-primary">
                            <CheckCircle className="h-3.5 w-3.5" /> {isOwner ? 'Owner' : 'Subscribed'}
                          </span>
                        ) : (
                          <Button size="sm" className="text-[12px] rounded-full h-8" onClick={() => handleSubscribe(g)} disabled={subscribing === g.id}>
                            Subscribe
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Disclaimer */}
            <p className="text-[11px] text-center text-muted-foreground italic px-4 pb-4">
              All advisors on TradeCircle are SEBI registered. SEBI does not endorse any advisor's performance. Past performance ≠ future results.
            </p>
          </div>
        )}
      </div>

      {/* STICKY BOTTOM BAR */}
      {groups.length > 0 && !isOwner && (
        <div className="sticky bottom-14 md:bottom-0 bg-card border-t border-border p-3 safe-area-bottom z-20">
          {isSubscribedToAny ? (
            <div className="flex items-center justify-center gap-2 rounded-xl bg-primary/5 py-3 text-[14px] font-bold text-primary">
              <CheckCircle className="h-4 w-4" /> Subscribed ✓
            </div>
          ) : (
            <button
              onClick={() => handleSubscribe(groups[0])}
              disabled={subscribing === groups[0].id}
              className="w-full rounded-xl bg-primary py-3.5 text-[15px] font-bold text-primary-foreground shadow-lg disabled:opacity-60 transition-all active:scale-[0.98]"
            >
              {subscribing === groups[0].id ? 'Processing...' : `Subscribe — ₹${groups[0].monthly_price}/month`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
