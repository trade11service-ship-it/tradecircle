import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { GroupCard } from '@/components/GroupCard';
import { Button } from '@/components/ui/button';
import { Shield, ShieldCheck, FileCheck, Lock, CreditCard, Bell, ArrowRight, BarChart2, Eye, Users, IndianRupee, RefreshCw, Search, AlertCircle, CheckCircle, HelpCircle, ChevronDown } from 'lucide-react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { useAuth } from '@/lib/auth';

interface GroupData {
  id: string;
  name: string;
  description: string | null;
  monthly_price: number;
  dp_url: string | null;
  advisor_id: string;
  advisor_name: string;
  advisor_photo: string | null;
  sebi_reg_no: string;
  strategy_type: string | null;
  sub_count: number;
  signal_count: number;
  win_count: number;
  resolved_count: number;
}

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();
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

  const trustItems = ['🛡️ SEBI Verified Only', '📊 Full Signal History', '🔔 Instant Telegram Alerts', '₹ Cancel Anytime'];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative px-5 pt-8 pb-10 md:pt-20 md:pb-16 overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[300px] opacity-60" style={{ background: 'radial-gradient(ellipse 600px 300px at 50% -50px, hsl(120,52%,93%) 0%, transparent 70%)' }} />
        <div className="container relative mx-auto max-w-lg md:max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary px-5 py-2 text-[13px] font-bold text-primary tracking-wide" style={{ background: 'linear-gradient(135deg, hsl(120,52%,93%) 0%, hsl(213,100%,94%) 100%)' }}>
            <Shield className="h-4 w-4" /> SEBI Verified Advisor Marketplace
          </span>
          <h1 className="mt-5 leading-tight">
            <span className="block text-[32px] md:text-[40px] font-extrabold text-secondary tracking-tight">India's Most Trusted</span>
            <span className="relative inline-block text-[32px] md:text-[40px] font-extrabold text-foreground tracking-tight">
              Trading Advisory Platform
              <span className="absolute bottom-0 left-0 h-1 rounded-full bg-primary animate-hero-underline" />
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-[300px] md:max-w-md text-[15px] leading-[1.7] text-muted-foreground">
            Every advisor on TradeCircle holds a valid SEBI registration number — manually verified by our team before they can post a single signal.
          </p>
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
          <Link to="/groups">
            <Button className="mt-7 w-full h-[54px] rounded-xl bg-primary text-[17px] font-bold tracking-wide shadow-[0_6px_20px_rgba(27,94,32,0.35)] hover:bg-primary/90 hover:-translate-y-px hover:shadow-[0_8px_24px_rgba(27,94,32,0.4)] transition-all tc-btn-click">
              Explore Verified Advisors <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </Link>
          <Link to="/advisor-register">
            <Button variant="outline" className="mt-3 w-full h-[50px] rounded-xl border-2 border-secondary text-secondary text-base font-semibold hover:bg-light-blue tc-btn-click">
              Join as SEBI Advisor
            </Button>
          </Link>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-[12px] font-medium text-muted-foreground">
            <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5 text-primary" /> SEBI Compliant</span>
            <span className="text-border">•</span>
            <span className="inline-flex items-center gap-1"><Bell className="h-3.5 w-3.5 text-secondary" /> Instant Telegram Signals</span>
            <span className="text-border">•</span>
            <span className="inline-flex items-center gap-1"><CreditCard className="h-3.5 w-3.5 text-primary" /> Cancel Anytime</span>
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="border-y bg-off-white overflow-hidden">
        <div className="flex animate-marquee whitespace-nowrap py-4">
          {[...trustItems, ...trustItems, ...trustItems].map((item, i) => (
            <span key={i} className="mx-4 md:mx-8 text-sm font-medium text-muted-foreground inline-flex items-center gap-2">
              {item}<span className="text-border">•</span>
            </span>
          ))}
        </div>
      </section>

      {/* Browse Advisors Section - PUBLIC */}
      <section id="advisors" className="bg-background px-5 py-12 md:py-16">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-6">
            <div>
              <span className="text-[11px] font-bold text-primary uppercase tracking-[2px]">BROWSE GROUPS</span>
              <h2 className="mt-1 text-[28px] font-extrabold text-foreground tracking-tight">Top Advisor Groups</h2>
              <p className="mt-1 text-sm text-muted-foreground">SEBI verified advisors with transparent track records</p>
            </div>
            <Link to="/groups">
              <Button variant="outline" className="mt-3 md:mt-0 border-primary text-primary hover:bg-primary/5">
                View All Groups <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="rounded-2xl border border-border bg-card p-5 animate-pulse">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-full bg-muted" />
                    <div className="flex-1 space-y-2"><div className="h-4 w-24 rounded bg-muted" /><div className="h-3 w-16 rounded bg-muted" /></div>
                  </div>
                  <div className="h-8 rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : groups.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card py-12 text-center">
              <p className="text-muted-foreground">No groups available yet. Check back soon!</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {groups.map(g => (
                <GroupCard
                  key={g.id}
                  advisorId={g.advisor_id}
                  advisorName={g.advisor_name}
                  advisorPhoto={g.advisor_photo}
                  sebiRegNo={g.sebi_reg_no}
                  groupName={g.name}
                  description={g.description}
                  monthlyPrice={g.monthly_price}
                  subCount={g.sub_count}
                  signalCount={g.signal_count}
                  winCount={g.win_count}
                  resolvedCount={g.resolved_count}
                  strategyType={g.strategy_type}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-muted px-5 py-12 md:py-16">
        <div className="container mx-auto">
          <div className="text-center">
            <span className="inline-block rounded-full border border-secondary bg-light-blue px-3.5 py-1 text-[11px] font-bold text-secondary mb-2.5">SIMPLE PROCESS</span>
            <h2 className="text-[26px] font-extrabold text-foreground tracking-tight">How It Works</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">From discovery to signals in 3 steps</p>
          </div>
          <div className="relative mx-auto mt-7 max-w-[340px] md:hidden">
            <div className="absolute left-[27px] top-7 bottom-7 w-0.5 z-0" style={{ background: 'linear-gradient(to bottom, hsl(var(--primary)), hsl(var(--secondary)), hsl(var(--primary)))' }} />
            {[
              { num: 1, title: 'Browse Verified Advisors', desc: 'Filter by strategy, check full signal history and SEBI credentials.', tag: '🛡️ SEBI verified only' },
              { num: 2, title: 'Subscribe to a Group', desc: 'Choose your advisor\'s group and pay securely. Cancel anytime.', tag: '💳 Powered by Razorpay' },
              { num: 3, title: 'Get Signals on Telegram', desc: 'Every trade alert lands directly in your personal Telegram.', tag: '🔔 Real-time delivery' },
            ].map((step) => (
              <div key={step.num} className="relative z-[1] flex items-start gap-4 mb-6 last:mb-0">
                <div className="flex h-14 w-14 min-w-[56px] items-center justify-center rounded-full border-[2.5px] border-primary bg-card text-xl font-extrabold text-primary shadow-[0_4px_12px_rgba(27,94,32,0.15)]">{step.num}</div>
                <div className="pt-2">
                  <h3 className="text-base font-bold text-foreground">{step.title}</h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{step.desc}</p>
                  <span className="mt-2 inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground">{step.tag}</span>
                </div>
              </div>
            ))}
            <div className="mt-2 rounded-xl border-[1.5px] border-primary bg-card p-4 text-center">
              <p className="text-sm font-semibold text-foreground">Ready to find your advisor?</p>
              <Link to="/groups"><Button className="mt-2.5 w-full rounded-lg bg-primary text-sm font-semibold tc-btn-click">Browse Groups <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button></Link>
            </div>
          </div>
          <div className="relative mt-10 hidden md:grid md:grid-cols-3 md:gap-6 lg:gap-8 max-w-3xl mx-auto">
            {[
              { num: 1, icon: Search, title: 'Browse Verified Advisors', desc: 'Filter by strategy, check full signal history and SEBI credentials.', tag: '🛡️ SEBI verified only' },
              { num: 2, icon: CreditCard, title: 'Subscribe to a Group', desc: 'Choose your advisor\'s group and pay securely. Cancel anytime.', tag: '💳 Powered by Razorpay' },
              { num: 3, icon: Bell, title: 'Get Signals on Telegram', desc: 'Every trade alert lands directly in your personal Telegram.', tag: '🔔 Real-time delivery' },
            ].map((step, i) => (
              <div key={step.num} className="relative rounded-2xl border-[1.5px] border-border bg-card p-7 text-center shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
                {i < 2 && <div className="absolute -right-4 top-1/2 -translate-y-1/2 z-10"><ArrowRight className="h-5 w-5 text-primary opacity-40" /></div>}
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-[2.5px] border-primary bg-card text-xl font-extrabold text-primary shadow-[0_4px_12px_rgba(27,94,32,0.15)]">{step.num}</div>
                <step.icon className="mx-auto mt-3 h-8 w-8 text-primary" />
                <h3 className="mt-3 text-[17px] font-bold text-foreground">{step.title}</h3>
                <p className="mt-2 text-[13px] text-muted-foreground">{step.desc}</p>
                <span className="mt-3 inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">{step.tag}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why TradeCircle */}
      <section className="bg-background px-5 py-12 md:py-16">
        <div className="container mx-auto max-w-2xl">
          <div className="text-center">
            <span className="text-[11px] font-bold text-primary uppercase tracking-[3px]">WHY TRADE<span className="text-primary">CIRCLE</span></span>
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
              <div key={i} className="rounded-[14px] border-[1.5px] border-border bg-muted p-4 transition-all duration-150 hover:border-primary hover:bg-light-green">
                <div className={`flex h-9 w-9 items-center justify-center rounded-[10px] ${f.iconBg} mb-2.5`}>
                  <f.icon className={`h-[18px] w-[18px] ${f.iconColor}`} />
                </div>
                <h3 className="text-[13px] font-bold leading-snug text-foreground">{f.title}</h3>
                <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border-[1.5px] border-border bg-muted px-4 py-3.5">
            <span className="text-sm font-semibold text-foreground">Ready to find your advisor?</span>
            <Link to="/groups"><Button className="w-full sm:w-auto rounded-lg bg-primary px-4 py-2 text-[13px] font-semibold tc-btn-click">Browse Groups <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button></Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-muted px-5 py-12 md:py-16">
        <div className="container mx-auto max-w-2xl">
          <div className="mb-7">
            <span className="text-[11px] font-bold text-primary uppercase tracking-[3px]">QUICK ANSWERS</span>
            <h2 className="mt-1.5 text-[28px] font-extrabold leading-[1.2] tracking-tight text-foreground">
              Questions?<br />We're <span className="text-secondary">Straight</span><br />With You.
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">No corporate answers. Just honest replies.</p>
          </div>
          <div className="overflow-hidden rounded-2xl border-[1.5px] border-border bg-card shadow-[0_2px_12px_rgba(0,0,0,0.05)]">
            <Accordion type="single" collapsible defaultValue="faq-0">
              {[
                { q: 'Is TradeCircle a SEBI registered investment advisor?', a: "No — and that's intentional. TradeCircle is a technology marketplace operated by STREZONIC PRIVATE LIMITED. We list and verify SEBI-registered advisors, but we don't give any advice ourselves." },
                { q: 'How do you verify advisors?', a: "Every advisor submits their SEBI registration number, Aadhaar, PAN, and documents during signup. Our team manually checks their license on SEBI's official database before approving." },
                { q: 'Can I cancel my subscription?', a: 'Yes, you can cancel anytime. Your subscription remains active until the end of the billing period.' },
                { q: 'How do I receive signals?', a: 'Signals are delivered via our Telegram bot directly to your personal Telegram. You also see them in your dashboard feed.' },
                { q: 'What if an advisor gives bad advice?', a: 'Each advisor is independently SEBI registered and responsible for their advice. TradeCircle provides the track record transparency so you can make informed decisions.' },
              ].map((faq, i) => (
                <AccordionItem key={i} value={`faq-${i}`} className="border-b border-border last:border-0">
                  <AccordionTrigger className="px-5 py-4 text-sm font-semibold text-foreground hover:text-primary [&[data-state=open]]:text-primary transition-colors">{faq.q}</AccordionTrigger>
                  <AccordionContent className="px-5 pb-4 text-[13px] text-muted-foreground leading-relaxed">{faq.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-background px-5 py-12">
        <div className="container mx-auto max-w-lg text-center">
          <div className="rounded-2xl p-8" style={{ background: 'linear-gradient(135deg, hsl(120,52%,93%), hsl(213,100%,94%))' }}>
            <p className="text-xl font-extrabold text-foreground">Start following verified advisors today</p>
            <p className="mt-2 text-sm text-muted-foreground">Browse groups, check track records, and subscribe with confidence.</p>
            <Link to="/groups"><Button className="mt-5 h-12 px-8 rounded-xl bg-primary text-base font-bold tc-btn-click">Explore Groups <ArrowRight className="ml-1 h-4 w-4" /></Button></Link>
          </div>
        </div>
      </section>

      {/* SEBI disclaimer */}
      <div className="border-t bg-muted px-4 py-3 text-center">
        <p className="text-[11px] text-muted-foreground">
          <Shield className="inline h-3 w-3 text-primary mr-1" />
          All advisors on TradeCircle are SEBI registered. SEBI does not endorse any advisor's performance.
        </p>
      </div>

      <Footer />
    </div>
  );
}
