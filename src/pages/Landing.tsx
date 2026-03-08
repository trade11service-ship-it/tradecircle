import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Star, Search, Shield, CreditCard, Bell, MessageCircle, Eye, Ban, IndianRupee, ArrowRight } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Advisor = Tables<'advisors'>;

export default function Landing() {
  const [advisors, setAdvisors] = useState<(Advisor & { groups: { monthly_price: number }[]; subCount: number })[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAdvisors(); }, []);

  const fetchAdvisors = async () => {
    const { data: advisorsData } = await supabase
      .from('advisors')
      .select('*, groups(monthly_price)')
      .eq('status', 'approved');
    if (advisorsData) {
      const withSubs = await Promise.all(advisorsData.map(async (a) => {
        const { count } = await supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('advisor_id', a.id).eq('status', 'active');
        return { ...a, subCount: count || 0 };
      }));
      setAdvisors(withSubs as any);
    }
    setLoading(false);
  };

  const filtered = advisors.filter(a => {
    const matchSearch = a.full_name.toLowerCase().includes(search.toLowerCase()) || a.strategy_type?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'All' || a.strategy_type === filter;
    return matchSearch && matchFilter;
  });

  const filters = ['All', 'Options', 'Equity', 'Futures'];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="tc-section md:py-28">
        <div className="container mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-light-green px-4 py-1.5 text-xs font-semibold text-primary mb-6">
            🛡️ India's First SEBI Advisor Marketplace
          </span>
          <h1 className="tc-page-title leading-tight md:text-5xl lg:text-[52px]">
            Tired of Fake Tips<br />& Telegram Scams?
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
            Connect with real SEBI-registered advisors. Verified licenses. Transparent track records. Signals delivered directly to your Telegram.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a href="#advisors">
              <Button size="lg" className="px-8 py-6 text-base font-semibold tc-btn-click">
                Browse Verified Advisors <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </a>
            <Link to="/advisor-register">
              <Button size="lg" variant="outline" className="px-8 py-6 text-base font-semibold border-2 border-primary text-primary hover:bg-light-green tc-btn-click">
                Register as Advisor
              </Button>
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            {['✓ 100% SEBI Verified', '✓ Transparent History', '✓ Telegram Alerts'].map(item => (
              <span key={item} className="rounded-full bg-muted px-4 py-1.5 text-xs font-medium text-muted-foreground">{item}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="border-y bg-off-white px-4 py-5">
        <div className="container mx-auto flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground md:gap-8">
          <span>🛡️ SEBI Verified Only</span>
          <span className="hidden md:inline">•</span>
          <span>📊 Full Signal History</span>
          <span className="hidden md:inline">•</span>
          <span>🔔 Instant Telegram Alerts</span>
          <span className="hidden md:inline">•</span>
          <span>₹ Cancel Anytime</span>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="tc-section">
        <div className="container mx-auto text-center">
          <h2 className="tc-section-title">How TradeCircle Works</h2>
          <p className="mt-2 text-muted-foreground">3 steps to smarter trading</p>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              { num: '01', icon: Search, title: 'Browse Verified Advisors', desc: 'Explore SEBI-registered advisors with transparent past performance and verified credentials.' },
              { num: '02', icon: CreditCard, title: 'Subscribe to a Group', desc: 'Choose a signal group that matches your trading style and pay securely via Razorpay.' },
              { num: '03', icon: Bell, title: 'Get Signals on Telegram', desc: 'Receive real-time trading signals delivered directly to your Telegram. Never miss an opportunity.' },
            ].map((step, i) => (
              <div key={step.num} className="tc-card p-8 text-center relative animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-light-green text-xl font-extrabold text-primary">
                  {step.num}
                </div>
                <step.icon className="mx-auto mb-3 h-8 w-8 text-primary" />
                <h3 className="tc-card-title">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why TradeCircle */}
      <section className="tc-section-alt">
        <div className="container mx-auto text-center">
          <h2 className="tc-section-title">Why TradeCircle?</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: '🛡️', title: 'Only SEBI Registered', desc: 'Every advisor is manually verified for valid SEBI registration before listing.' },
              { icon: '📊', title: 'Transparent Past Performance', desc: 'Full signal history with WIN/LOSS records visible to everyone.' },
              { icon: '🔔', title: 'Telegram Alerts Built-In', desc: 'Get trading signals delivered to your Telegram instantly.' },
              { icon: '🚫', title: 'We Are Just a Listing Platform', desc: 'We don\'t give advice. We connect you with verified professionals.' },
              { icon: '💬', title: 'Direct Advisor Access', desc: 'Subscribe directly to advisors you trust, no middlemen.' },
              { icon: '₹', title: 'Fair Transparent Pricing', desc: 'Clear monthly pricing. Cancel anytime. No hidden charges.' },
            ].map((item, i) => (
              <div key={i} className="tc-card p-6 text-left">
                <span className="text-2xl">{item.icon}</span>
                <h3 className="mt-3 tc-card-title">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pain Point */}
      <section className="bg-secondary px-4 py-20">
        <div className="container mx-auto max-w-2xl text-center text-secondary-foreground">
          <h2 className="text-[28px] font-bold">You've probably been there...</h2>
          <div className="mt-8 space-y-3 text-left">
            {[
              'Lost money following unverified Telegram gurus',
              'Paid for tips with zero accountability',
              'Got promises with no track record to show',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-lg">
                <span className="text-destructive font-bold">✗</span>
                <span className="opacity-90">{item}</span>
              </div>
            ))}
          </div>
          <div className="my-8 h-0.5 w-24 mx-auto bg-primary rounded-full" />
          <p className="text-lg font-medium opacity-90">
            TradeCircle fixes this. SEBI registered. Accountable. Transparent.
          </p>
          <a href="#advisors">
            <Button size="lg" className="mt-6 bg-card text-foreground hover:bg-card/90 tc-btn-click font-semibold">
              Find Your Advisor <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </a>
        </div>
      </section>

      {/* Top Advisors */}
      <section id="advisors" className="tc-section">
        <div className="container mx-auto">
          <div className="mb-8 text-center">
            <h2 className="tc-section-title">Top Advisors</h2>
            <p className="mt-2 text-muted-foreground">Subscribe to get real-time trading signals</p>
          </div>

          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-center">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search by name or strategy..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 tc-input-focus" />
            </div>
            <div className="flex gap-2">
              {filters.map(f => (
                <Button key={f} variant={filter === f ? 'default' : 'outline'} size="sm" onClick={() => setFilter(f)} className="tc-btn-click">{f}</Button>
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
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((advisor, i) => {
                const minPrice = advisor.groups?.length > 0 ? Math.min(...advisor.groups.map((g: any) => g.monthly_price)) : null;
                return (
                  <div key={advisor.id} className="tc-card p-6 animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground overflow-hidden">
                        {advisor.profile_photo_url ? (
                          <img src={advisor.profile_photo_url} alt={advisor.full_name} className="h-14 w-14 rounded-full object-cover" />
                        ) : (
                          advisor.full_name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate tc-card-title">{advisor.full_name}</p>
                        <span className="tc-badge-sebi mt-1">
                          <Shield className="h-3 w-3" /> SEBI: {advisor.sebi_reg_no}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <span className="tc-badge-strategy">{advisor.strategy_type}</span>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Star className="h-3.5 w-3.5 fill-current text-[hsl(45,93%,47%)]" /> 4.5
                      </div>
                    </div>
                    <p className="mt-3 tc-small">{advisor.subCount} subscribers</p>
                    {minPrice && <p className="mt-1 text-base tc-amount">Starting from ₹{minPrice}/month</p>}
                    <Link to={`/advisor/${advisor.id}`}>
                      <Button className="mt-4 w-full border-2 border-primary text-primary hover:bg-light-green tc-btn-click" variant="outline" size="sm">
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

      <Footer />
    </div>
  );
}
