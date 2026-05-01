import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { Mail, Phone, CheckCircle2, ShieldCheck, Activity, Users, TrendingUp, ArrowRight, Zap, Star } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Advisor = Tables<'advisors'>;

const toTitleCase = (s: string) => s.replace(/\b\w/g, c => c.toUpperCase());

export default function AdvisorProfile() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [advisor, setAdvisor] = useState<Advisor | null>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total_signals: 0, win_count: 0, resolved_count: 0, subscriber_count: 0 });

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  const fetchData = async () => {
    const { data: adv } = await supabase.from('advisors').select('*').eq('id', id!).single();
    if (adv) setAdvisor(adv);

    const { data: grps } = await supabase.from('groups').select('*').eq('advisor_id', id!).eq('is_active', true);
    setGroups(grps || []);

    const [{ data: statsData }, { data: subCount }] = await Promise.all([
      supabase.rpc('get_advisor_signal_stats', { _advisor_id: id! }),
      supabase.rpc('get_advisor_subscriber_count', { _advisor_id: id! }),
    ]);

    setStats({
      total_signals: (statsData as any)?.total_signals || 0,
      win_count: (statsData as any)?.win_count || 0,
      resolved_count: (statsData as any)?.resolved_count || 0,
      subscriber_count: (subCount as number) || 0,
    });

    setLoading(false);
  };

  const accuracy = stats.resolved_count > 0 ? Math.round((stats.win_count / stats.resolved_count) * 100) : null;

  const getContactDisplay = (value: string | null) => {
    if (!value) return 'N/A';
    if (value.includes('@')) {
      const parts = value.split('@');
      return `${parts[0].slice(0, 3)}***@${parts[1]}`;
    }
    return `${value.slice(0, 3)}***${value.slice(-2)}`;
  };

  if (loading) {
    return (
      <div className="min-h-full h-full bg-background">
                <div className="flex items-center justify-center py-32">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent shadow-lg" />
        </div>
      </div>
    );
  }

  if (!advisor) {
    return (
      <div className="min-h-full h-full bg-background">
                <div className="container mx-auto px-4 py-20 text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">Advisor not found</h2>
          <p className="text-muted-foreground mb-6">This advisor profile may have been removed or is no longer active.</p>
          <Link to="/discover">
            <Button size="lg" className="rounded-full">Browse Verified Advisors</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full h-full bg-background">
      
      <main className="pb-20">
        {/* Massive Hero Section */}
        <section className="relative overflow-hidden bg-card border-b border-border pt-16 pb-12">
          {/* Subtle grid background */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(0,0,0,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.8) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/20 blur-[120px] rounded-full pointer-events-none"></div>

          <div className="container mx-auto max-w-5xl px-4 relative z-10">
            <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
              
              {/* Advisor Avatar */}
              <div className="relative shrink-0">
                <div className="h-40 w-40 md:h-48 md:w-48 rounded-full border-[6px] border-background shadow-2xl overflow-hidden bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-6xl font-extrabold relative z-10">
                  {advisor.profile_photo_url ? (
                    <img src={advisor.profile_photo_url} alt={advisor.full_name} className="h-full w-full object-cover" />
                  ) : (
                    toTitleCase(advisor.full_name).charAt(0)
                  )}
                </div>
                <div className="absolute bottom-2 right-2 bg-primary rounded-full p-2 border-4 border-background shadow-lg z-20">
                  <CheckCircle2 className="h-8 w-8 text-white" />
                </div>
              </div>

              {/* Advisor Details */}
              <div className="text-center md:text-left flex-1">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary border border-primary/20 mb-4 shadow-sm">
                  <ShieldCheck className="h-4 w-4" /> SEBI Registered • {advisor.sebi_reg_no}
                </div>
                
                <h1 className="text-4xl md:text-5xl font-extrabold text-foreground tracking-tight mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  {toTitleCase(advisor.full_name)}
                </h1>
                
                <p className="text-lg md:text-xl text-muted-foreground mb-6 font-medium">
                  {advisor.public_tagline || 'SEBI Registered Trading Advisor'}
                </p>

                {/* Desktop Quick Stats */}
                <div className="hidden md:flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      <Users className="h-5 w-5 text-foreground" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-foreground leading-none">{stats.subscriber_count}</p>
                      <p className="text-xs text-muted-foreground font-semibold">MEMBERS</p>
                    </div>
                  </div>
                  <div className="w-px h-10 bg-border"></div>
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      <Activity className="h-5 w-5 text-foreground" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-foreground leading-none">{stats.total_signals}</p>
                      <p className="text-xs text-muted-foreground font-semibold">SIGNALS</p>
                    </div>
                  </div>
                  <div className="w-px h-10 bg-border"></div>
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <TrendingUp className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-primary leading-none">{accuracy ? `${accuracy}%` : '—'}</p>
                      <p className="text-xs text-primary font-semibold">ACCURACY</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Mobile Quick Stats */}
            <div className="md:hidden mt-8 grid grid-cols-3 gap-2 bg-muted/30 p-2 rounded-2xl border border-border">
              <div className="text-center p-3">
                <p className="text-xl font-bold text-foreground">{stats.subscriber_count}</p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Members</p>
              </div>
              <div className="text-center p-3 border-l border-border">
                <p className="text-xl font-bold text-foreground">{stats.total_signals}</p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Signals</p>
              </div>
              <div className="text-center p-3 border-l border-border">
                <p className="text-xl font-bold text-primary">{accuracy ? `${accuracy}%` : '—'}</p>
                <p className="text-[10px] font-bold text-primary uppercase">Accuracy</p>
              </div>
            </div>
          </div>
        </section>

        <div className="container mx-auto max-w-5xl px-4 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Bio & Info */}
            <div className="lg:col-span-1 space-y-6">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" /> About Advisor
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Strategy Focus</p>
                    <p className="text-sm font-medium text-foreground">{advisor.strategy_type || 'Diversified / All Strategies'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Experience</p>
                    <p className="text-sm font-medium text-foreground">{(advisor as any).public_years_experience ? `${(advisor as any).public_years_experience}+ Years in Markets` : 'SEBI Verified Professional'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Bio</p>
                    <p className="text-sm text-foreground/80 leading-relaxed">{(advisor as any).public_description || advisor.bio || 'SEBI registered Research Analyst providing verified trading signals and comprehensive market analysis.'}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <h3 className="text-sm font-bold text-foreground mb-4 uppercase tracking-wider text-muted-foreground">Contact Info</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <Mail className="h-4 w-4 text-foreground" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase">Email</p>
                      <p className="text-sm font-medium text-foreground">{getContactDisplay(advisor.email)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <Phone className="h-4 w-4 text-foreground" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase">Phone</p>
                      <p className="text-sm font-medium text-foreground">{getContactDisplay(advisor.phone)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Pricing & Channels */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-extrabold text-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>Trading Channels</h2>
                  <p className="text-sm text-muted-foreground">Subscribe to access real-time signals via our platform.</p>
                </div>
              </div>

              {groups.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
                  <Activity className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-foreground mb-1">No Active Channels</h3>
                  <p className="text-sm text-muted-foreground">This advisor hasn't created any subscription channels yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {groups.map((group, idx) => (
                    <div key={group.id} className="relative rounded-2xl border-2 border-border bg-card overflow-hidden hover:border-primary/50 transition-all shadow-sm hover:shadow-md group/card">
                      {idx === 0 && (
                        <div className="absolute top-0 right-0 bg-gradient-to-r from-primary to-secondary text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg z-10 uppercase tracking-widest shadow-sm">
                          Most Popular
                        </div>
                      )}
                      
                      <div className="p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2 group-hover/card:text-primary transition-colors">{group.name}</h3>
                          <p className="text-sm text-muted-foreground mb-4 line-clamp-2 leading-relaxed">
                            {group.description || 'Gain access to premium trading signals, market analysis, and real-time updates directly from the advisor.'}
                          </p>
                          <ul className="flex flex-wrap gap-x-4 gap-y-2">
                            <li className="flex items-center gap-1.5 text-xs font-semibold text-foreground/80">
                              <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Real-time alerts
                            </li>
                            <li className="flex items-center gap-1.5 text-xs font-semibold text-foreground/80">
                              <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Track record included
                            </li>
                            <li className="flex items-center gap-1.5 text-xs font-semibold text-foreground/80">
                              <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Cancel anytime
                            </li>
                          </ul>
                        </div>
                        
                        <div className="w-full md:w-auto flex flex-col items-center md:items-end shrink-0 md:pl-6 md:border-l border-border/50">
                          <div className="text-center md:text-right mb-4">
                            <p className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tighter">₹{group.monthly_price}</p>
                            <p className="text-xs font-semibold text-muted-foreground uppercase mt-1">Per Month</p>
                          </div>
                          <Link to={`/group/${group.id}`} className="w-full md:w-auto">
                            <Button size="lg" className="w-full md:w-auto rounded-xl px-8 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all font-bold group">
                              View Channel <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

          </div>
  );
}
