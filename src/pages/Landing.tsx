import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { GroupCard } from '@/components/GroupCard';
import { Button } from '@/components/ui/button';
import { Shield, ShieldCheck, ArrowRight, Bell, CreditCard, Search, Users, CheckCircle, TrendingUp, BookOpen, MessageSquare, Lock, Eye, Zap, BarChart3, AlertTriangle } from 'lucide-react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { useAuth } from '@/lib/auth';
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

  useEffect(() => { setMetaTags(SEO_CONFIG.landing); }, []);
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
      .limit(6);
    setFeaturedAdvisors((data || []) as FeaturedAdvisor[]);
  };

  const getValidBio = (tagline: string | null, description: string | null): string => {
    const text = tagline || description || '';
    if (text.length < 50) return 'SEBI registered Research Analyst providing verified trading signals with transparent track records.';
    const lowerText = text.toLowerCase();
    const badPatterns = ['we r', 'r the', 'dvisor', 'experince', 'yars', 'registerd'];
    if (badPatterns.some(p => lowerText.includes(p)) || /^[a-z\s]+$/.test(text)) {
      return 'SEBI registered Research Analyst providing verified trading signals with transparent track records.';
    }
    return text;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ===== HERO SECTION ===== */}
      <section className="relative overflow-hidden tc-gradient-hero">
        {/* Ambient orbs */}
        <div className="absolute top-20 left-[10%] w-[400px] h-[400px] rounded-full bg-primary/8 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-10 right-[10%] w-[350px] h-[350px] rounded-full bg-secondary/8 blur-[100px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/4 blur-[150px] pointer-events-none" />

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />

        <div className="relative z-10 mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24 lg:py-28">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            {/* Left: Copy */}
            <div className="animate-slide-up">
              {/* Trust badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary mb-6 backdrop-blur-sm">
                <div className="relative">
                  <Shield className="h-3.5 w-3.5" />
                  <div className="absolute inset-0 animate-pulse-ring rounded-full bg-primary/30" />
                </div>
                SEBI Verified Only
              </div>

              <h1 className="text-4xl font-extrabold leading-[1.1] text-white md:text-5xl lg:text-[3.5rem]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Stop trusting
                <span className="block tc-gradient-text mt-1">random Telegram tips.</span>
              </h1>

              <p className="mt-5 max-w-lg text-base text-white/60 leading-relaxed md:text-lg">
                Subscribe to <strong className="text-white/90">SEBI-registered advisors</strong> with tamper-proof track records. 
                Every signal timestamped. Every result visible. No hiding bad calls.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/discover">
                  <Button className="h-12 rounded-full px-7 font-bold text-[15px] bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-300 hover:scale-[1.02]">
                    Find Verified Advisors <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                {!user && (
                  <Link to="/advisor-register">
                    <Button variant="outline" className="h-12 rounded-full px-7 border-white/20 bg-white/5 text-white hover:bg-white/10 font-semibold backdrop-blur-sm">
                      List as Advisor
                    </Button>
                  </Link>
                )}
              </div>

              {/* Stats pills */}
              <div className="mt-8 flex flex-wrap gap-3">
                {[
                  { label: "SEBI Checked", value: "100%" },
                  { label: "Listing Fee", value: "₹0" },
                  { label: "Lock-in", value: "None" },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-sm">
                    <span className="text-sm font-bold text-white">{s.value}</span>
                    <span className="text-xs text-white/40">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: How it works card */}
            <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-6 shadow-2xl">
                <div className="flex items-center gap-2 mb-5">
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-xs font-bold text-white/50 uppercase tracking-widest">How StockCircle Works</span>
                </div>

                <div className="space-y-4">
                  {[
                    { icon: Search, num: "01", title: "Compare Advisors", text: "Browse verified profiles. Check SEBI registration, strategy, and real track record." },
                    { icon: CreditCard, num: "02", title: "Subscribe Monthly", text: "Clear pricing. PAN verification. Compliance-first onboarding. Cancel anytime." },
                    { icon: Zap, num: "03", title: "Get Signals Instantly", text: "Real-time trading signals via Telegram with entry, target, and stop loss." },
                  ].map((step, i) => (
                    <div key={step.num} className="group flex items-start gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-4 transition-all hover:border-primary/20 hover:bg-primary/5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 text-primary font-bold text-sm border border-primary/10">
                        {step.num}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-bold text-white mb-0.5">{step.title}</h3>
                        <p className="text-xs text-white/45 leading-relaxed">{step.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== TRUST TICKER ===== */}
      <div className="border-y border-border bg-card overflow-hidden">
        <div className="flex animate-marquee whitespace-nowrap py-3">
          {Array(3).fill(null).map((_, ri) => (
            <div key={ri} className="flex items-center gap-8 mx-8">
              {[
                "🛡️ SEBI Verified Advisors Only",
                "📊 Tamper-Proof Track Records",
                "🔒 PAN + MITC Compliance",
                "💳 Cancel Anytime — No Lock-in",
                "⚡ Real-Time Telegram Signals",
                "✅ Transparent Win/Loss History",
              ].map((t, i) => (
                <span key={`${ri}-${i}`} className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                  {t}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ===== PROBLEM SECTION ===== */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          <div>
            <p className="text-[11px] font-bold text-destructive uppercase tracking-[2px] mb-2">THE PROBLEM</p>
            <h2 className="text-3xl font-extrabold text-foreground tracking-tight leading-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
              ₹47,000 Crore lost every year to fake trading tips
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              India has 17+ crore demat accounts. But when traders need guidance, they turn to unverified 
              Telegram channels — no SEBI registration, no track record, no accountability. 
              When losses hit, the channel disappears and the money is gone.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: AlertTriangle, label: "Fake channels", value: "Lakhs+", color: "text-destructive bg-destructive/10" },
              { icon: Users, label: "Demat accounts", value: "17Cr+", color: "text-primary bg-primary/10" },
              { icon: Shield, label: "Using verified advisor", value: "~5L", color: "text-secondary bg-secondary/10" },
              { icon: TrendingUp, label: "Market gap", value: "Massive", color: "text-primary bg-primary/10" },
            ].map(s => (
              <div key={s.label} className="rounded-xl border border-border bg-card p-4 text-center transition-all hover:shadow-md hover:-translate-y-0.5">
                <div className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg ${s.color}`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <p className="text-xl font-extrabold text-foreground">{s.value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== POPULAR GROUPS ===== */}
      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-8">
            <div>
              <p className="text-[11px] font-bold text-primary uppercase tracking-[2px]">DISCOVER</p>
              <h2 className="mt-1 text-2xl font-extrabold text-foreground tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>Popular Advisor Groups</h2>
              <p className="mt-1 text-sm text-muted-foreground">Transparent pricing, verified advisors, and real win-rate data.</p>
            </div>
            <Link to="/discover">
              <Button variant="outline" className="mt-3 sm:mt-0 border-primary text-primary hover:bg-primary/5 rounded-lg font-semibold">
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
              <p className="text-muted-foreground">Advisors are being onboarded. Check back soon!</p>
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
        </div>
      </section>

      {/* ===== WHY STOCKCIRCLE ===== */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <div className="text-center mb-10">
          <p className="text-[11px] font-bold text-primary uppercase tracking-[2px]">WHY STOCKCIRCLE</p>
          <h2 className="mt-2 text-3xl font-extrabold text-foreground tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Built for trust. Designed for traders.
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: ShieldCheck, title: 'SEBI Verified Only', desc: 'Every advisor is manually checked against SEBI records. No exceptions.' },
            { icon: Lock, title: 'Tamper-Proof Records', desc: 'Signals are permanently timestamped. Advisors cannot delete or edit bad calls.' },
            { icon: Eye, title: 'Full Transparency', desc: 'See complete win/loss history before subscribing. No hidden track records.' },
            { icon: BarChart3, title: 'Real Accountability', desc: 'File complaints via SEBI SCORES. Every advisor is legally accountable.' },
          ].map((f, i) => (
            <div key={i} className="group rounded-xl border border-border bg-card p-5 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:-translate-y-1">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary mb-3 group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="text-[15px] font-bold text-foreground mb-1">{f.title}</h3>
              <p className="text-[13px] text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== FEATURED ADVISORS ===== */}
      {featuredAdvisors.length > 0 && (
        <section className="border-y border-border bg-muted/30">
          <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
            <div className="mb-8">
              <p className="text-[11px] font-bold text-primary uppercase tracking-[2px]">VERIFIED MENTORS</p>
              <h2 className="mt-1 text-2xl font-extrabold text-foreground tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>Meet Our SEBI-Registered Advisors</h2>
              <p className="mt-1 text-sm text-muted-foreground">Every advisor below is manually verified and SEBI-registered.</p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featuredAdvisors.slice(0, 6).map((a) => (
                <Link key={a.id} to={`/advisor/${a.id}`} className="group h-full">
                  <div className="h-full rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl">
                    <div className="mb-4 flex items-start justify-between">
                      <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-primary to-secondary text-xl font-bold text-primary-foreground ring-2 ring-primary/20">
                        {a.profile_photo_url ? (
                          <img src={a.profile_photo_url} alt={a.full_name} className="h-full w-full object-cover" />
                        ) : a.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1">
                        <CheckCircle className="h-3 w-3 text-primary" />
                        <span className="text-[10px] font-bold text-primary">SEBI ✓</span>
                      </div>
                    </div>
                    <h3 className="text-base font-bold text-foreground mb-0.5">{a.full_name}</h3>
                    {a.strategy_type && <p className="text-xs font-semibold text-primary mb-2">{a.strategy_type}</p>}
                    <p className="line-clamp-2 text-[13px] text-muted-foreground mb-4 leading-relaxed">{getValidBio(a.public_tagline, a.public_description)}</p>
                    <div className="flex gap-2 mb-4">
                      {a.public_years_experience && (
                        <span className="rounded-full bg-secondary/10 px-3 py-1 text-[11px] font-semibold text-secondary border border-secondary/10">
                          {a.public_years_experience}+ Years
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-border text-muted-foreground group-hover:text-primary transition-colors">
                      <span className="text-xs font-medium">View profile</span>
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-6 text-center">
              <Link to="/featured-advisors">
                <Button variant="outline" className="rounded-full px-6 border-primary text-primary hover:bg-primary/5 font-semibold">
                  View All Advisors <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ===== FAQ ===== */}
      <section className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
        <div className="text-center mb-8">
          <p className="text-[11px] font-bold text-primary uppercase tracking-[2px]">FAQ</p>
          <h2 className="mt-2 text-2xl font-extrabold text-foreground tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>Frequently Asked Questions</h2>
        </div>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Accordion type="single" collapsible defaultValue="faq-0">
            {[
              { q: 'Is StockCircle a SEBI registered advisor?', a: "No. StockCircle is a technology marketplace operated by STREZONIC PRIVATE LIMITED. We verify SEBI-registered advisors (INH holders) but do not give investment advice ourselves." },
              { q: 'How do you verify advisors?', a: "We manually check each advisor's SEBI registration number (INH number) on sebi.gov.in before approval. Unverified advisors are never listed." },
              { q: 'Can I cancel my subscription?', a: 'Yes. Cancel anytime from your profile. Monthly billing, no lock-in, no questions asked.' },
              { q: 'How do I receive signals?', a: 'After subscribing, you will be added to the advisor\'s private Telegram group. All signals arrive instantly with entry, target, and stop loss.' },
              { q: 'What makes this different from Telegram channels?', a: 'StockCircle only allows SEBI-registered advisors. Every signal is permanently timestamped — advisors cannot delete bad calls. You can see full win/loss history before subscribing.' },
            ].map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border-b border-border last:border-0">
                <AccordionTrigger className="px-5 py-4 text-[14px] font-semibold text-foreground hover:text-primary transition-colors">{faq.q}</AccordionTrigger>
                <AccordionContent className="px-5 pb-4 text-[13px] text-muted-foreground leading-relaxed">{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="relative overflow-hidden tc-gradient-hero px-4 py-16 sm:px-6">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />

        <div className="relative z-10 mx-auto max-w-xl text-center">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-8 md:p-10">
            <h2 className="text-2xl font-extrabold text-white md:text-3xl" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Trade with verified advisors.<br />
              <span className="tc-gradient-text">Not random Telegram tips.</span>
            </h2>
            <p className="mt-3 text-sm text-white/50">
              Browse SEBI-registered advisors. Check track records. Subscribe only when you're ready.
            </p>
            <Link to="/discover">
              <Button className="mt-6 h-12 px-8 rounded-full bg-white text-foreground font-bold hover:bg-white/90 hover:scale-[1.02] transition-all duration-200 shadow-lg">
                Browse Verified Advisors <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ===== SEBI DISCLAIMER ===== */}
      <div className="border-t bg-card px-5 py-5 text-center">
        <div className="container mx-auto max-w-2xl">
          <div className="rounded-lg border border-border bg-muted/50 px-4 py-3">
            <p className="text-[11px] text-muted-foreground">
              <Shield className="inline h-3 w-3 text-primary mr-1" />
              All advisors on StockCircle are SEBI registered (INH holders). StockCircle is not a SEBI registered entity. Investment in securities involves market risk.
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
