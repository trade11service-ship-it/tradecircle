import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { GroupCard } from '@/components/GroupCard';
import { Button } from '@/components/ui/button';
import { Shield, ShieldCheck, ArrowRight, BarChart2, Bell, CreditCard, Search, Users, CheckCircle, Unlock, Rss } from 'lucide-react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { useAuth } from '@/lib/auth';
import { PublicMixedFeed } from "@/components/PublicMixedFeed";
import { setMetaTags, SEO_CONFIG } from '@/lib/seo';

interface GroupData {
  id: string; name: string; description: string | null; monthly_price: number;
  dp_url: string | null; advisor_id: string; advisor_name: string;
  advisor_photo: string | null; sebi_reg_no: string; strategy_type: string | null;
  sub_count: number; signal_count: number; win_count: number; resolved_count: number;
}

interface FeaturedAdvisor {
  id: string;
  full_name: string;
  profile_photo_url: string | null;
  strategy_type: string | null;
  sebi_reg_no: string;
  public_tagline: string | null;
  public_description: string | null;
  public_years_experience: number | null;
}

export default function Landing() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [featuredAdvisors, setFeaturedAdvisors] = useState<FeaturedAdvisor[]>([]);
  const [loading, setLoading] = useState(true);

  // Set meta tags
  useEffect(() => {
    setMetaTags(SEO_CONFIG.landing);
  }, []);

  useEffect(() => { fetchGroups(); fetchFeaturedAdvisors(); }, []);

  const fetchGroups = async () => {
    const { data: grps } = await supabase
      .from('groups')
      .select('id, name, description, monthly_price, dp_url, advisor_id, advisors!inner(full_name, profile_photo_url, sebi_reg_no, strategy_type)')
      .eq('is_active', true)
      .limit(4);
    if (!grps) { setLoading(false); return; }
    const withStats = await Promise.all(grps.map(async (g: any) => {
      const [{ data: subCount }, { data: stats }] = await Promise.all([
        supabase.rpc('get_advisor_subscriber_count', { _advisor_id: g.advisor_id }),
        supabase.rpc('get_advisor_signal_stats', { _advisor_id: g.advisor_id }),
      ]);
      const s = (stats as any) || { total_signals: 0, win_count: 0, resolved_count: 0 };
      return {
        id: g.id, name: g.name, description: g.description, monthly_price: g.monthly_price,
        dp_url: g.dp_url, advisor_id: g.advisor_id,
        advisor_name: g.advisors.full_name, advisor_photo: g.advisors.profile_photo_url,
        sebi_reg_no: g.advisors.sebi_reg_no, strategy_type: g.advisors.strategy_type,
        sub_count: (subCount as number) || 0, signal_count: s.total_signals || 0,
        win_count: s.win_count || 0, resolved_count: s.resolved_count || 0,
      };
    }));
    setGroups(withStats);
    setLoading(false);
  };

  const fetchFeaturedAdvisors = async () => {
    const { data } = await (supabase.from('advisors') as any)
      .select('id, full_name, profile_photo_url, strategy_type, sebi_reg_no, public_tagline, public_description, public_years_experience, is_public_featured, public_sort_order')
      .eq('status', 'approved')
      .eq('is_public_featured', true)
      .order('public_sort_order', { ascending: true })
      .limit(8);
    setFeaturedAdvisors((data || []) as FeaturedAdvisor[]);
  };

  const getValidBio = (tagline: string | null, description: string | null): string => {
    const text = tagline || description || '';
    
    // Check if bio is less than 50 characters
    if (text.length < 50) {
      return 'SEBI registered Research Analyst. Specialises in F&O and intraday strategies.';
    }
    
    // Check for poor patterns
    const lowerText = text.toLowerCase();
    const badPatterns = ['we r', 'r the', 'dvisor', 'experince', 'yars', 'registerd'];
    const hasBadPattern = badPatterns.some(pattern => lowerText.includes(pattern));
    const isAllLowercaseNoPunct = /^[a-z\s]+$/.test(text);
    
    if (hasBadPattern || isAllLowercaseNoPunct) {
      return 'SEBI registered Research Analyst. Specialises in F&O and intraday strategies.';
    }
    
    return text;
  };

  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* HERO — Dark navy with enhanced gradient */}
      <section className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, hsl(240,25%,14%) 0%, hsl(214,89%,20%) 100%)' }}>
        <div className="absolute inset-0 opacity-30" style={{ background: 'radial-gradient(circle at 50% 50%, hsl(123,56%,28%) 0%, transparent 60%)' }} />
        <div className="container relative mx-auto max-w-xl px-5 pt-12 pb-14 md:pt-20 md:pb-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 px-4 py-1.5 text-[12px] font-semibold text-primary" style={{ background: 'hsla(123,56%,24%,0.15)' }}>
            <Shield className="h-3.5 w-3.5" /> SEBI Verified Advisors Only
          </div>
          <h1 className="mt-5 text-[28px] md:text-[38px] font-extrabold leading-[1.15] tracking-tight text-white">
            India's First<br />
            <span className="text-primary">SEBI-Only Trading</span> Marketplace
          </h1>
          <p className="mx-auto mt-4 max-w-sm text-[15px] leading-relaxed text-white/60">
            Every advisor is SEBI-registered and manually verified. Browse real track records, subscribe, and get signals instantly on Telegram.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link to="/discover">
              <Button className="w-full sm:w-auto h-14 px-10 rounded-full bg-primary text-[15px] font-bold shadow-[0_4px_16px_rgba(27,94,32,0.4)] hover:bg-primary/90 hover:scale-[1.02] transition-all duration-200 tc-btn-click">
                Browse Advisors <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
            {!user && (
              <Link to="/login">
                <Button variant="outline" className="w-full sm:w-auto h-14 px-10 rounded-full border-2 border-white/20 text-white text-[15px] font-semibold hover:bg-white/10 hover:scale-[1.02] transition-all duration-200 bg-transparent">
                  Sign In / Sign Up
                </Button>
              </Link>
            )}
          </div>
          {/* Stats with icons and green top borders */}
          <div className="mt-10 grid grid-cols-3 gap-4 md:gap-6 max-w-md mx-auto">
            <div className="rounded-xl border-t-4 border-t-green-500 bg-white/5 backdrop-blur-sm border border-white/10 p-4 text-center">
              <div className="flex justify-center mb-2">
                <ShieldCheck className="h-5 w-5 text-green-500" />
              </div>
              <p className="text-lg md:text-xl font-extrabold text-white">100%</p>
              <p className="text-[11px] text-white/60 mt-1">SEBI Verified</p>
            </div>
            <div className="rounded-xl border-t-4 border-t-green-500 bg-white/5 backdrop-blur-sm border border-white/10 p-4 text-center">
              <div className="flex justify-center mb-2">
                <span className="text-lg font-bold text-green-500">₹</span>
              </div>
              <p className="text-lg md:text-xl font-extrabold text-white">₹0</p>
              <p className="text-[11px] text-white/60 mt-1">Listing Fee</p>
            </div>
            <div className="rounded-xl border-t-4 border-t-green-500 bg-white/5 backdrop-blur-sm border border-white/10 p-4 text-center">
              <div className="flex justify-center mb-2">
                <span className="text-lg">🔓</span>
              </div>
              <p className="text-lg md:text-xl font-extrabold text-white">No Lock-in</p>
              <p className="text-[11px] text-white/60 mt-1">Cancel Anytime</p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="border-b bg-card overflow-hidden">
        <div className="flex animate-marquee whitespace-nowrap py-3">
          {['🛡️ SEBI Verified Only', '📊 Full Signal History', '🔔 Telegram Alerts', '₹ Cancel Anytime', '🛡️ SEBI Verified Only', '📊 Full Signal History', '🔔 Telegram Alerts', '₹ Cancel Anytime', '🛡️ SEBI Verified Only', '📊 Full Signal History', '🔔 Telegram Alerts', '₹ Cancel Anytime'].map((item, i) => (
            <span key={i} className="mx-4 md:mx-6 text-[13px] font-medium text-muted-foreground">
              {item}<span className="ml-4 text-border">·</span>
            </span>
          ))}
        </div>
      </section>

      {/* TOP ADVISORS */}
      <section className="bg-background px-5 py-12 md:py-16">
        <div className="container mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-6">
            <div>
              <p className="text-[11px] font-bold text-primary uppercase tracking-[2px]">TOP ADVISORS</p>
              <h2 className="mt-1 text-2xl font-extrabold text-foreground tracking-tight">Find Your SEBI Advisor</h2>
              <p className="mt-1 text-sm text-muted-foreground">SEBI verified · Transparent track records · No login required</p>
            </div>
            <Link to="/discover">
              <Button variant="outline" className="mt-3 sm:mt-0 border-primary text-primary hover:bg-primary/5 rounded-lg">
                View All <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="rounded-xl border border-border bg-card p-5 animate-pulse">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-full bg-muted" />
                    <div className="flex-1 space-y-2"><div className="h-4 w-24 rounded bg-muted" /><div className="h-3 w-16 rounded bg-muted" /></div>
                  </div>
                  <div className="h-8 rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : groups.length === 0 ? (
            <div className="rounded-xl border border-border bg-card py-12 text-center">
              <Users className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No groups available yet. Check back soon!</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {groups.map(g => (
                <GroupCard key={g.id} advisorId={g.advisor_id} advisorName={g.advisor_name}
                  advisorPhoto={g.advisor_photo} sebiRegNo={g.sebi_reg_no} groupName={g.name}
                  description={g.description} monthlyPrice={g.monthly_price} subCount={g.sub_count}
                  signalCount={g.signal_count} winCount={g.win_count} resolvedCount={g.resolved_count}
                  strategyType={g.strategy_type} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-card px-5 py-12 md:py-16 border-y border-border">
        <div className="container mx-auto max-w-2xl">
          <div className="text-center mb-8">
            <p className="text-[11px] font-bold text-secondary uppercase tracking-[2px]">HOW IT WORKS</p>
            <h2 className="mt-1 text-2xl font-extrabold text-foreground tracking-tight">3 Simple Steps</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { num: '1', icon: Search, title: 'Browse Advisors', desc: 'Filter by strategy, check signal history & SEBI credentials. No account needed.' },
              { num: '2', icon: CreditCard, title: 'Subscribe', desc: 'Choose your advisor group. Pay securely via Razorpay. Monthly. Cancel anytime.' },
              { num: '3', icon: Bell, title: 'Get Signals', desc: 'Real-time alerts on Telegram. Every signal permanently timestamped. Cannot be deleted or faked.' },
            ].map(step => (
              <div key={step.num} className="relative rounded-xl border border-green-500/30 border-l-4 border-l-green-500 bg-green-50 p-5 text-center dark:bg-green-950/20 dark:border-green-500/50">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-500 text-lg font-extrabold text-white mb-3">{step.num}</div>
                <step.icon className="mx-auto h-6 w-6 text-green-500 mb-2" />
                <h3 className="text-[15px] font-bold text-foreground">{step.title}</h3>
                <p className="mt-1 text-[13px] text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PUBLIC MIXED FEED PREVIEW */}
      <section className="bg-background px-5 py-12 md:py-16 border-y border-border">
        <div className="container mx-auto max-w-2xl">
          <div className="text-center mb-6">
            <p className="text-[11px] font-bold text-primary uppercase tracking-[2px]">PUBLIC FEED</p>
            <h2 className="mt-1 text-2xl font-extrabold text-foreground tracking-tight">Analysis + Signals Preview</h2>
            <p className="mt-1 text-sm text-muted-foreground">Analysis is always free. Subscribe to unlock real-time trading signals from verified advisors.</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-3 md:p-4">
            <PublicMixedFeed preview maxItems={8} />
          </div>

          <div className="mt-5 text-center">
            <a href="/explore">
              <Button className="h-12 px-8 rounded-xl bg-primary text-[15px] font-bold tc-btn-click">
                Open Full Feed <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* ADVISOR FRAMES (after how it works) */}
      <section className="bg-card px-5 py-12 md:py-16 border-y border-border">
        <div className="container mx-auto">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="text-[11px] font-bold text-primary uppercase tracking-[2px]">FEATURED ADVISORS</p>
              <h2 className="mt-1 text-2xl font-extrabold text-foreground tracking-tight">Advisors on TradeCircle</h2>
              <p className="mt-1 text-sm text-muted-foreground">Tap any card to see full track record, signals, and subscription details.</p>
            </div>
            <Link to="/featured-advisors">
              <Button variant="outline" className="hidden sm:inline-flex">View all</Button>
            </Link>
          </div>

          {featuredAdvisors.length === 0 ? (
            <div className="rounded-xl border border-border bg-background py-10 text-center">
              <p className="text-sm text-muted-foreground">Featured advisors will appear here after admin publishes them.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {featuredAdvisors.map((a) => (
                <div key={a.id} onClick={() => navigate(`/advisor/${a.id}?tab=about`)} className="group cursor-pointer">
                  <div className="h-full rounded-2xl border border-border bg-background p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-primary to-secondary text-lg font-bold text-primary-foreground">
                        {a.profile_photo_url ? (
                          <img src={a.profile_photo_url} alt={a.full_name} className="h-full w-full object-cover" />
                        ) : (
                          a.full_name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-foreground">{a.full_name}</p>
                        <p className="truncate text-[11px] text-primary">{a.strategy_type || 'Market Advisor'}</p>
                      </div>
                    </div>
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {getValidBio(a.public_tagline, a.public_description)}
                    </p>
                    <div className="mt-3 flex items-center justify-between text-[11px]">
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary">
                        {a.public_years_experience ? `${a.public_years_experience}+ yrs` : 'Verified'}
                      </span>
                      <span className="font-semibold text-foreground group-hover:text-primary">Full profile →</span>
                    </div>

                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* WHY TRADECIRCLE */}
      <section className="bg-background px-5 py-12 md:py-16">
        <div className="container mx-auto max-w-2xl">
          <div className="text-center mb-8">
            <p className="text-[11px] font-bold text-primary uppercase tracking-[2px]">WHY TRADECIRCLE</p>
            <h2 className="mt-1 text-2xl font-extrabold text-foreground tracking-tight">Built Different. For Indian Traders.</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Shield, title: 'SEBI Verified Only', desc: 'Every advisor manually checked.' },
              { icon: BarChart2, title: 'Full Track Record', desc: 'WIN/LOSS history always public.' },
              { icon: Bell, title: 'Telegram Alerts', desc: 'Real-time signals with blockchain timestamps. Tamper-proof forever.' },
              { icon: CheckCircle, title: 'Cancel Anytime', desc: 'Monthly. No lock-in period.' },
            ].map((f, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4">
                <f.icon className="h-5 w-5 text-primary mb-2" />
                <h3 className="text-[13px] font-bold text-foreground">{f.title}</h3>
                <p className="mt-1 text-[12px] text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY CHOOSE TRADECIRCLE STATS */}
      <section className="bg-gray-50 dark:bg-gray-900/20 px-5 py-12 md:py-16 border-t border-border">
        <div className="container mx-auto max-w-3xl">
          <div className="text-center mb-8">
            <p className="text-[11px] font-bold text-primary uppercase tracking-[2px]">WHY TRADERS CHOOSE TRADECIRCLE</p>
            <h2 className="mt-1 text-2xl font-extrabold text-foreground tracking-tight">Built with Transparency in Mind</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                icon: '₹',
                iconBg: 'bg-green-50',
                title: '₹0 Listing Fee',
                desc: 'Advisors pay nothing to list. They only earn when traders subscribe.',
              },
              {
                icon: '🛡️',
                iconBg: 'bg-blue-50',
                title: '100% SEBI Verified',
                desc: 'Every advisor manually checked on sebi.gov.in before approval.',
              },
              {
                icon: '⛓️',
                iconBg: 'bg-purple-50',
                title: 'Tamper-Proof Records',
                desc: 'Blockchain-timestamped signals. Track records permanently immutable.',
              },
              {
                icon: '✓',
                iconBg: 'bg-teal-50',
                title: 'Cancel Anytime',
                desc: 'Monthly subscriptions. No lock-in. Full refund on cancellation.',
              },
            ].map((stat, idx) => (
              <div key={idx} className="rounded-xl border border-gray-100 dark:border-gray-700 bg-card shadow-sm p-6 text-center hover:shadow-md hover:border-gray-200 transition-all">
                <div className={`${stat.iconBg} dark:bg-gray-800 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3 text-lg font-bold`}>
                  {stat.icon}
                </div>
                <h3 className="text-[15px] font-bold text-foreground">{stat.title}</h3>
                <p className="text-[13px] text-muted-foreground mt-2">{stat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-card px-5 py-12 md:py-16 border-y border-border">
        <div className="container mx-auto max-w-2xl">
          <div className="text-center mb-6">
            <p className="text-[11px] font-bold text-primary uppercase tracking-[2px]">FAQ</p>
            <h2 className="mt-1 text-2xl font-extrabold text-foreground tracking-tight">Frequently Asked Questions</h2>
          </div>
          <div className="rounded-xl border border-border bg-background overflow-hidden">
            <Accordion type="single" collapsible defaultValue="faq-0">
              {[
                { q: 'Is TradeCircle a SEBI registered advisor?', a: "No. TradeCircle is a technology marketplace by STREZONIC PRIVATE LIMITED. We verify SEBI-registered advisors but do not give investment advice ourselves." },
                { q: 'How do you verify advisors?', a: "We manually check each advisor's SEBI registration number on sebi.gov.in before approval. Unverified advisors are never listed." },
                { q: 'Can I cancel my subscription?', a: 'Yes. Cancel anytime from your profile. Monthly billing, no lock-in, no questions asked.' },
                { q: 'How do I receive signals?', a: 'After subscribing, you will be added to the advisor\'s private Telegram group. All signals arrive instantly with entry, target, and stop loss.' },
                { q: 'What if an advisor gives bad advice?', a: 'All advisors are SEBI-registered and individually accountable. You can file a complaint on SEBI SCORES at scores.gov.in anytime.' },
              ].map((faq, i) => (
                <AccordionItem key={i} value={`faq-${i}`} className="border-b border-border last:border-0 hover:bg-gray-50">
                  <AccordionTrigger className="px-5 py-4 text-[14px] font-semibold text-foreground hover:text-primary transition-colors">{faq.q}</AccordionTrigger>
                  <AccordionContent className="px-5 pb-4 text-[13px] text-muted-foreground leading-relaxed">{faq.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-5 py-12" style={{ background: 'linear-gradient(135deg, hsl(240,25%,14%) 0%, hsl(214,89%,20%) 100%)' }}>
        <div className="container mx-auto max-w-md text-center">
          <div className="rounded-2xl p-8 bg-transparent">
            <p className="text-xl font-extrabold text-white">Stop Following Fake Telegram Tips.</p>
            <p className="mt-2 text-sm text-white/70">Every advisor on TradeCircle is SEBI registered, manually verified, and has a public tamper-proof track record.</p>
            <Link to="/discover">
              <Button className="mt-5 h-12 px-8 rounded-full bg-white text-primary font-bold hover:bg-white/90 hover:scale-[1.02] transition-all duration-200 tc-btn-click">
                Browse Verified Advisors <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* SEBI Disclaimer box */}
      <div className="border-t bg-card px-5 py-6 text-center">
        <div className="container mx-auto max-w-2xl">
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20 px-4 py-3">
            <p className="text-[11px] text-muted-foreground">
              <Shield className="inline h-3 w-3 text-primary mr-1" />
              All advisors on TradeCircle are SEBI registered. SEBI does not endorse any advisor's performance.
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
