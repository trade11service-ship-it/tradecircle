import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { GroupCard } from '@/components/GroupCard';
import { Button } from '@/components/ui/button';
import { Shield, ShieldCheck, ArrowRight, Bell, CreditCard, Search, Users, CheckCircle, TrendingUp, BookOpen, MessageSquare } from 'lucide-react';
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="border-b bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-2 md:py-14">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Shield className="h-3.5 w-3.5" /> SEBI Verified Advisors
            </div>
            <h1 className="mt-4 text-3xl font-extrabold leading-tight text-white md:text-4xl">
              Trusted research with
              <span className="text-primary"> real mentorship</span>, not random tips.
            </h1>
            <p className="mt-3 max-w-xl text-sm text-white/75 md:text-base">
              Compare verified advisors, study transparent track records, and subscribe to signal groups
              that also explain the why behind each trade.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/discover">
                <Button className="h-11 rounded-full px-6 font-semibold">
                  Find Advisors <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
              {!user && (
                <Link to="/login">
                  <Button variant="outline" className="h-11 rounded-full border-white/30 bg-white/5 px-6 text-white hover:bg-white/15">
                    Sign In
                  </Button>
                </Link>
              )}
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3 text-center">
              {[
                { title: "100%", subtitle: "SEBI checked" },
                { title: "₹0", subtitle: "Listing fees" },
                { title: "Monthly", subtitle: "No lock-in" },
              ].map((item) => (
                <div key={item.subtitle} className="rounded-xl border border-white/15 bg-white/5 p-3">
                  <p className="text-lg font-bold text-white">{item.title}</p>
                  <p className="text-[11px] text-white/65">{item.subtitle}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/5 p-5 text-white">
            <h2 className="text-lg font-bold">How it works</h2>
            <div className="mt-4 space-y-3">
              {[
                { icon: Search, title: "Compare advisors", text: "Filter by style, track record and mentorship quality." },
                { icon: CreditCard, title: "Subscribe monthly", text: "Clear pricing with compliance-first onboarding." },
                { icon: Bell, title: "Learn + act faster", text: "Get signals and educational market notes in one feed." },
              ].map((step) => (
                <div key={step.title} className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/5 p-3">
                  <step.icon className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-semibold">{step.title}</p>
                    <p className="text-xs text-white/70">{step.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-6">
            <div>
              <p className="text-[11px] font-bold text-primary uppercase tracking-[2px]">DISCOVER</p>
              <h2 className="mt-1 text-2xl font-extrabold text-foreground tracking-tight">Popular advisor groups</h2>
              <p className="mt-1 text-sm text-muted-foreground">Transparent pricing, verified advisors, and clear win-rate context.</p>
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
                <GroupCard key={g.id} groupId={g.id} advisorId={g.advisor_id} advisorName={g.advisor_name}
                  advisorPhoto={g.advisor_photo} sebiRegNo={g.sebi_reg_no} groupName={g.name}
                  description={g.description} monthlyPrice={g.monthly_price} subCount={g.sub_count}
                  signalCount={g.signal_count} winCount={g.win_count} resolvedCount={g.resolved_count}
                  strategyType={g.strategy_type} />
              ))}
            </div>
          )}
      </section>
      <section className="border-y border-border bg-muted/40">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[11px] font-bold text-primary uppercase tracking-[2px]">LIVE FEED</p>
              <h2 className="mt-0.5 text-lg font-extrabold text-foreground tracking-tight">Recent Signals & Analysis</h2>
            </div>
            <Link to="/explore">
              <Button variant="outline" size="sm" className="border-primary text-primary hover:bg-primary/5 rounded-lg text-xs">
                View All <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </div>
          <PublicMixedFeed preview maxItems={4} />
        </div>
      </section>
      <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <div className="rounded-2xl border border-border bg-card p-5 md:p-6">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <p className="text-[11px] font-bold text-primary uppercase tracking-[2px]">MENTORSHIP FIRST</p>
              <h2 className="mt-1 text-2xl font-extrabold text-foreground tracking-tight">Meet verified mentors</h2>
              <p className="mt-1 text-sm text-muted-foreground">Advisors who publish both trade calls and educational context.</p>
            </div>
          </div>

          {featuredAdvisors.length === 0 ? (
            <div className="rounded-xl border border-border bg-background py-10 text-center">
              <p className="text-sm text-muted-foreground">Featured advisors will appear here after admin publishes them.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {featuredAdvisors.slice(0, 3).map((a) => (
                  <Link key={a.id} to={`/advisor/${a.id}`} className="group cursor-pointer h-full">
                    <div className="h-full rounded-2xl border border-border bg-background p-6 shadow-md transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
                      {/* Avatar + Verified Badge */}
                      <div className="mb-4 flex items-start justify-between">
                        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-primary to-secondary text-2xl font-bold text-primary-foreground border-2 border-primary">
                          {a.profile_photo_url ? (
                            <img src={a.profile_photo_url} alt={a.full_name} className="h-full w-full object-cover" />
                          ) : (
                            a.full_name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1">
                          <CheckCircle className="h-3 w-3 text-green-600" />
                          <span className="text-[10px] font-bold text-green-700">Verified</span>
                        </div>
                      </div>

                      {/* Name & Strategy */}
                      <h3 className="text-lg font-bold text-foreground mb-1">{a.full_name}</h3>
                      {a.strategy_type && <p className="text-xs font-semibold text-primary mb-3">{a.strategy_type}</p>}

                      {/* Bio */}
                      <p className="line-clamp-3 text-sm text-muted-foreground mb-4">
                        {getValidBio(a.public_tagline, a.public_description)}
                      </p>

                      {/* Stats or Years */}
                      <div className="flex gap-2 mb-4">
                        {a.public_years_experience && (
                          <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 border border-blue-100">
                            <TrendingUp className="inline h-3 w-3 mr-1" />
                            {a.public_years_experience}+ Years
                          </span>
                        )}
                        {a.sebi_reg_no && (
                          <span className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 border border-green-100">
                            <Shield className="inline h-3 w-3 mr-1" />
                            SEBI ✓
                          </span>
                        )}
                      </div>

                      {/* CTA */}
                      <div className="flex items-center justify-between pt-4 border-t border-border group-hover:text-primary transition-colors">
                        <span className="text-xs text-muted-foreground font-medium">View full profile</span>
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* CTA to View All Advisors */}
              <div className="rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 p-8 text-center">
                <h3 className="text-lg font-bold text-foreground mb-2">Need a better fit?</h3>
                <p className="text-sm text-muted-foreground mb-4">Browse all published advisors and compare styles, pricing, and engagement.</p>
                <Link to="/featured-advisors">
                  <Button className="gap-2 bg-primary hover:bg-primary/90 text-white">
                    View All {featuredAdvisors.length} Advisors <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>
      <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-4 md:grid-cols-4">
            {[
              { icon: ShieldCheck, title: 'Verified only', desc: 'Every listed advisor is manually checked.' },
              { icon: TrendingUp, title: 'Track records', desc: 'History is visible before subscribing.' },
              { icon: BookOpen, title: 'Learning context', desc: 'Educational notes and strategy rationale.' },
              { icon: MessageSquare, title: 'Community-ready', desc: 'Follow groups and engage before buying.' },
            ].map((f, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4">
                <f.icon className="h-5 w-5 text-primary mb-2" />
                <h3 className="text-[13px] font-bold text-foreground">{f.title}</h3>
                <p className="mt-1 text-[12px] text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
      </section>
      <section className="border-y border-border bg-card">
        <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
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
      <section className="border-t bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-xl text-center">
          <div className="rounded-2xl border border-white/15 bg-white/5 p-8">
            <p className="text-xl font-extrabold text-white">Trade with verified advisors, learn with community context.</p>
            <p className="mt-2 text-sm text-white/70">Start with public insights, then subscribe only when advisor quality matches your style.</p>
            <Link to="/discover">
              <Button className="mt-5 h-12 px-8 rounded-full bg-white text-primary font-bold hover:bg-white/90 hover:scale-[1.02] transition-all duration-200 tc-btn-click">
                Browse Verified Advisors <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
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
