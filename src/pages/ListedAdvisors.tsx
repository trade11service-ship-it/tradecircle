import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';


import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { Shield, TrendingUp, Users, Award, CheckCircle, ArrowRight, Phone } from 'lucide-react';
import { setMetaTags, SEO_CONFIG } from '@/lib/seo';

interface ListedAdvisor {
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
}

interface AdvisorWithGroups extends ListedAdvisor {
  groups: any[];
  signalStats: { total_signals: number; win_count: number; loss_count: number; resolved_count: number };
}

export default function ListedAdvisors() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [advisors, setAdvisors] = useState<AdvisorWithGroups[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper function to validate and display bio
  const getValidBio = (bio: string | null, publicDescription: string | null): string => {
    const text = publicDescription || bio || '';
    
    // Check if bio is less than 50 characters
    if (text.length < 50) {
      return 'SEBI registered Research Analyst. Specialises in F&O and intraday strategies.';
    }
    
    // Check for poor patterns
    const lowerText = text.toLowerCase();
    const badPatterns = ['we r', 'r the', 'dvisor', 'experince', 'yars', 'registerd'];
    const hasBadPattern = badPatterns.some(pattern => lowerText.includes(pattern));
    const isAllLowercaseNoPunct = /^[a-z\s]+$/.test(text);
    
    if (hasBadPattern || isAllLowercaseNoPunct) {
      return 'SEBI registered Research Analyst. Specialises in F&O and intraday strategies.';
    }
    
    return text;
  };

  // Set meta tags
  useEffect(() => {
    setMetaTags(SEO_CONFIG.landing);
  }, []);

  useEffect(() => {
    fetchListedAdvisors();
  }, []);

  const fetchListedAdvisors = async () => {
    try {
      // Fetch featured advisors
      const { data: advisorData, error: advisorError } = await (supabase.from('advisors') as any)
        .select('id, full_name, profile_photo_url, sebi_reg_no, strategy_type, bio, public_description, public_tagline, public_years_experience, email, phone, status')
        .eq('status', 'approved')
        .eq('is_public_featured', true)
        .order('public_sort_order', { ascending: true });

      if (advisorError) throw advisorError;

      // Fetch groups and stats for each advisor
      const advisorsWithData = await Promise.all(
        (advisorData || []).map(async (advisor: ListedAdvisor) => {
          // Fetch groups
          const { data: groupsData } = await supabase
            .from('groups')
            .select('*')
            .eq('advisor_id', advisor.id)
            .eq('is_active', true);

          // Fetch signal stats
          const { data: statsData } = await supabase.rpc('get_advisor_signal_stats', { _advisor_id: advisor.id });

          return {
            ...advisor,
            groups: groupsData || [],
            signalStats: (statsData as any) || { total_signals: 0, win_count: 0, loss_count: 0, resolved_count: 0 },
          };
        })
      );

      setAdvisors(advisorsWithData);
    } catch (err) {
      console.error('Error fetching listed advisors:', err);
      toast.error('Failed to load advisors');
    } finally {
      setLoading(false);
    }
  };

  const maskEmail = (email: string) => {
    const [name, domain] = email.split('@');
    const maskedName = name.charAt(0) + '*'.repeat(name.length - 2) + name.charAt(name.length - 1);
    return `${maskedName}@${domain}`;
  };

  const maskPhone = (phone: string | null) => {
    if (!phone) return 'Not shared';
    const cleaned = phone.replace(/\D/g, '');
    return '+91 ' + cleaned.slice(-10).replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3');
  };

  return (
    <div className="min-h-full h-full bg-gradient-to-b from-slate-50 to-white">
      
      <main className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-12 text-center">
          <p className="text-[11px] font-bold text-primary uppercase tracking-[2px]">SEBI VERIFIED ADVISORS</p>
          <h1 className="mt-2 text-4xl md:text-5xl font-extrabold text-foreground tracking-tight">
            Meet Our Listed Advisors
          </h1>
          <p className="mt-3 text-lg text-muted-foreground max-w-2xl mx-auto">
            Handpicked SEBI verified trading advisors with proven track records. Click any advisor to explore their trading groups and subscribe for premium signals.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : advisors.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card py-20 text-center">
            <Users className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-lg text-muted-foreground mb-4">No listed advisors yet</p>
            <p className="text-sm text-muted-foreground">Check back soon for featured advisors.</p>
          </div>
        ) : (
          <div className="space-y-12">
            {advisors.map((advisor) => (
              <div key={advisor.id} className="rounded-2xl border border-slate-300 bg-white shadow-lg overflow-hidden hover:shadow-2xl transition-shadow">
                {/* Header Section with Name and Photo */}
                <div className="relative h-48 bg-gradient-to-r from-slate-100 to-slate-50 px-8 py-8">
                  <div className="flex items-end gap-6 h-full">
                    {/* Left: Name Box */}
                    <div className="flex-1">
                      <div className="rounded-xl bg-slate-200 p-8 h-24 flex items-center">
                        <div>
                          <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">Verified Advisor</p>
                          <h2 className="text-3xl md:text-4xl font-black text-foreground uppercase tracking-tight leading-none mt-1">
                            {advisor.full_name}
                          </h2>
                        </div>
                      </div>
                    </div>

                    {/* Right: Circular Photo */}
                    <div className="relative h-40 w-40 flex-shrink-0 -mb-8">
                      <div className="h-full w-full rounded-full border-4 border-white bg-gradient-to-br from-primary to-secondary shadow-xl overflow-hidden">
                        {advisor.profile_photo_url ? (
                          <img src={advisor.profile_photo_url} alt={advisor.full_name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary to-secondary text-white text-5xl font-bold">
                            {advisor.full_name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      {advisor.status === 'approved' && (
                        <div className="absolute bottom-2 right-2 bg-primary rounded-full p-2 border-4 border-white shadow-lg">
                          <CheckCircle size={24} className="text-white" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Main Content */}
                <div className="px-8 py-8 grid md:grid-cols-3 gap-8">
                  {/* Left Column - Advisor Details */}
                  <div className="space-y-6">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-600 mb-3" style={{ textDecoration: 'underline', textDecorationStyle: 'solid' }}>
                        Registration & Details
                      </p>
                      <div className="space-y-3 ml-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground font-semibold">SEBI Reg No:</span>
                          <span className="font-mono font-bold text-foreground">{advisor.sebi_reg_no}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground font-semibold">Experience:</span>
                          <span className="font-bold text-foreground">{advisor.public_years_experience ? `${advisor.public_years_experience}+ years` : 'Verified'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground font-semibold">Specialization:</span>
                          <span className="font-bold text-primary">{advisor.strategy_type || 'Multi-Asset'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground font-semibold">Service Type:</span>
                          <span className="font-bold text-foreground">Trading Advisory</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground font-semibold">Status:</span>
                          <span className="inline-flex gap-1 items-center">
                            <span className="h-2 w-2 rounded-full bg-primary" />
                            <span className="font-bold text-primary">Active</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-600 mb-3" style={{ textDecoration: 'underline' }}>
                        Contact
                      </p>
                      <div className="space-y-2 ml-2">
                        <div className="flex items-start gap-2 text-sm">
                          <span className="text-muted-foreground font-semibold">Email:</span>
                          <span className="font-mono text-foreground text-xs break-all">{maskEmail(advisor.email)}</span>
                        </div>
                        <div className="flex items-start gap-2 text-sm">
                          <span className="text-muted-foreground font-semibold">Phone:</span>
                          <span className="font-mono text-foreground text-xs">{maskPhone(advisor.phone)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Middle Column - Professional Details */}
                  <div className="space-y-6">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-600 mb-3" style={{ textDecoration: 'underline' }}>
                        About the Advisor
                      </p>
                      <p className="text-sm leading-relaxed text-foreground ml-2">
                        {getValidBio(advisor.bio, advisor.public_description)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-600 mb-3" style={{ textDecoration: 'underline' }}>
                        Performance Metrics
                      </p>
                      <div className="space-y-2 ml-2">
                        <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                          <span className="text-sm text-muted-foreground font-semibold">Total Signals:</span>
                          <span className="font-bold text-foreground">{advisor.signalStats.total_signals}</span>
                        </div>
                        <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                          <span className="text-sm text-muted-foreground font-semibold">Win Rate:</span>
                          <span className="font-bold text-primary">
                            {advisor.signalStats.resolved_count > 0
                              ? `${Math.round((advisor.signalStats.win_count / advisor.signalStats.resolved_count) * 100)}%`
                              : 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                          <span className="text-sm text-muted-foreground font-semibold">Active Groups:</span>
                          <span className="font-bold text-foreground">{advisor.groups.length}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column - CTA and Groups */}
                  <div className="space-y-6 flex flex-col">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-600 mb-3" style={{ textDecoration: 'underline' }}>
                        Trading Expertise
                      </p>
                      <div className="space-y-2 ml-2">
                        <div className="flex items-start gap-2 text-sm">
                          <span className="text-muted-foreground font-semibold">Strategy:</span>
                          <span className="font-bold text-foreground">{advisor.strategy_type || 'Multi-Asset Trading'}</span>
                        </div>
                        <div className="flex items-start gap-2 text-sm">
                          <span className="text-muted-foreground font-semibold">Market Focus:</span>
                          <span className="font-bold text-foreground">Indian Equity & Derivatives</span>
                        </div>
                      </div>
                    </div>

                    {/* CTA Section */}
                    <div className="mt-auto space-y-4 pt-4 border-t border-slate-200">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-600 mb-3">Official Trading Groups</p>
                        {advisor.groups.length > 0 ? (
                          <div className="space-y-2">
                            {advisor.groups.slice(0, 2).map((group) => (
                              <Link
                                key={group.id}
                                to={`/advisor/${advisor.id}#group-${group.id}`}
                                className="block p-3 rounded-lg bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 hover:border-primary/50 hover:bg-primary/15 transition-all"
                              >
                                <p className="font-semibold text-sm text-foreground truncate">{group.name}</p>
                                <p className="text-xs text-primary font-semibold mt-1">₹{group.monthly_price}/month</p>
                              </Link>
                            ))}
                            {advisor.groups.length > 2 && (
                              <p className="text-xs text-muted-foreground text-center py-2">+ {advisor.groups.length - 2} more groups</p>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">No active groups yet</p>
                        )}
                      </div>

                      <div className="block">
                        <Button onClick={() => navigate(`/advisor/${advisor.id}`)} className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white font-bold py-6 rounded-lg gap-2 text-base">
                          View Full Profile & Groups
                          <ArrowRight size={18} />
                        </Button>
                      </div>

                      <div className="flex items-center justify-center gap-2 pt-2">
                        <Shield size={14} className="text-primary" />
                        <span className="text-xs font-semibold text-primary">SEBI Verified & Authentic</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      
    </div>
  );
}
