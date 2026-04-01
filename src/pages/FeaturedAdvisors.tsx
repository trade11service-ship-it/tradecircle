import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { useAuth } from '@/lib/auth';
import { Shield, CheckCircle, TrendingUp, Users, BarChart3, ArrowRight } from 'lucide-react';
import { setMetaTags, SEO_CONFIG } from '@/lib/seo';

interface FeaturedAdvisor {
  id: string;
  full_name: string;
  profile_photo_url: string | null;
  sebi_reg_no: string;
  strategy_type: string | null;
  bio: string | null;
  public_description: string | null;
  public_tagline: string | null;
  public_years_experience: number | null;
  email: string;
  phone: string | null;
  status: string;
  created_at: string | null;
}

interface AdvisorWithStats extends FeaturedAdvisor {
  signalStats: { total_signals: number; win_count: number; loss_count: number; resolved_count: number };
  subscriberCount: number;
  groupCount: number;
}

const toTitleCase = (s: string) => s.replace(/\b\w/g, c => c.toUpperCase());

export default function FeaturedAdvisors() {
  const { profile } = useAuth();
  const [advisors, setAdvisors] = useState<AdvisorWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMetaTags(SEO_CONFIG.landing);
  }, []);

  useEffect(() => {
    fetchFeaturedAdvisors();
  }, []);

  const fetchFeaturedAdvisors = async () => {
    try {
      const { data: advisorData, error } = await (supabase.from('advisors') as any)
        .select('id, full_name, profile_photo_url, sebi_reg_no, strategy_type, bio, public_description, public_tagline, public_years_experience, email, phone, status, created_at')
        .eq('status', 'approved')
        .eq('is_public_featured', true)
        .order('public_sort_order', { ascending: true });

      if (error) throw error;

      const withStats = await Promise.all(
        (advisorData || []).map(async (advisor: FeaturedAdvisor) => {
          const [{ data: statsData }, { data: subCount }, { data: groups }] = await Promise.all([
            supabase.rpc('get_advisor_signal_stats', { _advisor_id: advisor.id }),
            supabase.rpc('get_advisor_subscriber_count', { _advisor_id: advisor.id }),
            supabase.from('groups').select('id', { count: 'exact', head: true }).eq('advisor_id', advisor.id).eq('is_active', true),
          ]);
          return {
            ...advisor,
            signalStats: (statsData as any) || { total_signals: 0, win_count: 0, loss_count: 0, resolved_count: 0 },
            subscriberCount: (subCount as number) || 0,
            groupCount: groups?.length || 0,
          };
        })
      );
      setAdvisors(withStats);
    } catch (err) {
      console.error('Error fetching featured advisors:', err);
    } finally {
      setLoading(false);
    }
  };

  const getAccuracy = (stats: AdvisorWithStats['signalStats']) => {
    if (stats.resolved_count === 0) return null;
    return Math.round((stats.win_count / stats.resolved_count) * 100);
  };

  const getBio = (advisor: FeaturedAdvisor) => {
    const text = advisor.public_description || advisor.bio || '';
    if (text.length < 30) return 'SEBI registered Research Analyst providing verified trading signals and market analysis.';
    return text;
  };

  const memberSince = (date: string | null) => {
    if (!date) return 'Member';
    return new Date(date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F0F2F5' }}>
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Page Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-3" style={{ backgroundColor: '#E8F5E9' }}>
            <Shield className="h-4 w-4" style={{ color: '#1B5E20' }} />
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#1B5E20' }}>SEBI Verified Advisors</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">
            Advisors on TradeCircle
          </h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-xl mx-auto">
            Tap any card to see full track record, signals, and subscription details.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : advisors.length === 0 ? (
          <div className="rounded-2xl bg-card py-16 text-center border border-border">
            <Users className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">No featured advisors yet. Check back soon.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {advisors.map((advisor) => {
              const accuracy = getAccuracy(advisor.signalStats);
              return (
                <Link
                  key={advisor.id}
                  to={`/advisor/${advisor.id}`}
                  className="block group"
                >
                  <div className="rounded-2xl bg-white border border-gray-200 shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                    {/* Top banner strip */}
                    <div className="h-2 w-full" style={{ background: 'linear-gradient(90deg, #1B5E20, #2E7D32, #4CAF50)' }} />

                    {/* Card body */}
                    <div className="p-5">
                      {/* Row 1: Photo + Name + Badge */}
                      <div className="flex items-start gap-4 mb-4">
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                          <div className="h-20 w-20 rounded-full border-3 overflow-hidden" style={{ borderColor: '#2E7D32' }}>
                            {advisor.profile_photo_url ? (
                              <img src={advisor.profile_photo_url} alt={advisor.full_name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-white text-2xl font-bold" style={{ background: 'linear-gradient(135deg, #1B5E20, #2E7D32)' }}>
                                {advisor.full_name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="absolute -bottom-1 -right-1 rounded-full p-1 border-2 border-white" style={{ backgroundColor: '#2E7D32' }}>
                            <CheckCircle className="h-3.5 w-3.5 text-white" />
                          </div>
                        </div>

                        {/* Name & info */}
                        <div className="flex-1 min-w-0">
                          <h2 className="text-lg font-bold text-foreground leading-tight truncate">
                            {toTitleCase(advisor.full_name)}
                          </h2>
                          <div className="flex items-center gap-1 mt-0.5">
                            <CheckCircle className="h-3 w-3" style={{ color: '#2E7D32' }} />
                            <span className="text-[11px] font-semibold" style={{ color: '#2E7D32' }}>TradeCircle Verified</span>
                          </div>
                          {advisor.public_tagline && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{advisor.public_tagline}</p>
                          )}
                          {/* SEBI Badge */}
                          <div className="inline-flex items-center gap-1.5 mt-2 rounded-full px-3 py-1 text-[11px] font-bold" style={{ backgroundColor: '#E8F5E9', color: '#1B5E20' }}>
                            <Shield className="h-3 w-3" />
                            SEBI ✓ {advisor.sebi_reg_no}
                          </div>
                        </div>
                      </div>

                      {/* Bio */}
                      <p className="text-[13px] text-gray-600 leading-relaxed mb-4 line-clamp-2">
                        {getBio(advisor)}
                      </p>

                      {/* Stats Row */}
                      <div className="grid grid-cols-4 gap-2 mb-4 py-3 rounded-xl" style={{ backgroundColor: '#F8F9FA' }}>
                        <div className="text-center">
                          <p className="text-base font-bold text-foreground">{advisor.signalStats.total_signals}</p>
                          <p className="text-[10px] text-muted-foreground font-medium">Signals</p>
                        </div>
                        <div className="text-center border-l border-gray-200">
                          <p className="text-base font-bold text-foreground">{advisor.subscriberCount}</p>
                          <p className="text-[10px] text-muted-foreground font-medium">Members</p>
                        </div>
                        <div className="text-center border-l border-gray-200">
                          <p className="text-base font-bold" style={{ color: accuracy !== null ? '#1B5E20' : undefined }}>
                            {accuracy !== null ? `${accuracy}%` : '—'}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-medium">Accuracy</p>
                        </div>
                        <div className="text-center border-l border-gray-200">
                          <p className="text-base font-bold text-foreground">{advisor.groupCount}</p>
                          <p className="text-[10px] text-muted-foreground font-medium">Groups</p>
                        </div>
                      </div>

                      {/* Details Row */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {advisor.strategy_type && (
                          <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold bg-purple-50 text-purple-800 border border-purple-100">
                            <BarChart3 className="h-3 w-3" />
                            {advisor.strategy_type}
                          </span>
                        )}
                        {advisor.public_years_experience && (
                          <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-100">
                            <TrendingUp className="h-3 w-3" />
                            {advisor.public_years_experience}+ Years
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold bg-gray-50 text-gray-700 border border-gray-200">
                          Since {memberSince(advisor.created_at)}
                        </span>
                      </div>

                      {/* CTA */}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <span className="text-xs text-muted-foreground font-medium">View full profile & groups</span>
                        <div className="flex items-center gap-1 text-sm font-bold group-hover:gap-2 transition-all" style={{ color: '#1B5E20' }}>
                          View Profile
                          <ArrowRight className="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
