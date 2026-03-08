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

  useEffect(() => {
    const groupId = searchParams.get('group_id');
    const paymentId = searchParams.get('payment_id');
    const paymentStatus = searchParams.get('status');
    if (groupId && user && paymentStatus === 'paid') createSubscription(groupId, paymentId || '');
    else if (paymentStatus && paymentStatus !== 'paid') setStatus('error');
  }, [user, searchParams]);

  const createSubscription = async (groupId: string, paymentId: string) => {
    const { data: existing } = await supabase.from('subscriptions').select('id').eq('user_id', user!.id).eq('group_id', groupId).eq('status', 'active').maybeSingle();
    if (existing) { setStatus('success'); setTimeout(() => navigate('/dashboard'), 2000); return; }
    const { data: group } = await supabase.from('groups').select('*').eq('id', groupId).single();
    if (!group) { setStatus('error'); return; }
    const endDate = new Date(); endDate.setDate(endDate.getDate() + 30);

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
        // Check 30-day window
        const signupDate = new Date(refSignup.signed_up_at);
        const daysSince = (Date.now() - signupDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince <= 30) {
          fromReferral = true;
          referralCode = refSignup.referral_code;
          platformFee = 15;
        }
      }
    }

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
      // Update referral stats if applicable
      if (fromReferral && referralCode) {
        try {
          await supabase.rpc('increment_referral_conversions', { _code: referralCode, _revenue: group.monthly_price });
          await supabase.from('referral_signups')
            .update({ converted_to_paid: true })
            .eq('user_id', user!.id)
            .eq('group_id', groupId);
        } catch (e) { console.error('Referral tracking:', e); }
        // Clear cookie
        document.cookie = 'referral_code=;path=/;max-age=0';
      }
      setStatus('success');
      setTimeout(() => navigate('/dashboard'), 2000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-off-white">
      <Navbar />
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="tc-card-static p-8 text-center max-w-md">
          {status === 'verifying' && (
            <>
              <div className="h-10 w-10 mx-auto animate-spin rounded-full border-4 border-primary border-t-transparent mb-4" />
              <h1 className="text-2xl font-bold">Verifying Payment...</h1>
              <p className="mt-2 text-muted-foreground">Please wait while we confirm your payment.</p>
            </>
          )}
          {status === 'success' && (
            <>
              <CheckCircle className="mx-auto h-16 w-16 text-primary mb-4" />
              <h1 className="text-2xl font-bold">Payment Successful!</h1>
              <p className="mt-2 text-muted-foreground">Your subscription is now active. Redirecting to dashboard...</p>
            </>
          )}
          {status === 'error' && (
            <>
              <XCircle className="mx-auto h-16 w-16 text-destructive mb-4" />
              <h1 className="text-2xl font-bold">Payment Issue</h1>
              <p className="mt-2 text-muted-foreground">Something went wrong. Please contact support if money was deducted.</p>
              <Link to="/"><Button className="mt-4 tc-btn-click">Go Home</Button></Link>
            </>
          )}
        </div>
      </div>
      
    </div>
  );
}
