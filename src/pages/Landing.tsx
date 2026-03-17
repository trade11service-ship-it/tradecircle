import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { GroupCard } from '@/components/GroupCard';
import { Button } from '@/components/ui/button';
import { Shield, ShieldCheck, ArrowRight, BarChart2, Bell, CreditCard, Search, Users, CheckCircle } from 'lucide-react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { useAuth } from '@/lib/auth';

interface GroupData {
  id: string; name: string; description: string | null; monthly_price: number;
  dp_url: string | null; advisor_id: string; advisor_name: string;
  advisor_photo: string | null; sebi_reg_no: string; strategy_type: string | null;
  sub_count: number; signal_count: number; win_count: number; resolved_count: number;
}

export default function Landing() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchGroups(); }, []);

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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* HERO — Dark navy */}
      <section className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, hsl(240,25%,14%) 0%, hsl(214,89%,20%) 100%)' }}>
        <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(circle at 30% 20%, hsl(123,56%,24%) 0%, transparent 50%)' }} />
        <div className="container relative mx-auto max-w-xl px-5 pt-12 pb-14 md:pt-20 md:pb-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 px-4 py-1.5 text-[12px] font-semibold text-primary" style={{ background: 'hsla(123,56%,24%,0.15)' }}>
            <Shield className="h-3.5 w-3.5" /> SEBI Verified Advisors Only
          </div>
          <h1 className="mt-5 text-[28px] md:text-[38px] font-extrabold leading-[1.15] tracking-tight text-white">
            India's Most Trusted<br />
            <span className="text-primary">Trading Advisory</span> Platform
          </h1>
          <p className="mx-auto mt-4 max-w-sm text-[15px] leading-relaxed text-white/60">
            Every advisor is manually verified by our team. Browse track records, subscribe, and get signals on Telegram.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link to="/discover">
              <Button className="w-full sm:w-auto h-12 px-8 rounded-xl bg-primary text-[15px] font-bold shadow-[0_4px_16px_rgba(27,94,32,0.4)] hover:bg-primary/90 tc-btn-click">
                Browse Advisors <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/advisor-register">
              <Button variant="outline" className="w-full sm:w-auto h-12 px-8 rounded-xl border-2 border-white/20 text-white text-[15px] font-semibold hover:bg-white/10 bg-transparent">
                Join as Advisor
              </Button>
            </Link>
          </div>
          {/* Stats */}
          <div className="mt-8 flex items-center justify-center gap-6 md:gap-10">
            {[
              { val: '17Cr+', label: 'Indian Traders' },
              { val: '100%', label: 'SEBI Verified' },
              { val: '₹0', label: 'Listing Fee' },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <p className="text-xl md:text-2xl font-extrabold text-white">{s.val}</p>
                <p className="text-[11px] text-white/40 mt-0.5">{s.label}</p>
              </div>
            ))}
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
              <h2 className="mt-1 text-2xl font-extrabold text-foreground tracking-tight">Browse Verified Advisors</h2>
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
              { num: '1', icon: Search, title: 'Browse Advisors', desc: 'Filter by strategy, check signal history & SEBI credentials.' },
              { num: '2', icon: CreditCard, title: 'Subscribe', desc: 'Choose your advisor group. Pay securely via Razorpay.' },
              { num: '3', icon: Bell, title: 'Get Signals', desc: 'Receive trade alerts on Telegram and in your app feed.' },
            ].map(step => (
              <div key={step.num} className="rounded-xl border border-border bg-background p-5 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-extrabold text-primary mb-3">{step.num}</div>
                <step.icon className="mx-auto h-6 w-6 text-primary mb-2" />
                <h3 className="text-[15px] font-bold text-foreground">{step.title}</h3>
                <p className="mt-1 text-[13px] text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
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
              { icon: Bell, title: 'Telegram Alerts', desc: 'Signals delivered instantly.' },
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

      {/* FAQ */}
      <section className="bg-card px-5 py-12 md:py-16 border-y border-border">
        <div className="container mx-auto max-w-2xl">
          <div className="text-center mb-6">
            <p className="text-[11px] font-bold text-primary uppercase tracking-[2px]">FAQ</p>
            <h2 className="mt-1 text-2xl font-extrabold text-foreground tracking-tight">Common Questions</h2>
          </div>
          <div className="rounded-xl border border-border bg-background overflow-hidden">
            <Accordion type="single" collapsible defaultValue="faq-0">
              {[
                { q: 'Is TradeCircle a SEBI registered advisor?', a: "No — TradeCircle is a technology marketplace operated by STREZONIC PRIVATE LIMITED. We verify SEBI-registered advisors but don't give any advice ourselves." },
                { q: 'How do you verify advisors?', a: "Every advisor submits their SEBI registration number, Aadhaar, PAN, and documents. Our team manually checks their license on SEBI's official database." },
                { q: 'Can I cancel my subscription?', a: 'Yes. Cancel anytime. Your subscription stays active until the end of the billing period.' },
                { q: 'How do I receive signals?', a: 'Signals are delivered via Telegram bot directly to your personal Telegram. You also see them in your app feed.' },
                { q: 'What if an advisor gives bad advice?', a: 'Each advisor is independently SEBI registered. TradeCircle provides track record transparency so you can make informed decisions.' },
              ].map((faq, i) => (
                <AccordionItem key={i} value={`faq-${i}`} className="border-b border-border last:border-0">
                  <AccordionTrigger className="px-5 py-4 text-[14px] font-semibold text-foreground hover:text-primary transition-colors">{faq.q}</AccordionTrigger>
                  <AccordionContent className="px-5 pb-4 text-[13px] text-muted-foreground leading-relaxed">{faq.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-background px-5 py-12">
        <div className="container mx-auto max-w-md text-center">
          <div className="rounded-2xl p-8" style={{ background: 'linear-gradient(135deg, hsl(120,52%,93%), hsl(213,100%,94%))' }}>
            <p className="text-xl font-extrabold text-foreground">Start following verified advisors today</p>
            <p className="mt-2 text-sm text-muted-foreground">Browse groups, check track records, subscribe with confidence.</p>
            <Link to="/discover">
              <Button className="mt-5 h-12 px-8 rounded-xl bg-primary text-[15px] font-bold tc-btn-click">
                Explore Advisors <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* SEBI Disclaimer bar */}
      <div className="border-t bg-card px-4 py-3 text-center">
        <p className="text-[11px] text-muted-foreground">
          <Shield className="inline h-3 w-3 text-primary mr-1" />
          All advisors on TradeCircle are SEBI registered. SEBI does not endorse any advisor's performance.
        </p>
      </div>

      <Footer />
    </div>
  );
}
