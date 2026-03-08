import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Star } from 'lucide-react';
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
      <section className="border-b bg-card px-4 py-16 text-center md:py-24">
        <h1 className="text-3xl font-bold text-foreground md:text-5xl">Find SEBI-Verified Trading Advisors</h1>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Subscribe to expert signal groups. Verified licenses. Real track records.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <a href="#advisors"><Button size="lg">Browse Advisors</Button></a>
          <Link to="/advisor-register"><Button size="lg" variant="outline">Register as Advisor</Button></Link>
        </div>
      </section>

      {/* Advisors */}
      <section id="advisors" className="container mx-auto px-4 py-12">
        <h2 className="mb-6 text-2xl font-bold">Top Advisors</h2>

        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center">
          <Input placeholder="Search by name or strategy..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
          <div className="flex gap-2">
            {filters.map(f => (
              <Button key={f} variant={filter === f ? 'default' : 'outline'} size="sm" onClick={() => setFilter(f)}>{f}</Button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-muted-foreground">Loading advisors...</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">No advisors found</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(advisor => {
              const minPrice = advisor.groups?.length > 0 ? Math.min(...advisor.groups.map((g: any) => g.monthly_price)) : null;
              return (
                <div key={advisor.id} className="rounded-lg border bg-card p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-lg font-bold">
                      {advisor.profile_photo_url ? (
                        <img src={advisor.profile_photo_url} alt={advisor.full_name} className="h-14 w-14 rounded-full object-cover" />
                      ) : (
                        advisor.full_name.charAt(0)
                      )}
                    </div>
                    <div>
                      <p className="font-semibold">{advisor.full_name}</p>
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="border-primary text-primary text-xs">SEBI: {advisor.sebi_reg_no}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Badge variant="secondary">{advisor.strategy_type}</Badge>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Star className="h-3 w-3 fill-current" /> 4.5
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{advisor.subCount} subscribers</p>
                  {minPrice && <p className="mt-1 text-sm font-medium">Starting from ₹{minPrice}/month</p>}
                  <Link to={`/advisor/${advisor.id}`}>
                    <Button className="mt-3 w-full" variant="outline" size="sm">View Profile</Button>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t bg-card px-4 py-8 text-center">
        <p className="text-sm text-muted-foreground">SEBI Registered Advisors Only • TradeCircle © 2026</p>
      </footer>
    </div>
  );
}
