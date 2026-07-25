import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Footer } from '@/components/Footer';
import { GroupCard } from '@/components/GroupCard';
import { PublicMixedFeed } from '@/components/PublicMixedFeed';
import { Button } from '@/components/ui/button';
import { ShieldCheck, ArrowRight, Lock, EyeOff, Bell, FileCheck, Users, ArrowUpRight, Rss } from 'lucide-react';
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
  const { user, loading: authLoading } = useAuth();
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [featuredAdvisors, setFeaturedAdvisors] = useState<FeaturedAdvisor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { setMetaTags(SEO_CONFIG.landing); }, []);

  useEffect(() => {
    if (!authLoading) {
      fetchGroups();
      fetchFeaturedAdvisors();
    }
  }, [authLoading]);

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
    if (text.length < 50) return 'SEBI-registered Research Analyst providing verified trading signals with a transparent track record.';
    const lower = text.toLowerCase();
    const bad = ['we r', 'r the', 'dvisor', 'experince', 'yars', 'registerd'];
    if (bad.some(p => lower.includes(p)) || /^[a-z\s]+$/.test(text)) {
      return 'SEBI-registered Research Analyst providing verified trading signals with a transparent track record.';
    }
    return text;
  };

  const trustPills = [
    { icon: ShieldCheck, label: 'SEBI verified' },
    { icon: Lock, label: 'Tamper-proof' },
    { icon: EyeOff, label: 'PII masked' },
    { icon: Bell, label: 'Live alerts' },
  ];

  const features = [
    { icon: ShieldCheck, title: 'SEBI-verified only', desc: 'Every advisor is manually checked against SEBI records. No exceptions, no self-serve listings.' },
    { icon: Lock, title: 'Tamper-proof records', desc: 'Signals are permanently timestamped. Advisors cannot edit or delete bad calls after publishing.' },
    { icon: FileCheck, title: 'Full transparency', desc: 'See complete win/loss history before subscribing. No hidden track records, no cherry-picked wins.' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* ===== HERO ===== */}
      <section className="bg-background border-b border-border">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 pt-16 pb-16 md:pt-20 md:pb-20">
          <div className="max-w-[640px]">
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              India's first SEBI-only advisory marketplace
            </p>
            <h1 className="mt-4 text-[32px] md:text-[40px] font-bold tracking-tight leading-[1.15] text-foreground">
              Trade with verified advisors.{' '}
              <span className="text-slate-400 line-through decoration-[1.5px]">Not random tips.</span>
            </h1>
            <p className="mt-5 text-[18px] leading-relaxed text-[hsl(var(--body))]">
              Every advisor is manually checked against SEBI records. Every signal is permanently timestamped.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link to="/discover">
                <Button className="h-11 px-5 rounded-[10px] bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-[14px]">
                  Browse advisors
                </Button>
              </Link>
              <a href="#how">
                <Button variant="outline" className="h-11 px-5 rounded-[10px] border-border bg-background hover:bg-slate-50 text-foreground font-semibold text-[14px]">
                  How it works
                </Button>
              </a>
            </div>

            <div className="mt-8 flex flex-wrap gap-2">
              {trustPills.map(p => (
                <span key={p.label} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700">
                  <p.icon className="h-3 w-3 text-emerald" strokeWidth={1.75} />
                  {p.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== POPULAR GROUPS ===== */}
      <section id="pricing" className="surface-alt border-b border-border scroll-mt-16">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-16">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
            <div className="max-w-[640px]">
              <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Discover</p>
              <h2 className="mt-2 text-[28px] font-bold text-foreground tracking-tight">Popular advisor groups</h2>
              <p className="mt-2 text-[15px] text-[hsl(var(--body))]">Transparent pricing. Verified analysts. Real win-rate data.</p>
            </div>
            <Link to="/discover">
              <Button variant="outline" className="h-10 rounded-[10px] border-border text-[13px] font-semibold">
                View all <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="rounded-xl border border-border bg-card p-6 animate-pulse">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-full bg-slate-100" />
                    <div className="flex-1 space-y-2"><div className="h-3 w-24 rounded bg-slate-100" /><div className="h-2 w-16 rounded bg-slate-100" /></div>
                  </div>
                  <div className="h-10 rounded bg-slate-100" />
                </div>
              ))}
            </div>
          ) : groups.length === 0 ? (
            <div className="rounded-xl border border-border bg-card py-16 text-center">
              <Users className="mx-auto h-8 w-8 text-muted-foreground mb-3" strokeWidth={1.5} />
              <p className="text-[14px] text-muted-foreground">Advisors are being onboarded. Check back soon.</p>
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

      {/* ===== WHY RA CIRCLE — clean 3-col, no card containers ===== */}
      <section id="how" className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-16">
        <div className="max-w-[640px] mb-10">
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Why RA Circle</p>
          <h2 className="mt-2 text-[28px] font-bold text-foreground tracking-tight">Built for trust. Designed for traders.</h2>
        </div>
        <div className="grid gap-10 md:grid-cols-3">
          {features.map(f => (
            <div key={f.title}>
              <f.icon className="h-6 w-6 text-foreground" strokeWidth={1.5} />
              <h3 className="mt-4 text-[16px] font-semibold text-foreground">{f.title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-[hsl(var(--body))]">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== PUBLIC FEED TEASER ===== */}
      <section className="border-b border-border">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-16">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
            <div className="max-w-[640px]">
              <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Live public feed</p>
              <h2 className="mt-2 text-[28px] font-bold text-foreground tracking-tight">Real signals, in real time</h2>
              <p className="mt-2 text-[15px] text-[hsl(var(--body))]">A preview of the latest free posts from SEBI-verified advisors.</p>
            </div>
            <Link to="/explore">
              <Button variant="outline" className="h-10 rounded-[10px] border-border text-[13px] font-semibold">
                <Rss className="mr-1.5 h-3.5 w-3.5" /> Open public feed
              </Button>
            </Link>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <PublicMixedFeed preview maxItems={6} />
          </div>
        </div>
      </section>


      {featuredAdvisors.length > 0 && (
        <section className="surface-alt border-y border-border">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-16">
            <div className="mb-8 max-w-[640px]">
              <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Verified analysts</p>
              <h2 className="mt-2 text-[28px] font-bold text-foreground tracking-tight">Meet the RA Circle roster</h2>
              <p className="mt-2 text-[15px] text-[hsl(var(--body))]">Every advisor below is manually verified and SEBI-registered.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featuredAdvisors.slice(0, 6).map((a) => (
                <Link key={a.id} to={`/advisor/${a.id}`} className="group">
                  <div className="h-full rounded-xl border border-border bg-card p-6 transition-colors group-hover:border-slate-300">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[15px] font-semibold text-slate-700 overflow-hidden">
                          {a.profile_photo_url ? (
                            <img src={a.profile_photo_url} alt={a.full_name} className="h-full w-full object-cover" />
                          ) : a.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[15px] font-semibold text-foreground truncate">{a.full_name}</p>
                          <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald/10 px-2 py-0.5 text-[11px] font-semibold text-emerald">
                            <ShieldCheck className="h-3 w-3" /> SEBI {a.sebi_reg_no}
                          </div>
                        </div>
                      </div>
                    </div>
                    {a.strategy_type && (
                      <p className="mt-3 text-[12px] font-medium text-slate-700">{a.strategy_type}</p>
                    )}
                    <p className="mt-3 text-[13px] text-[hsl(var(--body))] leading-relaxed line-clamp-3">
                      {getValidBio(a.public_tagline, a.public_description)}
                    </p>
                    <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-[12px] text-muted-foreground group-hover:text-foreground transition-colors">
                      <span>View profile</span>
                      <ArrowUpRight className="h-4 w-4" strokeWidth={1.75} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-8">
              <Link to="/featured-advisors">
                <Button variant="outline" className="h-10 rounded-[10px] border-border text-[13px] font-semibold">
                  View all advisors <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ===== FAQ ===== */}
      <section className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-16">
        <div className="mb-8">
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">FAQ</p>
          <h2 className="mt-2 text-[28px] font-bold text-foreground tracking-tight">Frequently asked questions</h2>
        </div>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Accordion type="single" collapsible defaultValue="faq-0">
            {[
              { q: 'Is RA Circle a SEBI-registered advisor?', a: 'No. RA Circle is a technology marketplace operated by STREZONIC PRIVATE LIMITED. We verify SEBI-registered advisors (INH holders) but do not give investment advice ourselves.' },
              { q: 'How do you verify advisors?', a: "We manually check each advisor's SEBI registration number (INH number) on sebi.gov.in before approval. Unverified advisors are never listed." },
              { q: 'Can I cancel my subscription?', a: 'Yes. Cancel anytime from your profile. No lock-in, no questions asked.' },
              { q: 'How do I receive signals?', a: "After subscribing, you are added to the advisor's private group. All signals arrive instantly with entry, target, and stop loss." },
              { q: 'What makes this different from Telegram channels?', a: 'RA Circle only allows SEBI-registered advisors. Every signal is permanently timestamped — advisors cannot delete bad calls. You can see full win/loss history before subscribing.' },
            ].map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border-b border-border last:border-0">
                <AccordionTrigger className="px-5 py-4 text-[14px] font-semibold text-foreground hover:no-underline">{faq.q}</AccordionTrigger>
                <AccordionContent className="px-5 pb-4 text-[13px] text-[hsl(var(--body))] leading-relaxed">{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ===== FINAL CTA — solid navy, no gradients ===== */}
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-16 text-center">
          <h2 className="text-[28px] md:text-[32px] font-bold tracking-tight">
            Trade with verified advisors.
          </h2>
          <p className="mt-3 text-[15px] text-white/70">
            Browse SEBI-registered analysts. Check track records. Subscribe only when you're ready.
          </p>
          <Link to="/discover">
            <Button className="mt-6 h-11 px-6 rounded-[10px] bg-background text-foreground hover:bg-slate-50 font-semibold text-[14px]">
              Browse advisors <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </Link>
          {!user && (
            <p className="mt-4 text-[12px] text-white/50">
              New here? <Link to="/register" className="text-white hover:underline">Create a free account</Link>
            </p>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
