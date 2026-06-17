import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import {
  Mail, Phone, CheckCircle2, ShieldCheck, Activity, Users, TrendingUp, ArrowRight,
  ArrowLeft, Star, Clock, Target, Flame, BarChart3, AlertTriangle, Calendar, Lock
} from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Advisor = Tables<'advisors'>;
type Signal = Tables<'signals'>;

const toTitleCase = (s: string) => s.replace(/\b\w/g, c => c.toUpperCase());

interface ExtendedStats {
  total: number;
  wins: number;
  losses: number;
  pending: number;
  winRate: number | null;
  avgRR: number | null;
  signalsPerWeek: number | null;
  bestMonthRate: number | null;
  bestMonthLabel: string | null;
  currentStreak: { type: 'WIN' | 'LOSS' | null; count: number };
  maxLossStreak: number;
  activeHours: string | null;
  recent: Signal[];
}

function computeStats(signals: Signal[], created_at: string | null): ExtendedStats {
  const tradeSignals = signals.filter(s => s.post_type === 'signal');
  const total = tradeSignals.length;
  const wins = tradeSignals.filter(s => s.result === 'WIN').length;
  const losses = tradeSignals.filter(s => s.result === 'LOSS').length;
  const pending = total - wins - losses;
  const resolved = wins + losses;
  const winRate = resolved > 0 ? Math.round((wins / resolved) * 100) : null;

  // Avg R:R
  const rrValues = tradeSignals
    .map(s => {
      const e = Number(s.entry_price), t = Number(s.target_price), sl = Number(s.stop_loss);
      if (!e || !t || !sl || e === sl) return null;
      const reward = Math.abs(t - e);
      const risk = Math.abs(e - sl);
      if (risk === 0) return null;
      return reward / risk;
    })
    .filter((v): v is number => v !== null && isFinite(v) && v > 0 && v < 20);
  const avgRR = rrValues.length > 0 ? rrValues.reduce((a, b) => a + b, 0) / rrValues.length : null;

  // Signals per week
  let signalsPerWeek: number | null = null;
  if (created_at && total > 0) {
    const weeks = Math.max(1, (Date.now() - new Date(created_at).getTime()) / (1000 * 60 * 60 * 24 * 7));
    signalsPerWeek = total / weeks;
  }

  // Best month win rate
  const byMonth = new Map<string, { w: number; r: number }>();
  tradeSignals.forEach(s => {
    if (!s.signal_date || !(s.result === 'WIN' || s.result === 'LOSS')) return;
    const key = s.signal_date.slice(0, 7);
    const cur = byMonth.get(key) || { w: 0, r: 0 };
    cur.r += 1;
    if (s.result === 'WIN') cur.w += 1;
    byMonth.set(key, cur);
  });
  let bestMonthRate: number | null = null;
  let bestMonthLabel: string | null = null;
  byMonth.forEach((v, k) => {
    if (v.r < 3) return;
    const rate = (v.w / v.r) * 100;
    if (bestMonthRate === null || rate > bestMonthRate) {
      bestMonthRate = Math.round(rate);
      bestMonthLabel = new Date(k + '-01').toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    }
  });

  // Streak (latest first)
  const ordered = [...tradeSignals]
    .filter(s => s.result === 'WIN' || s.result === 'LOSS')
    .sort((a, b) => (b.signal_date || '').localeCompare(a.signal_date || ''));
  let streakType: 'WIN' | 'LOSS' | null = null;
  let streakCount = 0;
  for (const s of ordered) {
    if (streakType === null) { streakType = s.result as 'WIN' | 'LOSS'; streakCount = 1; }
    else if (s.result === streakType) streakCount += 1;
    else break;
  }

  // Max losing streak
  let maxLossStreak = 0, cur = 0;
  for (const s of ordered.slice().reverse()) {
    if (s.result === 'LOSS') { cur += 1; maxLossStreak = Math.max(maxLossStreak, cur); }
    else cur = 0;
  }

  // Active hours: most common hour bucket
  const hourBuckets = new Map<number, number>();
  tradeSignals.forEach(s => {
    if (!s.created_at) return;
    const h = new Date(s.created_at).getHours();
    hourBuckets.set(h, (hourBuckets.get(h) || 0) + 1);
  });
  let activeHours: string | null = null;
  if (hourBuckets.size > 0) {
    const sorted = [...hourBuckets.entries()].sort((a, b) => b[1] - a[1]);
    const topHour = sorted[0][0];
    const range = `${String(topHour).padStart(2, '0')}:00 – ${String((topHour + 1) % 24).padStart(2, '0')}:00 IST`;
    activeHours = range;
  }

  const recent = [...tradeSignals]
    .sort((a, b) => (b.signal_date || '').localeCompare(a.signal_date || ''))
    .slice(0, 5);

  return {
    total, wins, losses, pending, winRate, avgRR, signalsPerWeek,
    bestMonthRate, bestMonthLabel, currentStreak: { type: streakType, count: streakCount },
    maxLossStreak, activeHours, recent,
  };
}

