import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Star, Search, TrendingUp, Shield, Users } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Advisor = Tables<'advisors'>;

export default function Landing() {
  const [advisors, setAdvisors] = useState<(Advisor & { groups: { monthly_price: number }[]; subCount: number })[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdvisors();
  }, []);

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
      <section className="border-b bg-card px-4 py-20 md:py-28">
        <div className="container mx-auto max-w-3xl text-center">
          <Badge variant="secondary" className="mb-4 px-4 py-1 text-xs font-medium">SEBI Verified Platform</Badge>
          <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl">
            Find SEBI-Verified<br />Trading Advisors
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
            Subscribe to expert signal groups. Verified licenses. Real track records.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a href="#advisors"><Button size="lg" className="px-8 py-6 text-base">Browse Advisors</Button></a>
            <Link to="/advisor-register"><Button size="lg" variant="outline" className="px-8 py-6 text-base">Register as Advisor</Button></Link>
          </div>
        </div>
      </section>

      {/* Trust indicators */}
      <section className="border-b bg-muted/30 px-4 py-10">
        <div className="container mx-auto grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="flex items-center gap-4 rounded-lg bg-card p-5 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">SEBI Verified</p>
              <p className="text-sm text-muted-foreground">All advisors are SEBI registered</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-lg bg-card p-5 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Real Track Records</p>
              <p className="text-sm text-muted-foreground">Transparent signal history</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-lg bg-card p-5 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Growing Community</p>
              <p className="text-sm text-muted-foreground">Trusted by thousands of traders</p>
            </div>
          </div>
        </div>
      </section>

      {/* Advisors */}
      <section id="advisors" className="container mx-auto px-4 py-14">
        <div className="mb-8">
          <h2 className="text-2xl font-bold">Top Advisors</h2>
          <p className="mt-1 text-muted-foreground">Subscribe to get real-time trading signals</p>
        </div>

        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by name or strategy..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <div className="flex gap-2">
            {filters.map(f => (
              <Button key={f} variant={filter === f ? 'default' : 'outline'} size="sm" onClick={() => setFilter(f)}>{f}</Button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-muted-foreground">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            Loading advisors...
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border bg-card py-16 text-center">
            <p className="text-lg text-muted-foreground">No advisors found</p>
            <p className="mt-1 text-sm text-muted-foreground">Try a different search or filter</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(advisor => {
              const minPrice = advisor.groups?.length > 0 ? Math.min(...advisor.groups.map((g: any) => g.monthly_price)) : null;
              return (
                <div key={advisor.id} className="group rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                      {advisor.profile_photo_url ? (
                        <img src={advisor.profile_photo_url} alt={advisor.full_name} className="h-14 w-14 rounded-full object-cover" />
                      ) : (
                        advisor.full_name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-foreground">{advisor.full_name}</p>
                      <Badge variant="outline" className="mt-1 border-primary/30 text-primary text-xs">
                        <Shield className="mr-1 h-3 w-3" /> SEBI: {advisor.sebi_reg_no}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <Badge variant="secondary">{advisor.strategy_type}</Badge>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Star className="h-3.5 w-3.5 fill-current" style={{ color: 'hsl(45, 93%, 47%)' }} /> 4.5
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{advisor.subCount} subscribers</p>
                  {minPrice && <p className="mt-1 text-base font-semibold">Starting from ₹{minPrice}/month</p>}
                  <Link to={`/advisor/${advisor.id}`}>
                    <Button className="mt-4 w-full" variant="outline" size="sm">View Profile →</Button>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t bg-card px-4 py-10">
        <div className="container mx-auto text-center">
          <p className="text-lg font-semibold text-secondary">TradeCircle</p>
          <p className="mt-2 text-sm text-muted-foreground">SEBI Registered Advisors Only • Built for Indian Traders</p>
          <p className="mt-1 text-xs text-muted-foreground">© 2026 TradeCircle. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
