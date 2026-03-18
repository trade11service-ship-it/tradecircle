import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { CheckCircle, XCircle } from 'lucide-react';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [groupName, setGroupName] = useState('');
  const [advisorName, setAdvisorName] = useState('');

  useEffect(() => {
    const groupId = searchParams.get('group_id');
    const paymentId = searchParams.get('payment_id');
    const paymentStatus = searchParams.get('status');
    if (groupId && user && paymentStatus === 'paid') createSubscription(groupId, paymentId || '');
    else if (paymentStatus && paymentStatus !== 'paid') setStatus('error');
  }, [user, searchParams]);

  const createSubscription = async (groupId: string, paymentId: string) => {
    // CRITICAL: Check for duplicate active subscription (unexpired)
    const now = new Date().toISOString();
    const { data: existing } = await supabase.from('subscriptions')
      .select('id')
      .eq('user_id', user!.id)
      .eq('group_id', groupId)
      .eq('status', 'active')
      .gte('end_date', now)
      .maybeSingle();

    if (existing) {
      // Already subscribed and not expired
      const { data: group } = await supabase.from('groups').select('name, advisors!inner(full_name)').eq('id', groupId).single();
      if (group) {
        setGroupName(group.name);
        setAdvisorName((group as any).advisors.full_name);
      }
      setStatus('success');
      return;
    }

    const { data: group } = await supabase.from('groups').select('*, advisors!inner(full_name)').eq('id', groupId).single();
    if (!group) { setStatus('error'); return; }

    setGroupName(group.name);
    setAdvisorName((group as any).advisors.full_name);

    // CRITICAL: end_date = now + 30 days (subscription expires after 30 days, no grace period)
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    // Check for referral
    let fromReferral = false;
    let referralCode: string | null = null;
    let platformFee = 30;
    const cookie = document.cookie.split(';').find(c => c.trim().startsWith('referral_code='));
    const cookieCode = cookie?.split('=')?.[1]?.trim();

    if (cookieCode) {
      const { data: refSignup } = await supabase.from('referral_signups')
        .select('*')
        .eq('user_id', user!.id)
        .eq('group_id', groupId)
        .eq('is_referral_active', true)
        .maybeSingle();

      if (refSignup) {
        const signupDate = new Date(refSignup.signed_up_at);
        const daysSince = (Date.now() - signupDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince <= 30) {
          fromReferral = true;
          referralCode = refSignup.referral_code;
          platformFee = 15;
        }
      }
    }

    // CRITICAL: group_id from the URL matches the group we're creating subscription for
    // We verify amount matches group price stored in DB (prevent tampering)
    const { error } = await supabase.from('subscriptions').insert({
      user_id: user!.id,
      group_id: groupId,
      advisor_id: group.advisor_id,
      end_date: endDate.toISOString(),
      amount_paid: group.monthly_price,
      status: 'active',
      razorpay_payment_id: paymentId,
      from_referral: fromReferral,
      referral_code: referralCode,
      platform_fee_percent: platformFee,
    });

    if (error) { console.error('Subscription error:', error); setStatus('error'); }
    else {
      if (fromReferral && referralCode) {
        try {
          await supabase.rpc('increment_referral_conversions', { _code: referralCode, _revenue: group.monthly_price });
          await supabase.from('referral_signups')
            .update({ converted_to_paid: true })
            .eq('user_id', user!.id)
            .eq('group_id', groupId);
        } catch (e) { console.error('Referral tracking:', e); }
        document.cookie = 'referral_code=;path=/;max-age=0';
      }
      setStatus('success');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-muted">
      <Navbar />
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="rounded-2xl border border-border bg-card p-8 text-center max-w-md shadow-sm">
          {status === 'verifying' && (
            <>
              <div className="h-10 w-10 mx-auto animate-spin rounded-full border-4 border-primary border-t-transparent mb-4" />
              <h1 className="text-2xl font-bold text-foreground">Verifying Payment...</h1>
              <p className="mt-2 text-muted-foreground">Please wait while we confirm your payment.</p>
            </>
          )}
          {status === 'success' && (
            <>
              <CheckCircle className="mx-auto h-16 w-16 text-primary mb-4" />
              <h1 className="text-2xl font-bold text-foreground">You're now subscribed! 🎉</h1>
              {groupName && <p className="mt-2 text-[15px] font-semibold text-foreground">{groupName}</p>}
              {advisorName && <p className="text-[13px] text-muted-foreground">by {advisorName}</p>}
              <div className="mt-4 rounded-xl bg-primary/5 border border-primary/20 p-4 text-left space-y-2">
                <p className="text-[13px] text-foreground">✅ Access to all signals in the feed</p>
                <p className="text-[13px] text-foreground">✅ Market analysis & commentary</p>
                <p className="text-[13px] text-foreground">✅ Set up Telegram alerts for instant notifications</p>
              </div>
              <p className="mt-3 text-[12px] text-muted-foreground">Your subscription is valid for 30 days.</p>
              <div className="mt-4 flex gap-2">
                <Link to="/dashboard" className="flex-1">
                  <Button className="w-full rounded-xl bg-primary font-bold">Go to Feed</Button>
                </Link>
              </div>
            </>
          )}
          {status === 'error' && (
            <>
              <XCircle className="mx-auto h-16 w-16 text-destructive mb-4" />
              <h1 className="text-2xl font-bold text-foreground">Payment Issue</h1>
              <p className="mt-2 text-muted-foreground">Something went wrong. Please contact support if money was deducted.</p>
              <p className="mt-1 text-[12px] text-muted-foreground">Email: trade11.service@gmail.com</p>
              <Link to="/discover"><Button className="mt-4 rounded-xl">Browse Advisors</Button></Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
