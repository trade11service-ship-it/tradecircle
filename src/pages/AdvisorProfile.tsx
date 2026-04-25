import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { Mail, Phone, CheckCircle, BookOpen } from 'lucide-react';
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
    // Fetch advisor details
    const { data: adv } = await supabase.from('advisors').select('*').eq('id', id!).single();
    if (adv) setAdvisor(adv);

    // Fetch groups
    const { data: grps } = await supabase.from('groups').select('*').eq('advisor_id', id!).eq('is_active', true);
    setGroups(grps || []);

    // Fetch stats
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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-purple-100">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!advisor) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-purple-100">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <p className="text-lg text-muted-foreground">Advisor not found</p>
          <Link to="/featured-advisors">
            <Button className="mt-4">View All Advisors</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto max-w-4xl px-4 py-6">
        <div className="rounded-2xl border border-border bg-card p-4 md:p-6 mb-6">
          {/* Header - Compact */}
          <div className="flex items-start gap-4 mb-5">
            <div className="relative flex-shrink-0">
              <div className="h-16 w-16 rounded-full border-2 border-primary bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xl font-bold overflow-hidden">
                {advisor.profile_photo_url ? (
                  <img src={advisor.profile_photo_url} alt={advisor.full_name} className="h-full w-full object-cover" />
                ) : (
                  toTitleCase(advisor.full_name).charAt(0)
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 rounded-full p-1 bg-green-500 border-2 border-white shadow-md">
                <CheckCircle className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-extrabold text-foreground">{toTitleCase(advisor.full_name)}</h1>
              <div className="flex items-center gap-1 mt-1 flex-wrap">
                <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                <span className="text-xs font-semibold text-green-600">Verified</span>
                <span className="text-xs text-gray-400">•</span>
                <span className="text-xs font-semibold text-primary">SEBI {advisor.sebi_reg_no}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-1 mb-5 p-3 rounded-lg bg-muted text-center">
            <div>
              <p className="text-lg font-bold text-foreground">{groups.length}</p>
              <p className="text-[10px] text-gray-600">Groups</p>
            </div>
            <div className="border-l border-border pl-1">
              <p className="text-lg font-bold text-foreground">{stats.subscriber_count}</p>
              <p className="text-[10px] text-gray-600">Members</p>
            </div>
            <div className="border-l border-border pl-1">
              <p className="text-lg font-bold text-foreground">{stats.total_signals}</p>
              <p className="text-[10px] text-gray-600">Signals</p>
            </div>
            <div className="border-l border-border pl-1">
              <p className={`text-lg font-bold ${accuracy ? 'text-green-600' : 'text-gray-400'}`}>
                {accuracy ? `${accuracy}%` : '—'}
              </p>
              <p className="text-[10px] text-gray-600">Acc</p>
            </div>
          </div>

          <div className="mb-5 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-xs text-muted-foreground"><strong>Experience:</strong> {(advisor as any).public_years_experience ? `${(advisor as any).public_years_experience}+ Years` : 'Verified Analyst'}</p>
            <p className="text-xs text-muted-foreground mt-1"><strong>Strategy:</strong> {advisor.strategy_type || 'All Strategies'}</p>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{(advisor as any).public_description || advisor.bio || 'SEBI registered Research Analyst'}</p>
          </div>

          <div className="mb-5 grid gap-2 md:grid-cols-2">
            <div className="rounded-lg border border-border bg-muted p-3 text-xs text-muted-foreground"><Mail className="mr-1 inline h-3.5 w-3.5" /><strong>Email:</strong> {getContactDisplay(advisor.email)}</div>
            <div className="rounded-lg border border-border bg-muted p-3 text-xs text-muted-foreground"><Phone className="mr-1 inline h-3.5 w-3.5" /><strong>Phone:</strong> {getContactDisplay(advisor.phone)}</div>
          </div>

          {groups.length > 0 && (
            <div className="border-t border-border pt-4">
              <h3 className="text-sm font-bold text-foreground mb-3">Subscription groups ({groups.length})</h3>
              <div className="space-y-2">
                {groups.map((group) => (
                  <Link key={group.id} to={`/group/${group.id}`} className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-all group">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground group-hover:text-primary truncate">{group.name}</p>
                      <p className="text-xs text-gray-600">{group.description ? group.description.slice(0, 40) + '...' : 'Trading group'}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <p className="text-sm font-bold text-primary">₹{group.monthly_price}</p>
                      <BookOpen className="h-4 w-4 text-primary" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {groups.length > 0 && (
          <div className="mb-6 flex gap-2">
            <Link to={groups[0] ? `/group/${groups[0].id}` : "/discover"} className="flex-1">
              <Button className="w-full bg-primary hover:bg-primary/90 text-white font-bold rounded-lg">
                See Group
              </Button>
            </Link>
            <Link to="/discover">
              <Button variant="outline" className="px-4 py-2 rounded-lg font-semibold">
                Back
              </Button>
            </Link>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
