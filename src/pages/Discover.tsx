import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, Users, BarChart2, Search, ArrowRight, TrendingUp } from 'lucide-react';
import { HeroSection } from '@/components/HeroSection';
import { GroupCard } from '@/components/GroupCard';
import { setMetaTags, SEO_CONFIG } from '@/lib/seo';

interface GroupWithDetails {
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

const toTitleCase = (s: string) => s.replace(/\b\w/g, c => c.toUpperCase());

export default function Groups() {
  const [groups, setGroups] = useState<GroupWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [sort, setSort] = useState<'subscribers' | 'accuracy' | 'newest'>('subscribers');

  // Set meta tags
  useEffect(() => {
    setMetaTags(SEO_CONFIG.discover);
  }, []);

  useEffect(() => { fetchGroups(); }, []);

  const fetchGroups = async () => {
    const { data: grps } = await supabase
      .from('groups')
      .select('id, name, description, monthly_price, dp_url, advisor_id, advisors!inner(full_name, profile_photo_url, sebi_reg_no, strategy_type)')
      .eq('is_active', true);

    if (!grps) { setLoading(false); return; }

    const withStats = await Promise.all(grps.map(async (g: any) => {
      const [{ data: subCount }, { data: stats }] = await Promise.all([
        supabase.rpc('get_advisor_subscriber_count', { _advisor_id: g.advisor_id }),
        supabase.rpc('get_advisor_signal_stats', { _advisor_id: g.advisor_id }),
      ]);
      const s = (stats as any) || { total_signals: 0, win_count: 0, resolved_count: 0 };
      return {
        id: g.id,
        name: g.name,
        description: g.description,
        monthly_price: g.monthly_price,
        dp_url: g.dp_url,
        advisor_id: g.advisor_id,
        advisor_name: g.advisors.full_name,
        advisor_photo: g.advisors.profile_photo_url,
        sebi_reg_no: g.advisors.sebi_reg_no,
        strategy_type: g.advisors.strategy_type,
        sub_count: (subCount as number) || 0,
        signal_count: s.total_signals || 0,
        win_count: s.win_count || 0,
        resolved_count: s.resolved_count || 0,
      };
    }));

    setGroups(withStats);
    setLoading(false);
  };

  const filters = ['All', 'Intraday', 'Swing', 'Options', 'Equity'];

  const filtered = groups
    .filter(g => {
      const matchSearch = g.name.toLowerCase().includes(search.toLowerCase()) ||
        g.advisor_name.toLowerCase().includes(search.toLowerCase()) ||
        (g.strategy_type || '').toLowerCase().includes(search.toLowerCase());
      const matchFilter = filter === 'All' || (g.strategy_type || '').toLowerCase().includes(filter.toLowerCase());
      return matchSearch && matchFilter;
    })
    .sort((a, b) => {
      if (sort === 'subscribers') return b.sub_count - a.sub_count;
      if (sort === 'accuracy') {
        const accA = a.resolved_count > 0 ? a.win_count / a.resolved_count : 0;
        const accB = b.resolved_count > 0 ? b.win_count / b.resolved_count : 0;
        return accB - accA;
      }
      return 0; // newest — groups already ordered
    });

  const getAccuracy = (g: GroupWithDetails) =>
    g.resolved_count > 0 ? Math.round((g.win_count / g.resolved_count) * 100) : null;

  const getAccuracyColor = (acc: number | null, signalCount: number) => {
    if (signalCount < 10 || acc === null) return 'bg-muted text-muted-foreground';
    if (acc >= 70) return 'bg-primary/10 text-primary';
    if (acc >= 50) return 'bg-warning/20 text-[hsl(var(--warning))]';
    return 'bg-destructive/10 text-destructive';
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      {/* Hero Section */}
      <HeroSection
        title="Find SEBI Verified Trading Advisors"
        subtitle="Browse manually verified advisors with public track records. Subscribe to get intraday signals, swing trades, and F&O analysis directly to Telegram."
      />

      <div className="container mx-auto px-4 py-6 md:py-10 flex-1">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
            Browse Verified Advisor Groups
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Filter by strategy type (Intraday, Swing, F&O), sort by subscribers or accuracy, and filter by signal type.
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search advisors or groups..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-12 rounded-xl border-[1.5px] pl-11 text-sm focus:border-primary focus:ring-2 focus:ring-primary/10"
          />
        </div>

        {/* Filter + Sort */}
        <div className="flex items-center gap-3 mb-6 overflow-x-auto pb-1">
          <div className="flex gap-2 flex-1">
            {filters.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold transition-all ${
                  filter === f
                    ? 'bg-foreground text-background'
                    : 'border border-border bg-card text-muted-foreground hover:border-foreground/30'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <select
            value={sort}
            onChange={e => setSort(e.target.value as any)}
            className="shrink-0 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground"
          >
            <option value="subscribers">Most Subscribers</option>
            <option value="accuracy">Best Accuracy</option>
            <option value="newest">Newest</option>
          </select>
        </div>

        {/* Loading skeleton */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-2xl border border-border bg-card p-5 animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-12 w-12 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 rounded bg-muted" />
                    <div className="h-3 w-24 rounded bg-muted" />
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {[1, 2, 3, 4].map(j => <div key={j} className="h-12 rounded-lg bg-muted" />)}
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card py-16 text-center">
            <TrendingUp className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-lg font-semibold text-foreground">No groups found</p>
            <p className="mt-1 text-sm text-muted-foreground">Try a different search or filter</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(g => {
              const accuracy = getAccuracy(g);
              const hasHighAccuracy = accuracy !== null && accuracy >= 70 && g.signal_count >= 10;
              return (
                <Link to={`/advisor/${g.advisor_id}`} key={g.id}>
                  <div className={`group overflow-hidden rounded-2xl border-[1.5px] bg-card shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 ${
                    hasHighAccuracy ? 'border-l-4 border-l-primary border-r-border border-t-border border-b-border' : 'border-border'
                  }`}>
                    <div className="p-4 md:p-5">
                      {/* Row 1: Identity */}
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-lg font-bold text-primary-foreground overflow-hidden">
                          {g.advisor_photo ? (
                            <img src={g.advisor_photo} alt={g.advisor_name} className="h-full w-full object-cover" />
                          ) : toTitleCase(g.advisor_name).charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-foreground truncate">{toTitleCase(g.advisor_name)}</p>
                            <span className="inline-flex items-center gap-0.5 rounded-full border border-primary bg-primary/5 px-2 py-0.5 text-[10px] font-semibold text-primary shrink-0">
                              <Shield className="h-2.5 w-2.5" /> SEBI ✓
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{g.name}</p>
                        </div>
                        <span className="shrink-0 rounded-lg bg-primary/5 border border-primary/20 px-3 py-1.5 text-sm font-extrabold text-primary">
                          ₹{g.monthly_price.toLocaleString('en-IN')}/mo
                        </span>
                      </div>

                      {/* Row 2: Stats */}
                      <div className="grid grid-cols-4 gap-2 mb-3">
                        <div className="rounded-lg bg-muted p-2 text-center">
                          <p className="text-xs text-muted-foreground">📊 Signals</p>
                          <p className="text-sm font-bold text-foreground">{g.signal_count}</p>
                        </div>
                        <div className="rounded-lg bg-muted p-2 text-center">
                          <p className="text-xs text-muted-foreground">✅ Accuracy</p>
                          <p className={`text-sm font-bold ${accuracy !== null && accuracy >= 70 ? 'text-primary' : accuracy !== null && accuracy >= 50 ? 'text-[hsl(var(--warning))]' : 'text-muted-foreground'}`}>
                            {accuracy !== null ? `${accuracy}%` : g.signal_count < 10 ? 'New' : '—'}
                          </p>
                        </div>
                        <div className="rounded-lg bg-muted p-2 text-center">
                          <p className="text-xs text-muted-foreground">👥 Subs</p>
                          <p className="text-sm font-bold text-foreground">{g.sub_count}</p>
                        </div>
                        <div className="rounded-lg bg-muted p-2 text-center">
                          <p className="text-xs text-muted-foreground">📈 Type</p>
                          <p className="text-sm font-bold text-foreground truncate">{g.strategy_type || 'All'}</p>
                        </div>
                      </div>

                      {/* Row 3: Description */}
                      {g.description && (
                        <p className="text-[13px] text-muted-foreground leading-relaxed line-clamp-2 mb-3">
                          "{g.description}"
                        </p>
                      )}

                      {/* CTA */}
                      <Button className="w-full h-11 rounded-xl bg-primary font-bold hover:bg-primary/90 transition-all">
                        View Profile & Subscribe <ArrowRight className="ml-1 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

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
