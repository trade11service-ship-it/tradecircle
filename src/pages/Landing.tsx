import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Star, Search, Shield, ShieldCheck, FileCheck, Lock, CreditCard, Bell, ArrowRight, BarChart2, Eye, Users, IndianRupee, RefreshCw, MessageCircle, Plus, Minus } from 'lucide-react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { useAuth } from '@/lib/auth';
import type { Tables } from '@/integrations/supabase/types';

type Advisor = Tables<'advisors'>;
type AdvisorWithStats = Advisor & { groups: { monthly_price: number }[]; subCount: number; signalStats: { total_signals: number; win_count: number; loss_count: number; resolved_count: number } };

export default function Landing() {
  const { user } = useAuth();
  const [advisors, setAdvisors] = useState<AdvisorWithStats[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [subscribedGroups, setSubscribedGroups] = useState<any[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => { fetchAdvisors(); }, []);
  useEffect(() => { if (user) fetchSubscribedGroups(); }, [user]);

  const fetchAdvisors = async () => {
    const { data: advisorsData } = await supabase
      .from('advisors')
      .select('*, groups(monthly_price)')
      .eq('status', 'approved');
    if (advisorsData) {
      const withSubs = await Promise.all(advisorsData.map(async (a) => {
        const [{ data: countData }, { data: statsData }] = await Promise.all([
          supabase.rpc('get_advisor_subscriber_count', { _advisor_id: a.id }),
          supabase.rpc('get_advisor_signal_stats', { _advisor_id: a.id }),
        ]);
        return {
          ...a,
          subCount: (countData as number) || 0,
          signalStats: (statsData as any) || { total_signals: 0, win_count: 0, loss_count: 0, resolved_count: 0 },
        };
      }));
      setAdvisors(withSubs as any);
    }
    setLoading(false);
  };

  const fetchSubscribedGroups = async () => {
    const { data } = await supabase
      .from('subscriptions')
      .select('*, groups!inner(id, name, monthly_price, advisor_id, advisors!inner(full_name, profile_photo_url, sebi_reg_no, strategy_type))')
      .eq('user_id', user!.id)
      .eq('status', 'active');
    // Deduplicate by group_id - keep only latest subscription per group
    const uniqueMap = new Map<string, any>();
    (data || []).forEach(sub => {
      const existing = uniqueMap.get(sub.group_id);
      if (!existing || new Date(sub.created_at || 0) > new Date(existing.created_at || 0)) {
        uniqueMap.set(sub.group_id, sub);
      }
    });
    setSubscribedGroups(Array.from(uniqueMap.values()));
  };

  const filtered = advisors.filter(a => {
    const matchSearch = a.full_name.toLowerCase().includes(search.toLowerCase()) || a.strategy_type?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'All' || a.strategy_type === filter;
    return matchSearch && matchFilter;
  });

  const filters = ['All', 'Options', 'Equity', 'Futures', 'Intraday', 'Swing'];
  const displayedAdvisors = showAll ? filtered : filtered.slice(0, 4);

  const trustItems = [
    '🛡️ SEBI Verified Only',
    '📊 Full Signal History',
    '🔔 Instant Telegram Alerts',
    '₹ Cancel Anytime',
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative px-5 pt-8 pb-10 md:pt-20 md:pb-16 overflow-hidden">
        {/* Subtle green radial glow */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[300px] opacity-60" style={{ background: 'radial-gradient(ellipse 600px 300px at 50% -50px, hsl(120,52%,93%) 0%, transparent 70%)' }} />

        <div className="container relative mx-auto max-w-lg md:max-w-2xl text-center">
          {/* Hero Badge */}
          <span className="inline-flex items-center gap-2 rounded-full border border-primary px-5 py-2 text-[13px] font-bold text-primary tracking-wide" style={{ background: 'linear-gradient(135deg, hsl(120,52%,93%) 0%, hsl(213,100%,94%) 100%)' }}>
            <Shield className="h-4 w-4" /> SEBI Verified Advisor Marketplace
          </span>

          {/* Main Headline */}
          <h1 className="mt-5 leading-tight">
            <span className="block text-[32px] md:text-[40px] font-extrabold text-secondary tracking-tight">India's Most Trusted</span>
            <span className="relative inline-block text-[32px] md:text-[40px] font-extrabold text-foreground tracking-tight">
              Trading Advisory Platform
              <span className="absolute bottom-0 left-0 h-1 rounded-full bg-primary animate-hero-underline" />
            </span>
          </h1>

          {/* Authority Subtext */}
          <p className="mx-auto mt-4 max-w-[300px] md:max-w-md text-[15px] leading-[1.7] text-muted-foreground">
            Every advisor on TradeCircle holds a valid SEBI registration number — manually verified by our team before they can post a single signal.
          </p>

          {/* SEBI Authority Badge Row */}
          <div className="mt-6 flex justify-center gap-3 overflow-x-auto pb-1">
            {[
              { icon: <ShieldCheck className="h-5 w-5 text-primary" />, line1: 'SEBI Verified', line2: 'All Advisors' },
              { icon: <FileCheck className="h-5 w-5 text-secondary" />, line1: 'Manual KYC', line2: 'Every Advisor' },
              { icon: <Lock className="h-5 w-5 text-primary" />, line1: 'Legally Bound', line2: 'By SEBI Rules' },
            ].map((badge, i) => (
              <div key={i} className="flex min-w-[100px] flex-col items-center rounded-[10px] border-[1.5px] border-border bg-card px-4 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
                {badge.icon}
                <span className="mt-1.5 text-[13px] font-bold text-foreground">{badge.line1}</span>
                <span className="text-[11px] text-muted-foreground">{badge.line2}</span>
              </div>
            ))}
          </div>

          {/* Primary CTA */}
          <a href="#advisors">
            <Button className="mt-7 w-full h-[54px] rounded-xl bg-primary text-[17px] font-bold tracking-wide shadow-[0_6px_20px_rgba(27,94,32,0.35)] hover:bg-primary/90 hover:-translate-y-px hover:shadow-[0_8px_24px_rgba(27,94,32,0.4)] transition-all duration-200 tc-btn-click">
              Explore Verified Advisors <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </a>

          {/* Secondary CTA */}
          <Link to="/advisor-register">
            <Button variant="outline" className="mt-3 w-full h-[50px] rounded-xl border-2 border-secondary text-secondary text-base font-semibold hover:bg-light-blue tc-btn-click">
              Join as SEBI Advisor
            </Button>
          </Link>

          {/* Trust Highlights */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-[12px] font-medium text-muted-foreground">
            <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5 text-primary" /> SEBI Compliant</span>
            <span className="text-border">•</span>
            <span className="inline-flex items-center gap-1"><Bell className="h-3.5 w-3.5 text-secondary" /> Instant Telegram Signals</span>
            <span className="text-border">•</span>
            <span className="inline-flex items-center gap-1"><CreditCard className="h-3.5 w-3.5 text-primary" /> Cancel Anytime</span>
          </div>
        </div>
      </section>

      {/* Trust Bar - Animated Marquee */}
      <section className="border-y bg-off-white overflow-hidden">
        <div className="flex animate-marquee whitespace-nowrap py-4">
          {[...trustItems, ...trustItems, ...trustItems].map((item, i) => (
            <span key={i} className="mx-4 md:mx-8 text-sm font-medium text-muted-foreground inline-flex items-center gap-2">
              {item}
              <span className="text-border">•</span>
            </span>
          ))}
        </div>
      </section>

      {/* My Subscriptions - shown for logged in users who have subs */}
      {user && subscribedGroups.length > 0 && (
        <section className="px-4 py-8 md:py-12">
          <div className="container mx-auto">
            <div className="mb-4 md:mb-6 flex items-center justify-between">
              <div>
                <h2 className="tc-section-title text-xl md:text-[28px]">Your Active Subscriptions</h2>
                <p className="mt-1 text-sm text-muted-foreground">Quick access to your subscribed advisors</p>
              </div>
              <Link to="/dashboard">
                <Button variant="outline" size="sm" className="tc-btn-click border-primary text-primary hover:bg-light-green">
                  Dashboard <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </div>
            <div className="grid gap-3 md:gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {subscribedGroups.map((sub: any) => (
                <div key={sub.id} className="tc-card p-4 md:p-5 border-l-4 border-l-primary">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 md:h-11 md:w-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground overflow-hidden">
                      {sub.groups.advisors.profile_photo_url ? (
                        <img src={sub.groups.advisors.profile_photo_url} alt="" className="h-full w-full rounded-full object-cover" />
                      ) : (
                        sub.groups.advisors.full_name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="tc-card-title truncate text-sm md:text-base">{sub.groups.name}</p>
                      <p className="tc-small truncate">by {sub.groups.advisors.full_name}</p>
                    </div>
                    <span className="tc-badge-active text-xs">Active</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="tc-badge-sebi text-xs"><Shield className="h-3 w-3" /> {sub.groups.advisors.sebi_reg_no}</span>
                    <Link to="/dashboard">
                      <Button size="sm" variant="ghost" className="text-xs text-primary tc-btn-click">View Signals →</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How It Works */}
      <section id="how-it-works" className="bg-muted px-5 py-12 md:py-16">
        <div className="container mx-auto">
          {/* Header */}
          <div className="text-center">
            <span className="inline-block rounded-full border border-secondary bg-light-blue px-3.5 py-1 text-[11px] font-bold text-secondary mb-2.5">SIMPLE PROCESS</span>
            <h2 className="text-[26px] font-extrabold text-foreground tracking-tight">How It Works</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">From discovery to signals in 3 steps</p>
          </div>

          {/* Mobile Timeline */}
          <div className="relative mx-auto mt-7 max-w-[340px] md:hidden">
            {/* Vertical line */}
            <div className="absolute left-[27px] top-7 bottom-7 w-0.5 z-0" style={{ background: 'linear-gradient(to bottom, hsl(var(--primary)), hsl(var(--secondary)), hsl(var(--primary)))' }} />

            {[
              { num: 1, title: 'Browse Verified Advisors', desc: 'Filter by strategy, check full signal history and SEBI credentials.', tag: '🛡️ SEBI verified only' },
              { num: 2, title: 'Subscribe to a Group', desc: 'Choose your advisor\'s group and pay securely. Cancel anytime.', tag: '💳 Powered by Razorpay' },
              { num: 3, title: 'Get Signals on Telegram', desc: 'Every trade alert lands directly in your personal Telegram.', tag: '🔔 Real-time delivery' },
            ].map((step, i) => (
              <div key={step.num} className="relative z-[1] flex items-start gap-4 mb-6 last:mb-0">
                <div className="flex h-14 w-14 min-w-[56px] items-center justify-center rounded-full border-[2.5px] border-primary bg-card text-xl font-extrabold text-primary shadow-[0_4px_12px_rgba(27,94,32,0.15)]">
                  {step.num}
                </div>
                <div className="pt-2">
                  <h3 className="text-base font-bold text-foreground">{step.title}</h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{step.desc}</p>
                  <span className="mt-2 inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground">{step.tag}</span>
                </div>
              </div>
            ))}

            {/* Bottom CTA card */}
            <div className="mt-2 rounded-xl border-[1.5px] border-primary bg-card p-4 text-center">
              <p className="text-sm font-semibold text-foreground">Ready to find your advisor?</p>
              <a href="#advisors">
                <Button className="mt-2.5 w-full rounded-lg bg-primary text-sm font-semibold tc-btn-click">
                  Browse Advisors <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </a>
            </div>
          </div>

          {/* Desktop 3-column */}
          <div className="relative mt-10 hidden md:grid md:grid-cols-3 md:gap-6 lg:gap-8 max-w-3xl mx-auto">
            {[
              { num: 1, icon: Search, title: 'Browse Verified Advisors', desc: 'Filter by strategy, check full signal history and SEBI credentials.', tag: '🛡️ SEBI verified only' },
              { num: 2, icon: CreditCard, title: 'Subscribe to a Group', desc: 'Choose your advisor\'s group and pay securely. Cancel anytime.', tag: '💳 Powered by Razorpay' },
              { num: 3, icon: Bell, title: 'Get Signals on Telegram', desc: 'Every trade alert lands directly in your personal Telegram.', tag: '🔔 Real-time delivery' },
            ].map((step, i) => (
              <div key={step.num} className="relative rounded-2xl border-[1.5px] border-border bg-card p-7 text-center shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
                {/* Arrow between cards */}
                {i < 2 && (
                  <div className="absolute -right-4 top-1/2 -translate-y-1/2 z-10">
                    <ArrowRight className="h-5 w-5 text-primary opacity-40" />
                  </div>
                )}
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-[2.5px] border-primary bg-card text-xl font-extrabold text-primary shadow-[0_4px_12px_rgba(27,94,32,0.15)]">
                  {step.num}
                </div>
                <step.icon className="mx-auto mt-3 h-8 w-8 text-primary" />
                <h3 className="mt-3 text-[17px] font-bold text-foreground">{step.title}</h3>
                <p className="mt-2 text-[13px] text-muted-foreground">{step.desc}</p>
                <span className="mt-3 inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">{step.tag}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Top Advisors */}
      <section id="advisors" className="bg-background px-5 py-13 md:py-16">
        <div className="container mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-5">
            <div>
              <span className="text-[11px] font-bold text-primary uppercase tracking-[2px]">VERIFIED ADVISORS</span>
              <h2 className="mt-1 text-[28px] font-extrabold text-foreground tracking-tight">Top Advisors</h2>
            </div>
            <span className="mt-1 md:mt-0 text-[13px] text-muted-foreground flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary" /> Updated daily
            </span>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--small-text))]" />
            <Input
              placeholder="Search advisors, strategies..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-12 rounded-xl border-[1.5px] border-border bg-muted pl-11 text-sm focus:border-primary focus:bg-card focus:ring-2 focus:ring-primary/10"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex gap-2 overflow-x-auto pb-1 mb-5 no-scrollbar">
            {filters.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`h-9 shrink-0 rounded-full border-[1.5px] px-4 text-[13px] font-semibold transition-all duration-200 ${
                  filter === f
                    ? 'border-foreground bg-foreground text-background shadow-[0_2px_8px_rgba(0,0,0,0.15)]'
                    : 'border-border bg-card text-muted-foreground hover:border-foreground/30'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Cards */}
          {loading ? (
            <div className="py-16 text-center text-muted-foreground">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              Loading advisors...
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card py-16 text-center">
              <p className="text-lg text-muted-foreground">No advisors found</p>
              <p className="mt-1 text-[13px] text-[hsl(var(--small-text))]">Try a different search or filter</p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {displayedAdvisors.map((advisor, i) => {
                  const minPrice = advisor.groups?.length > 0 ? Math.min(...advisor.groups.map((g: any) => g.monthly_price)) : null;
                  const { total_signals, resolved_count, win_count } = advisor.signalStats;
                  const winRate = resolved_count > 0 ? Math.round((win_count / resolved_count) * 100) : null;
                  const sebiShort = advisor.sebi_reg_no.length > 12 ? advisor.sebi_reg_no.slice(0, 12) + '…' : advisor.sebi_reg_no;

                  return (
                    <div
                      key={advisor.id}
                      className="group overflow-hidden rounded-2xl border-[1.5px] border-border bg-card shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all duration-200 hover:border-primary hover:shadow-[0_8px_24px_rgba(27,94,32,0.12)] hover:-translate-y-0.5 animate-fade-in"
                      style={{ animationDelay: `${i * 50}ms` }}
                    >
                      {/* Top gradient bar */}
                      <div className="h-1" style={{ background: 'linear-gradient(to right, hsl(var(--primary)), hsl(var(--secondary)))' }} />

                      <div className="p-4">
                        {/* Row 1: Identity */}
                        <div className="flex items-center gap-3">
                          <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full border-2 border-card text-xl font-bold text-primary-foreground shadow-[0_2px_8px_rgba(0,0,0,0.15)] overflow-hidden" style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))' }}>
                            {advisor.profile_photo_url ? (
                              <img src={advisor.profile_photo_url} alt={advisor.full_name} className="h-full w-full object-cover" />
                            ) : (
                              advisor.full_name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-base font-bold text-foreground">{advisor.full_name}</p>
                            <span className="inline-flex items-center gap-1 rounded-full border border-primary bg-light-green px-2 py-0.5 text-[10px] font-semibold text-primary">
                              ✓ SEBI {sebiShort}
                            </span>
                          </div>
                          {advisor.strategy_type && (
                            <span className="shrink-0 rounded-md bg-light-blue px-2.5 py-1 text-[11px] font-semibold text-secondary">
                              {advisor.strategy_type}
                            </span>
                          )}
                        </div>

                        {/* Row 2: Stats */}
                        <div className="mt-3.5 grid grid-cols-3 rounded-[10px] bg-muted p-2.5">
                          <div className="text-center">
                            <p className="text-base font-extrabold text-primary">{winRate !== null ? `${winRate}%` : '—'}</p>
                            <p className="text-[10px] text-[hsl(var(--small-text))]">Win Rate</p>
                          </div>
                          <div className="border-x border-border text-center">
                            <p className="text-base font-extrabold text-foreground">{total_signals || '—'}</p>
                            <p className="text-[10px] text-[hsl(var(--small-text))]">Signals</p>
                          </div>
                          <div className="text-center">
                            <p className="text-base font-extrabold text-secondary">{advisor.subCount}</p>
                            <p className="text-[10px] text-[hsl(var(--small-text))]">Members</p>
                          </div>
                        </div>

                        {/* Row 3: Price + Rating */}
                        <div className="mt-3 flex items-center justify-between">
                          {minPrice ? (
                            <p className="text-[15px] font-bold text-foreground">From ₹{minPrice}/mo</p>
                          ) : (
                            <p className="text-[13px] text-[hsl(var(--small-text))]">Price on profile</p>
                          )}
                          <div className="flex items-center gap-1 text-[13px]">
                            <Star className="h-3.5 w-3.5 fill-current text-warning" />
                            <span className="font-semibold text-foreground">4.5</span>
                          </div>
                        </div>

                        {/* FOMO pill */}
                        <div className="mt-3 text-center">
                          {advisor.subCount > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-warning bg-[hsl(45,100%,94%)] px-2.5 py-1 text-[11px] font-medium text-[hsl(30,80%,30%)]">
                              🔥 {advisor.subCount} traders joined
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-secondary bg-light-blue px-2.5 py-1 text-[11px] font-medium text-secondary">
                              🆕 Be the first subscriber
                            </span>
                          )}
                        </div>

                        {/* CTA */}
                        <Link to={`/advisor/${advisor.id}`}>
                          <Button className="mt-3 w-full h-[46px] rounded-[10px] bg-primary text-[15px] font-bold hover:bg-primary/90 hover:shadow-[0_4px_12px_rgba(27,94,32,0.3)] transition-all tc-btn-click">
                            View Profile & Subscribe <ArrowRight className="ml-1 h-4 w-4" />
                          </Button>
                        </Link>
                      </div>

                      {/* Verified footer */}
                      <div className="flex h-8 items-center justify-center gap-1.5 border-t border-border bg-muted">
                        <Shield className="h-3 w-3 text-primary" />
                        <span className="text-[10px] font-medium text-muted-foreground">SEBI Verified · Manually Approved</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Load More */}
              {!showAll && filtered.length > 4 && (
                <button
                  onClick={() => setShowAll(true)}
                  className="mt-4 w-full rounded-[10px] border-[1.5px] border-border bg-card py-3 text-sm text-muted-foreground hover:border-foreground/30 transition-colors"
                >
                  Load More Advisors
                </button>
              )}

              {/* Bottom CTA banner */}
              <div className="mt-4 rounded-2xl p-5 text-center" style={{ background: 'linear-gradient(135deg, hsl(120,52%,93%), hsl(213,100%,94%))' }}>
                <p className="text-[15px] font-bold text-foreground">Are you a SEBI registered advisor?</p>
                <p className="mt-1 text-[13px] text-muted-foreground">Join 50+ advisors already growing their subscriber base</p>
                <Link to="/advisor-register">
                  <Button className="mt-3 rounded-lg bg-secondary px-6 text-sm font-semibold hover:bg-secondary/90 tc-btn-click">
                    Apply as Advisor <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Why TradeCircle */}
      <section className="bg-background px-5 py-12 md:py-16">
        <div className="container mx-auto max-w-2xl">
          <div className="text-center">
            <span className="text-[11px] font-bold text-primary uppercase tracking-[3px]">WHY TRADECIRCLE</span>
            <h2 className="mt-1.5 text-[28px] font-extrabold leading-[1.2] tracking-tight text-foreground">
              Built <span className="underline decoration-primary decoration-[3px] underline-offset-4">Different</span>.<br />For Indian Traders.
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">Everything your Telegram channel never gave you.</p>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4">
            {[
              { icon: Shield, iconBg: 'bg-light-green', iconColor: 'text-primary', title: 'SEBI Verified Only', desc: 'Every advisor manually checked before listing.' },
              { icon: BarChart2, iconBg: 'bg-light-blue', iconColor: 'text-secondary', title: 'Full Track Record', desc: 'WIN/LOSS history public. Nothing hidden ever.' },
              { icon: Bell, iconBg: 'bg-[hsl(270,50%,95%)]', iconColor: 'text-[hsl(270,50%,40%)]', title: 'Telegram Alerts', desc: 'Signals delivered to your Telegram instantly.' },
              { icon: Eye, iconBg: 'bg-[hsl(30,100%,95%)]', iconColor: 'text-[hsl(24,100%,35%)]', title: "We Don't Advise", desc: 'We connect. Advisors advise. Clear separation.' },
              { icon: RefreshCw, iconBg: 'bg-[hsl(170,40%,93%)]', iconColor: 'text-[hsl(170,60%,22%)]', title: 'Cancel Anytime', desc: 'Monthly only. No lock-in. No questions.' },
              { icon: IndianRupee, iconBg: 'bg-[hsl(340,60%,95%)]', iconColor: 'text-[hsl(335,70%,30%)]', title: 'No Hidden Fees', desc: 'Upfront pricing. What you see is what you pay.' },
            ].map((f, i) => (
              <div key={i} className="rounded-[14px] border-[1.5px] border-[hsl(220,13%,95%)] bg-muted p-4 transition-all duration-150 hover:border-primary hover:bg-light-green">
                <div className={`flex h-9 w-9 items-center justify-center rounded-[10px] ${f.iconBg} mb-2.5`}>
                  <f.icon className={`h-[18px] w-[18px] ${f.iconColor}`} />
                </div>
                <h3 className="text-[13px] font-bold leading-snug text-foreground">{f.title}</h3>
                <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Bottom strip */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border-[1.5px] border-border bg-muted px-4 py-3.5">
            <span className="text-sm font-semibold text-foreground">Ready to find your advisor?</span>
            <a href="#advisors">
              <Button className="w-full sm:w-auto rounded-lg bg-primary px-4 py-2 text-[13px] font-semibold tc-btn-click">
                Browse <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Pain Point */}
      <section className="bg-background px-5 py-[52px]">
        <div className="container mx-auto max-w-2xl">
          {/* Header */}
          <div className="text-center mb-9">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-[3px]">THE PROBLEM WE SOLVE</span>
            <h2 className="mt-2.5 text-[28px] font-extrabold leading-[1.2] tracking-tight text-foreground">
              Most Trading Advice<br />in India Has a<br /><span className="text-secondary">Trust</span> Problem.
            </h2>
            <p className="mt-2.5 mx-auto max-w-[300px] text-sm text-muted-foreground leading-relaxed">
              Not because all advisors are bad. Because there's no way to verify the good ones from the rest.
            </p>
          </div>

          {/* Card 1 — Stat Style */}
          <div className="rounded-2xl border-[1.5px] border-border bg-muted p-5">
            <p className="text-4xl font-black tracking-tight text-foreground" style={{ letterSpacing: '-1px' }}>₹47,000 Cr+</p>
            <p className="mt-1 text-[13px] text-muted-foreground leading-normal">
              lost by Indian retail traders<br />to unverified advice annually
            </p>
            <div className="mt-4 flex items-center gap-2">
              <div className="flex h-8 w-8 min-w-[32px] items-center justify-center rounded-lg bg-[hsl(45,100%,94%)]">
                <AlertCircle className="h-4 w-4 text-[hsl(36,90%,50%)]" />
              </div>
              <span className="text-[11px] text-[hsl(var(--small-text))] leading-snug">
                SEBI reports this as India's biggest investor protection issue
              </span>
            </div>
          </div>

          {/* Card 2 — Comparison Style */}
          <div className="mt-4 overflow-hidden rounded-2xl border-[1.5px] border-border bg-card">
            <div className="border-b border-border bg-muted px-4 py-2.5">
              <span className="text-[11px] font-semibold text-muted-foreground tracking-wider">WHAT YOU'RE PROMISED vs REALITY</span>
            </div>
            <div className="grid grid-cols-2 gap-3 p-4">
              {/* Promised */}
              <div>
                <span className="text-[10px] font-semibold text-[hsl(var(--small-text))] uppercase tracking-wider">What They Claim</span>
                <div className="mt-2.5 space-y-2">
                  {['95% accuracy', '₹10,000+ profit/month', 'SEBI registered'].map((t, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <CheckCircle className="h-3.5 w-3.5 text-[hsl(var(--small-text))]" />
                      <span className="text-xs text-muted-foreground">{t}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Divider */}
              <div className="relative">
                <div className="absolute left-0 top-0 bottom-0 w-px bg-border" />
                <div className="pl-3">
                  <span className="text-[10px] font-semibold text-[hsl(var(--small-text))] uppercase tracking-wider">What You Get</span>
                  <div className="mt-2.5 space-y-2">
                    {['No history shown', 'No track record', 'No way to verify'].map((t, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <HelpCircle className="h-3.5 w-3.5 text-[hsl(var(--small-text))]" />
                        <span className="text-xs text-muted-foreground">{t}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3 — Quote Style */}
          <div className="mt-4 rounded-2xl border-[1.5px] border-border bg-muted p-5">
            <span className="block font-serif text-[72px] font-black leading-none text-border" style={{ marginBottom: '-8px' }}>"</span>
            <p className="text-[15px] italic text-muted-foreground leading-relaxed">
              I paid ₹3,000/month for 6 months. When I asked for their track record, the group was deleted.
            </p>
            <div className="mt-3.5 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[hsl(210,80%,94%)] to-[hsl(210,70%,84%)]">
                <span className="text-xs font-bold text-secondary">R</span>
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-semibold text-foreground">Rahul M.</p>
                <p className="text-[11px] text-[hsl(var(--small-text))]">Retail trader, Mumbai</p>
              </div>
              <span className="text-[10px] italic text-[hsl(var(--small-text))]">One of many</span>
            </div>
          </div>

          {/* Transition */}
          <div className="mt-8 flex flex-col items-center">
            <p className="text-[22px] font-extrabold tracking-tight text-foreground" style={{ letterSpacing: '-0.3px' }}>There's a better way.</p>
            <ChevronDown className="mt-2 h-7 w-7 text-primary animate-bounce" style={{ animationDuration: '1.5s' }} />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-muted px-5 py-13 md:py-16">
        <div className="container mx-auto max-w-2xl">
          {/* Header */}
          <div className="mb-7">
            <span className="text-[11px] font-bold text-primary uppercase tracking-[3px]">QUICK ANSWERS</span>
            <h2 className="mt-1.5 text-[28px] font-extrabold leading-[1.2] tracking-tight text-foreground">
              Questions?<br />We're <span className="text-secondary">Straight</span><br />With You.
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">No corporate answers. Just honest replies.</p>
          </div>

          {/* FAQ Accordion */}
          <div className="overflow-hidden rounded-2xl border-[1.5px] border-border bg-card shadow-[0_2px_12px_rgba(0,0,0,0.05)]">
            <Accordion type="single" collapsible defaultValue="faq-0">
              {[
                { q: 'Is TradeCircle a SEBI registered investment advisor?', a: "No — and that's intentional. TradeCircle is a technology marketplace operated by STREZONIC PRIVATE LIMITED. We list and verify SEBI-registered advisors, but we don't give any advice ourselves. Every signal you receive is from that advisor — not from us." },
                { q: 'How do you verify advisors?', a: "Every advisor submits their SEBI registration number, Aadhaar, PAN, and documents during signup. Our team manually checks their license on SEBI's official database before approving. No shortcuts. No exceptions." },
                { q: 'What if the advisor gives a wrong call and I lose money?', a: "Advisors are SEBI registered and legally accountable for their advice — not us. Before subscribing, you can see their full WIN/LOSS history publicly. You choose based on real track records, not just claims." },
                { q: 'How do I get the trading signals?', a: 'Two ways — on our platform feed and directly on your personal Telegram. The moment your advisor posts a signal, it hits your Telegram in under 3 seconds. You never miss a trade.' },
                { q: 'Can I cancel my subscription?', a: 'Yes. Cancel anytime from your dashboard in one click. No questions, no lock-in period, no annual contracts. Monthly subscriptions only.' },
                { q: 'Is my payment secure?', a: "All payments are processed by Razorpay — India's most trusted payment gateway used by Zomato, Swiggy, CRED. We never store your card details." },
                { q: 'Can I subscribe to multiple advisors?', a: 'Absolutely. Subscribe to as many advisor groups as you want. Each subscription is independent and managed separately in your dashboard.' },
                { q: 'How is TradeCircle different from a Telegram channel?', a: "Three big differences: Every advisor is SEBI verified (accountable by law). Every signal is permanently recorded — WIN or LOSS, nothing gets deleted. And you get signals on Telegram anyway — plus a full professional platform." },
              ].map((faq, i) => (
                <AccordionItem
                  key={i}
                  value={`faq-${i}`}
                  className={`border-b border-[hsl(220,13%,96%)] last:border-b-0 ${i === 0 ? 'border-l-[3px] border-l-primary' : ''}`}
                >
                  <AccordionTrigger className="px-5 py-4 text-left text-sm font-semibold text-foreground leading-snug hover:no-underline [&[data-state=open]>div]:bg-light-green [&[data-state=open]>div>svg:first-child]:hidden [&[data-state=open]>div>svg:last-child]:block [&[data-state=closed]>div>svg:first-child]:block [&[data-state=closed]>div>svg:last-child]:hidden [&>svg]:hidden">
                    <span className="flex-1 pr-3">{faq.q}</span>
                    <div className="flex h-7 w-7 min-w-[28px] items-center justify-center rounded-full bg-muted transition-all duration-200">
                      <Plus className="h-4 w-4 text-muted-foreground" />
                      <Minus className="hidden h-4 w-4 text-primary" />
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-5 pb-4 text-[13px] leading-relaxed text-muted-foreground">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          {/* Contact strip */}
          <div className="mt-5 flex items-center gap-3 rounded-xl border-[1.5px] border-border bg-card p-4">
            <div className="flex h-10 w-10 min-w-[40px] items-center justify-center rounded-[10px] bg-light-green">
              <MessageCircle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-foreground">Still have questions?</p>
              <p className="text-[12px] text-muted-foreground">
                Email us at{' '}
                <a href="mailto:trade11.service@gmail.com" className="text-secondary hover:underline">trade11.service@gmail.com</a>
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
