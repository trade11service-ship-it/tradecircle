import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Star, Search, Shield, ShieldCheck, FileCheck, Lock, CreditCard, Bell, ArrowRight } from 'lucide-react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { useAuth } from '@/lib/auth';
import type { Tables } from '@/integrations/supabase/types';

type Advisor = Tables<'advisors'>;

export default function Landing() {
  const { user } = useAuth();
  const [advisors, setAdvisors] = useState<(Advisor & { groups: { monthly_price: number }[]; subCount: number })[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [subscribedGroups, setSubscribedGroups] = useState<any[]>([]);

  useEffect(() => { fetchAdvisors(); }, []);
  useEffect(() => { if (user) fetchSubscribedGroups(); }, [user]);

  const fetchAdvisors = async () => {
    const { data: advisorsData } = await supabase
      .from('advisors')
      .select('*, groups(monthly_price)')
      .eq('status', 'approved');
    if (advisorsData) {
      const withSubs = await Promise.all(advisorsData.map(async (a) => {
        // Use security definer function for public subscriber count
        const { data: countData } = await supabase.rpc('get_advisor_subscriber_count', { _advisor_id: a.id });
        return { ...a, subCount: (countData as number) || 0 };
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

  const filters = ['All', 'Options', 'Equity', 'Futures'];

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
      <section id="how-it-works" className="px-4 py-12 md:py-20">
        <div className="container mx-auto text-center">
          <h2 className="tc-section-title text-xl md:text-[28px]">How TradeCircle Works</h2>
          <p className="mt-2 text-sm md:text-base text-muted-foreground">3 steps to smarter trading</p>
          <div className="mt-8 md:mt-12 grid gap-4 md:gap-8 md:grid-cols-3">
            {[
              { num: '01', icon: Search, title: 'Browse Verified Advisors', desc: 'Explore SEBI-registered advisors with transparent past performance and verified credentials.' },
              { num: '02', icon: CreditCard, title: 'Subscribe to a Group', desc: 'Choose a signal group that matches your trading style and pay securely via Razorpay.' },
              { num: '03', icon: Bell, title: 'Get Signals on Telegram', desc: 'Receive real-time trading signals delivered directly to your Telegram. Never miss an opportunity.' },
            ].map((step, i) => (
              <div key={step.num} className="tc-card p-6 md:p-8 text-center relative animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="mx-auto mb-3 md:mb-4 flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-2xl bg-light-green text-lg md:text-xl font-extrabold text-primary">
                  {step.num}
                </div>
                <step.icon className="mx-auto mb-2 md:mb-3 h-6 w-6 md:h-8 md:w-8 text-primary" />
                <h3 className="tc-card-title text-sm md:text-base">{step.title}</h3>
                <p className="mt-2 text-xs md:text-sm text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Top Advisors */}
      <section id="advisors" className="tc-section-alt px-4">
        <div className="container mx-auto">
          <div className="mb-6 md:mb-8 text-center">
            <h2 className="tc-section-title text-xl md:text-[28px]">Top Advisors</h2>
            <p className="mt-2 text-sm text-muted-foreground">Subscribe to get real-time trading signals</p>
          </div>

          <div className="mb-6 md:mb-8 flex flex-col gap-3 md:gap-4 md:flex-row md:items-center md:justify-center">
            <div className="relative max-w-sm flex-1 w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search by name or strategy..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 tc-input-focus" />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {filters.map(f => (
                <Button key={f} variant={filter === f ? 'default' : 'outline'} size="sm" onClick={() => setFilter(f)} className="tc-btn-click min-h-[44px] whitespace-nowrap">{f}</Button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-muted-foreground">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              Loading advisors...
            </div>
          ) : filtered.length === 0 ? (
            <div className="tc-card-static py-16 text-center">
              <p className="text-lg text-muted-foreground">No advisors found</p>
              <p className="mt-1 tc-small">Try a different search or filter</p>
            </div>
          ) : (
            <div className="grid gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((advisor, i) => {
                const minPrice = advisor.groups?.length > 0 ? Math.min(...advisor.groups.map((g: any) => g.monthly_price)) : null;
                return (
                  <div key={advisor.id} className="tc-card p-4 md:p-6 animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                    <div className="flex items-center gap-3 md:gap-4">
                      <div className="flex h-12 w-12 md:h-14 md:w-14 shrink-0 items-center justify-center rounded-full bg-primary text-base md:text-lg font-bold text-primary-foreground overflow-hidden">
                        {advisor.profile_photo_url ? (
                          <img src={advisor.profile_photo_url} alt={advisor.full_name} className="h-full w-full rounded-full object-cover" />
                        ) : (
                          advisor.full_name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate tc-card-title text-sm md:text-base">{advisor.full_name}</p>
                        <span className="tc-badge-sebi mt-1 text-xs">
                          <Shield className="h-3 w-3" /> SEBI: {advisor.sebi_reg_no}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 md:mt-4 flex items-center gap-2">
                      <span className="tc-badge-strategy text-xs">{advisor.strategy_type}</span>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Star className="h-3.5 w-3.5 fill-current text-[hsl(45,93%,47%)]" /> 4.5
                      </div>
                    </div>
                    <p className="mt-2 md:mt-3 tc-small">{advisor.subCount} subscribers</p>
                    {minPrice && <p className="mt-1 text-sm md:text-base tc-amount">Starting from ₹{minPrice}/month</p>}
                    <Link to={`/advisor/${advisor.id}`}>
                      <Button className="mt-3 md:mt-4 w-full border-2 border-primary text-primary hover:bg-light-green tc-btn-click min-h-[44px]" variant="outline" size="sm">
                        View Profile <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Why TradeCircle */}
      <section className="px-4 py-12 md:py-20">
        <div className="container mx-auto text-center">
          <h2 className="tc-section-title text-xl md:text-[28px]">Why TradeCircle?</h2>
          <div className="mt-8 md:mt-10 grid gap-4 md:gap-6 grid-cols-2 lg:grid-cols-3">
            {[
              { icon: '🛡️', title: 'Only SEBI Registered', desc: 'Every advisor is manually verified for valid SEBI registration before listing.' },
              { icon: '📊', title: 'Transparent Past Performance', desc: 'Full signal history with WIN/LOSS records visible to everyone.' },
              { icon: '🔔', title: 'Telegram Alerts Built-In', desc: 'Get trading signals delivered to your Telegram instantly.' },
              { icon: '🚫', title: 'We Are Just a Listing Platform', desc: 'We don\'t give advice. We connect you with verified professionals.' },
              { icon: '💬', title: 'Direct Advisor Access', desc: 'Subscribe directly to advisors you trust, no middlemen.' },
              { icon: '₹', title: 'Fair Transparent Pricing', desc: 'Clear monthly pricing. Cancel anytime. No hidden charges.' },
            ].map((item, i) => (
              <div key={i} className="tc-card p-4 md:p-6 text-left">
                <span className="text-xl md:text-2xl">{item.icon}</span>
                <h3 className="mt-2 md:mt-3 tc-card-title text-sm md:text-base">{item.title}</h3>
                <p className="mt-1 md:mt-2 text-xs md:text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pain Point */}
      <section className="bg-secondary px-4 py-12 md:py-20">
        <div className="container mx-auto max-w-2xl text-center text-secondary-foreground">
          <h2 className="text-xl md:text-[28px] font-bold">You've probably been there...</h2>
          <div className="mt-6 md:mt-8 space-y-3 text-left">
            {[
              'Lost money following unverified Telegram gurus',
              'Paid for tips with zero accountability',
              'Got promises with no track record to show',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-sm md:text-lg">
                <span className="text-destructive font-bold">✗</span>
                <span className="opacity-90">{item}</span>
              </div>
            ))}
          </div>
          <div className="my-6 md:my-8 h-0.5 w-24 mx-auto bg-primary rounded-full" />
          <p className="text-sm md:text-lg font-medium opacity-90">
            TradeCircle fixes this. SEBI registered. Accountable. Transparent.
          </p>
          <a href="#advisors">
            <Button size="lg" className="mt-5 md:mt-6 bg-card text-foreground hover:bg-card/90 tc-btn-click font-semibold min-h-[44px]">
              Find Your Advisor <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </a>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 py-12 md:py-20">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="tc-section-title text-xl md:text-[28px]">Frequently Asked Questions</h2>
          <p className="mt-2 text-sm text-muted-foreground">Got questions? We've got answers.</p>
          <div className="mt-8 md:mt-10 text-left">
            <Accordion type="single" collapsible className="space-y-3">
              {[
                { q: 'Is TradeCircle an investment advisor?', a: 'No. TradeCircle is a technology platform that connects traders with independently SEBI-registered investment advisors. We do not provide any investment advice or trading recommendations.' },
                { q: 'How are advisors verified?', a: 'Every advisor on TradeCircle is manually verified for a valid SEBI registration number before being listed. We check their credentials against official SEBI records.' },
                { q: 'How do I receive trading signals?', a: 'Once you subscribe to an advisor\'s group, you receive real-time trading signals directly on Telegram. Just link your Telegram username in your dashboard settings.' },
                { q: 'Can I cancel my subscription?', a: 'Subscriptions are billed monthly and are non-refundable. However, you can choose not to renew at the end of your billing period.' },
                { q: 'Is my payment secure?', a: 'Yes! All payments are processed securely through Razorpay, a trusted payment gateway used by millions of Indians.' },
              ].map((faq, i) => (
                <AccordionItem key={i} value={`faq-${i}`} className="tc-card px-4 md:px-6 border rounded-xl">
                  <AccordionTrigger className="text-left text-sm md:text-base font-semibold text-foreground hover:no-underline">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