function riskLevel(avgRR: number | null, perWeek: number | null): { label: string; tone: string } {
  if (avgRR === null) return { label: 'Calibrating', tone: 'text-muted-foreground bg-muted' };
  if (avgRR >= 2 && (perWeek === null || perWeek <= 5)) return { label: 'Conservative', tone: 'text-primary bg-primary/10' };
  if (avgRR >= 1.2) return { label: 'Moderate', tone: 'text-[hsl(35,100%,40%)] bg-[hsl(45,100%,94%)]' };
  return { label: 'Aggressive', tone: 'text-destructive bg-destructive/10' };
}

export default function AdvisorProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [advisor, setAdvisor] = useState<Advisor | null>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [followerCount, setFollowerCount] = useState(0);
  const [liveStats, setLiveStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const goBack = () => {
    const hasHistory = (location.key && location.key !== 'default') || window.history.length > 1;
    if (hasHistory) navigate(-1);
    else navigate(user ? '/home' : '/');
  };

  useEffect(() => { if (id) fetchData(); /* eslint-disable-next-line */ }, [id]);

  // Realtime: refresh on signal/sub/follow changes
  useEffect(() => {
    if (!id) return;
    const ch = supabase
      .channel(`advisor-profile-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'signals', filter: `advisor_id=eq.${id}` }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subscriptions', filter: `advisor_id=eq.${id}` }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: adv }, { data: grps }, { data: sigs }, { data: subCount }, { count: fCount }, { data: live }] = await Promise.all([
      supabase.from('advisors').select('id, user_id, full_name, sebi_reg_no, bio, strategy_type, status, rejection_reason, created_at, profile_photo_url, cover_image_url, is_public_featured, public_sort_order, public_tagline, public_description, public_years_experience, risk_level, preferred_trading_hours').eq('id', id!).single(),
      supabase.from('groups').select('*').eq('advisor_id', id!).eq('is_active', true),
      supabase.from('signals').select('*').eq('advisor_id', id!).order('signal_date', { ascending: false }).limit(500),
      supabase.rpc('get_advisor_subscriber_count', { _advisor_id: id! }),
      supabase.from('group_follows').select('id', { count: 'exact', head: true })
        .in('group_id', (await supabase.from('groups').select('id').eq('advisor_id', id!)).data?.map((g: any) => g.id) || []),
      supabase.rpc('get_advisor_live_stats', { _advisor_id: id! }),
    ]);
    if (adv) setAdvisor(adv);
    setGroups(grps || []);
    setSignals((sigs as Signal[]) || []);
    setSubscriberCount((subCount as number) || 0);
    setFollowerCount(fCount || 0);
    setLiveStats(live || null);
    setLoading(false);
  };

  const stats = useMemo(() => computeStats(signals, advisor?.created_at || null), [signals, advisor]);
  const risk = useMemo(() => {
    const adv = advisor as any;
    if (adv?.risk_level) {
      const tone = adv.risk_level === 'Conservative' ? 'text-primary bg-primary/10'
        : adv.risk_level === 'Aggressive' ? 'text-destructive bg-destructive/10'
        : 'text-[hsl(35,100%,40%)] bg-[hsl(45,100%,94%)]';
      return { label: adv.risk_level, tone };
    }
    return riskLevel(stats.avgRR, stats.signalsPerWeek);
  }, [stats, advisor]);

  const specializations = useMemo(() => {
    const set = new Set<string>();
    if (advisor?.strategy_type) advisor.strategy_type.split(/[,/]+/).forEach(s => s.trim() && set.add(s.trim()));
    groups.forEach(g => g.strategy_category && g.strategy_category !== 'All' && set.add(g.strategy_category));
    return Array.from(set).slice(0, 6);
  }, [advisor, groups]);

  const memberSince = advisor?.created_at
    ? new Date(advisor.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
    : null;

  if (loading) {
    return (
      <div className="min-h-full h-full bg-background flex items-center justify-center py-32">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent shadow-lg" />
      </div>
    );
  }

  if (!advisor) {
    return (
      <div className="min-h-full h-full bg-background container mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">Advisor not found</h2>
        <p className="text-muted-foreground mb-6">This advisor profile may have been removed.</p>
        <Link to="/discover"><Button size="lg" className="rounded-full">Browse Verified Advisors</Button></Link>
      </div>
    );
  }

  const getContactDisplay = (value: string | null) => {
    if (!value) return 'Hidden';
    if (value.includes('@')) {
      const [u, d] = value.split('@');
      return `${u.slice(0, 3)}***@${d}`;
    }
    return `${value.slice(0, 3)}***${value.slice(-2)}`;
  };

  const recentBio = advisor.public_description || advisor.bio || 'SEBI registered Research Analyst providing verified trading signals and market analysis.';

  return (
    <div className="min-h-full h-full bg-background overflow-x-hidden">
      {/* Sticky back button (mobile) */}
      <button
        onClick={goBack}
        aria-label="Back"
        className="fixed top-3 left-3 z-30 md:hidden h-10 w-10 rounded-full bg-card/90 backdrop-blur border border-border shadow-md flex items-center justify-center text-foreground hover:bg-card transition"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

      <main className="pb-20">
        {/* HERO — dark premium */}
        <section className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900 text-white pt-12 md:pt-20 pb-10">
          <div className="absolute inset-0 opacity-[0.06] pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/30 blur-[120px] rounded-full pointer-events-none"></div>

          <button onClick={goBack} className="hidden md:inline-flex absolute top-6 left-6 items-center gap-1.5 text-xs font-semibold text-white/70 hover:text-white transition">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          <div className="container mx-auto max-w-5xl px-4 relative z-10">
            <div className="flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8">
              <div className="relative shrink-0">
                <div className="h-28 w-28 md:h-36 md:w-36 rounded-full border-[5px] border-white/10 ring-2 ring-primary/40 shadow-2xl overflow-hidden bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-5xl font-extrabold">
                  {advisor.profile_photo_url
                    ? <img src={advisor.profile_photo_url} alt={advisor.full_name} className="h-full w-full object-cover" />
                    : toTitleCase(advisor.full_name).charAt(0)}
                </div>
                <div className="absolute bottom-1 right-1 bg-primary rounded-full p-1.5 border-4 border-slate-900 shadow-lg">
                  <CheckCircle2 className="h-5 w-5 text-white" />
                </div>
              </div>

              <div className="text-center md:text-left flex-1 min-w-0">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-[11px] font-bold text-primary border border-primary/30 mb-3">
                  <ShieldCheck className="h-3.5 w-3.5" /> SEBI • {advisor.sebi_reg_no}
                </div>
                <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-1.5 break-words" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  {toTitleCase(advisor.full_name)}
                </h1>
                <p className="text-sm md:text-base text-white/70 mb-3 max-w-xl">
                  {advisor.public_tagline || 'SEBI Registered Trading Advisor'}
                </p>

                {specializations.length > 0 && (
                  <div className="flex flex-wrap justify-center md:justify-start gap-1.5 mb-3">
                    {specializations.map(tag => (
                      <span key={tag} className="rounded-full bg-white/10 border border-white/20 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap justify-center md:justify-start items-center gap-3 text-[12px] text-white/70">
                  {(advisor as any).public_years_experience && (
                    <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 text-yellow-400" /> {(advisor as any).public_years_experience}+ yrs</span>
                  )}
                  {memberSince && <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Active since {memberSince}</span>}
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold ${risk.tone}`}>
                    <Target className="h-3 w-3" /> {risk.label}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* HEADLINE STATS */}
        <section className="container mx-auto max-w-5xl px-4 -mt-6 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={Activity} label="Total Signals" value={(liveStats?.total_signals ?? stats.total).toString()} sub="all time" />
            <StatCard
              icon={CheckCircle2}
              label="Win Rate"
              value={liveStats?.win_rate != null ? `${liveStats.win_rate}%` : (stats.winRate !== null ? `${stats.winRate}%` : '—')}
              sub={`${liveStats?.win_count ?? stats.wins}W · ${liveStats?.loss_count ?? stats.losses}L · ${liveStats?.pending_count ?? stats.pending}P`}
              accent
            />
            <StatCard icon={Users} label="Active Members" value={(liveStats?.active_members ?? subscriberCount).toString()} sub="paid subscribers" />
            <StatCard icon={TrendingUp} label="Followers" value={(liveStats?.followers ?? followerCount).toString()} sub="free updates" />
          </div>
        </section>

        {/* PERFORMANCE DEEP-DIVE — differentiator */}
        <section className="container mx-auto max-w-5xl px-4 mt-8">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-foreground">Performance Deep-Dive</h2>
            <span className="text-[10px] text-muted-foreground">— transparency competitors hide</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <DeepStat
              icon={Activity}
              label="Signals / Week"
              value={liveStats?.signals_per_week != null ? Number(liveStats.signals_per_week).toFixed(1) : (stats.signalsPerWeek !== null ? stats.signalsPerWeek.toFixed(1) : '—')}
              hint="posting frequency"
            />
            <DeepStat
              icon={Flame}
              label={(liveStats?.current_streak_type === 'LOSS' || stats.currentStreak.type === 'LOSS') ? 'Loss Streak' : 'Win Streak'}
              value={(liveStats?.current_streak ?? stats.currentStreak.count) > 0 ? `${liveStats?.current_streak ?? stats.currentStreak.count}` : '—'}
              hint={`current ${(liveStats?.current_streak_type || stats.currentStreak.type || 'streak').toString().toLowerCase()}`}
              tone={(liveStats?.current_streak_type === 'LOSS' || stats.currentStreak.type === 'LOSS') ? 'destructive' : 'primary'}
            />
            <DeepStat
              icon={AlertTriangle}
              label="Max Loss Streak"
              value={(liveStats?.max_loss_streak ?? stats.maxLossStreak) > 0 ? `${liveStats?.max_loss_streak ?? stats.maxLossStreak}` : '—'}
              hint="worst losing run"
              tone="destructive"
            />
            <DeepStat
              icon={Clock}
              label="Active Hours"
              value={(advisor as any)?.preferred_trading_hours || (liveStats?.active_hour != null ? `${String(liveStats.active_hour).padStart(2,'0')}:00 – ${String((liveStats.active_hour+1)%24).padStart(2,'0')}:00 IST` : (stats.activeHours || '—'))}
              hint={(advisor as any)?.preferred_trading_hours ? 'advisor pinned' : 'when signals drop'}
            />
            <DeepStat icon={ShieldCheck} label="Risk Level" value={risk.label} hint={(advisor as any)?.risk_level ? 'advisor stated' : 'auto-derived'} />
            <DeepStat icon={Lock} label="Audit Trail" value="Immutable" hint="entry/target/SL locked" />
          </div>
        </section>

        {/* RECENT SIGNALS STRIP */}
        {stats.recent.length > 0 && (
          <section className="container mx-auto max-w-5xl px-4 mt-8">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold uppercase tracking-widest text-foreground">Last 5 Signals</h2>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
              {stats.recent.map(s => {
                const r = s.result;
                const ico = r === 'WIN' ? '✅' : r === 'LOSS' ? '❌' : '⏳';
                const tone = r === 'WIN' ? 'border-primary/40 bg-primary/5' : r === 'LOSS' ? 'border-destructive/40 bg-destructive/5' : 'border-border bg-muted/40';
                return (
                  <div key={s.id} className={`shrink-0 rounded-xl border-[1.5px] ${tone} px-3 py-2 min-w-[140px]`}>
                    <p className="text-[11px] text-muted-foreground">{s.signal_date}</p>
                    <p className="text-sm font-bold text-foreground truncate">{s.instrument || '—'}</p>
                    <p className="text-[11px] font-semibold mt-0.5">
                      <span className={s.signal_type === 'BUY' ? 'text-primary' : 'text-destructive'}>{s.signal_type}</span> · {ico}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* BIO + CONTACT */}
        <section className="container mx-auto max-w-5xl px-4 mt-8 grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2 rounded-2xl border border-border bg-card p-5">
            <h3 className="text-sm font-bold uppercase tracking-widest text-foreground mb-2">About</h3>
            <p className="text-sm text-foreground/80 leading-relaxed">{recentBio}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-sm font-bold uppercase tracking-widest text-foreground mb-3">Contact</h3>
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium text-foreground truncate">{getContactDisplay(advisor.email)}</span>
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium text-foreground truncate">{getContactDisplay(advisor.phone)}</span>
              </div>
            </div>
          </div>
        </section>

        {/* TRADING CHANNELS */}
        <section className="container mx-auto max-w-5xl px-4 mt-8">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-foreground">Trading Channels</h2>
          </div>

          {groups.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
              <Activity className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm font-semibold text-foreground">No active channels yet</p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {groups.map((group, idx) => (
                <div key={group.id} className="relative rounded-2xl border-[1.5px] border-border bg-card p-5 hover:border-primary/40 transition group/card overflow-hidden">
                  {idx === 0 && (
                    <div className="absolute top-0 right-0 bg-primary text-white text-[10px] font-bold px-2.5 py-0.5 rounded-bl-lg uppercase tracking-widest">Popular</div>
                  )}
                  <h3 className="text-base font-bold text-foreground mb-1 truncate group-hover/card:text-primary transition-colors">{group.name}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{group.description || 'Premium signals & market analysis.'}</p>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-2xl font-extrabold text-foreground tracking-tight">₹{group.monthly_price}</p>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">per month</p>
                    </div>
                    <Link to={`/group/${group.id}`}>
                      <Button size="sm" className="rounded-xl shadow-md font-bold">
                        View Channel <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, accent }: { icon: any; label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-4 shadow-sm ${accent ? 'ring-1 ring-primary/20' : ''}`}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className={`h-3.5 w-3.5 ${accent ? 'text-primary' : 'text-muted-foreground'}`} />
        <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">{label}</p>
      </div>
      <p className={`text-2xl md:text-3xl font-extrabold tracking-tight ${accent ? 'text-primary' : 'text-foreground'}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{sub}</p>}
    </div>
  );
}

function DeepStat({ icon: Icon, label, value, hint, tone }: { icon: any; label: string; value: string; hint?: string; tone?: 'primary' | 'destructive' }) {
  const valueClass =
    tone === 'destructive' ? 'text-destructive' :
    tone === 'primary' ? 'text-primary' : 'text-foreground';
  return (
    <div className="rounded-xl border border-border bg-card p-3.5 hover:border-primary/30 transition">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground truncate">{label}</p>
      </div>
      <p className={`text-lg font-extrabold tracking-tight truncate ${valueClass}`}>{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{hint}</p>}
    </div>
  );
}
