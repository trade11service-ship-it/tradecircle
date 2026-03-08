import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { SignalCard } from '@/components/SignalCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type Advisor = Tables<'advisors'>;
type Group = Tables<'groups'>;
type Signal = Tables<'signals'>;

export default function AdvisorProfile() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [advisor, setAdvisor] = useState<Advisor | null>(null);
  const [groups, setGroups] = useState<(Group & { subCount: number })[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [todaySignals, setTodaySignals] = useState<Signal[]>([]);
  const [subscribedGroupIds, setSubscribedGroupIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchData();
  }, [id, user]);

  const fetchData = async () => {
    const { data: adv } = await supabase.from('advisors').select('*').eq('id', id!).single();
    setAdvisor(adv);

    const { data: grps } = await supabase.from('groups').select('*').eq('advisor_id', id!).eq('is_active', true);
    if (grps) {
      const withSubs = await Promise.all(grps.map(async g => {
        const { count } = await supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('group_id', g.id).eq('status', 'active');
        return { ...g, subCount: count || 0 };
      }));
      setGroups(withSubs);
    }

    // Past signals
    const { data: pastSigs } = await supabase.from('signals').select('*').eq('advisor_id', id!).lt('signal_date', new Date().toISOString().split('T')[0]).order('signal_date', { ascending: false }).limit(20);
    setSignals(pastSigs || []);

    // Today's signals (will be filtered by RLS)
    const today = new Date().toISOString().split('T')[0];
    const { data: todaySigs } = await supabase.from('signals').select('*').eq('advisor_id', id!).eq('signal_date', today).order('created_at', { ascending: false });
    setTodaySignals(todaySigs || []);

    // Check subscriptions
    if (user) {
      const { data: subs } = await supabase.from('subscriptions').select('group_id').eq('user_id', user.id).eq('status', 'active');
      setSubscribedGroupIds((subs || []).map(s => s.group_id));
    }

    setLoading(false);
  };

  const handleSubscribe = (group: Group) => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (group.razorpay_payment_link) {
      // For now, create subscription directly (placeholder for payment)
      handleCreateSubscription(group);
    } else {
      handleCreateSubscription(group);
    }
  };

  const handleCreateSubscription = async (group: Group) => {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);
    const { error } = await supabase.from('subscriptions').insert({
      user_id: user!.id,
      group_id: group.id,
      advisor_id: group.advisor_id,
      end_date: endDate.toISOString(),
      amount_paid: group.monthly_price,
      status: 'active',
    });
    if (error) {
      toast.error('Failed to subscribe');
    } else {
      toast.success('Subscribed successfully!');
      setSubscribedGroupIds([...subscribedGroupIds, group.id]);
      fetchData();
    }
  };

  if (loading) return <div className="min-h-screen bg-background"><Navbar /><div className="p-8 text-center">Loading...</div></div>;
  if (!advisor) return <div className="min-h-screen bg-background"><Navbar /><div className="p-8 text-center">Advisor not found</div></div>;

  const isSubscribedToAny = groups.some(g => subscribedGroupIds.includes(g.id));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left column */}
          <div className="lg:col-span-1">
            <div className="rounded-lg border bg-card p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted text-2xl font-bold">
                  {advisor.profile_photo_url ? (
                    <img src={advisor.profile_photo_url} alt={advisor.full_name} className="h-20 w-20 rounded-full object-cover" />
                  ) : advisor.full_name.charAt(0)}
                </div>
                <div>
                  <h1 className="text-xl font-bold">{advisor.full_name}</h1>
                  <div className="flex items-center gap-1 mt-1">
                    <Badge className="bg-primary text-primary-foreground text-xs">✓ SEBI: {advisor.sebi_reg_no}</Badge>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Badge variant="secondary">{advisor.strategy_type}</Badge>
              </div>
              {advisor.bio && <p className="mt-4 text-sm text-muted-foreground">{advisor.bio}</p>}
            </div>

            {/* Groups */}
            <div className="mt-4 space-y-3">
              <h3 className="font-semibold">Signal Groups</h3>
              {groups.length === 0 && (
                <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-center">
                  <p className="text-sm text-muted-foreground">This advisor hasn't created any signal groups yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">Check back later for subscription options.</p>
                </div>
              )}
              {groups.map(group => (
                <div key={group.id} className="rounded-lg border bg-card p-4">
                  <div className="flex items-center gap-3">
                    {group.dp_url ? (
                      <img src={group.dp_url} alt={group.name} className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted font-bold">{group.name.charAt(0)}</div>
                    )}
                    <div>
                      <p className="font-medium">{group.name}</p>
                      <p className="text-sm text-muted-foreground">{group.subCount} subscribers</p>
                    </div>
                  </div>
                  {group.description && <p className="mt-2 text-xs text-muted-foreground">{group.description}</p>}
                  <p className="mt-2 text-lg font-bold">₹{group.monthly_price}/month</p>
                  {subscribedGroupIds.includes(group.id) ? (
                    <Badge className="mt-2 bg-primary text-primary-foreground">✓ Subscribed</Badge>
                  ) : (
                    <Button className="mt-2 w-full" size="sm" onClick={() => handleSubscribe(group)}>Subscribe Now — ₹{group.monthly_price}/mo</Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right column - Signals */}
          <div className="lg:col-span-2">
            {/* Today's signals */}
            <div className="mb-6">
              <h3 className="mb-3 text-lg font-semibold">Today's Signals</h3>
              {!user || !isSubscribedToAny ? (
                <div className="space-y-3">
                  <SignalCard signal={{} as Signal} locked />
                  <SignalCard signal={{} as Signal} locked />
                </div>
              ) : todaySignals.length === 0 ? (
                <p className="text-sm text-muted-foreground">No signals posted today yet.</p>
              ) : (
                <div className="space-y-3">
                  {todaySignals.map(s => <SignalCard key={s.id} signal={s} />)}
                </div>
              )}
            </div>

            {/* Past signals */}
            <div>
              <h3 className="mb-3 text-lg font-semibold">Past Signals</h3>
              {signals.length === 0 ? (
                <p className="text-sm text-muted-foreground">No past signals yet.</p>
              ) : (
                <div className="space-y-3">
                  {signals.map(s => <SignalCard key={s.id} signal={s} />)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
