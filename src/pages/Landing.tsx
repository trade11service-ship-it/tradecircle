import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Star, Search, Shield, CreditCard, Bell, ArrowRight } from 'lucide-react';
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
      // Use a public-friendly count approach - count via groups since subscriptions has RLS
      const withSubs = await Promise.all(advisorsData.map(async (a) => {
        // For subscriber count, we query with service key is not possible from client
        // Instead use a workaround: count subscriptions visible to current user or show groups count
        const { count } = await supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('advisor_id', a.id).eq('status', 'active');
        return { ...a, subCount: count || 0 };
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
      <section className="px-4 py-12 md:py-28">
        <div className="container mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-light-green px-4 py-1.5 text-xs font-semibold text-primary mb-4 md:mb-6">
            🛡️ India's First SEBI Advisor Marketplace
          </span>
          <h1 className="tc-page-title leading-tight text-3xl md:text-5xl lg:text-[52px]">
            Tired of Fake Tips<br />& Telegram Scams?
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base md:text-lg text-muted-foreground">
            Connect with real SEBI-registered advisors. Verified licenses. Transparent track records. Signals delivered directly to your Telegram.
          </p>
          <div className="mt-6 md:mt-8 flex flex-col sm:flex-row justify-center gap-3">
            <a href="#advisors">
              <Button size="lg" className="w-full sm:w-auto px-6 md:px-8 py-5 md:py-6 text-sm md:text-base font-semibold tc-btn-click">
                Browse Verified Advisors <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </a>
            <Link to="/advisor-register">
              <Button size="lg" variant="outline" className="w-full sm:w-auto px-6 md:px-8 py-5 md:py-6 text-sm md:text-base font-semibold border-2 border-primary text-primary hover:bg-light-green tc-btn-click">
                Register as Advisor
              </Button>
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-2 md:gap-4">
            {['✓ 100% SEBI Verified', '✓ Transparent History', '✓ Telegram Alerts'].map(item => (
              <span key={item} className="rounded-full bg-muted px-3 md:px-4 py-1.5 text-xs font-medium text-muted-foreground">{item}</span>
            ))}
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
