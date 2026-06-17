import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { CheckCircle, XCircle } from 'lucide-react';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorReason, setErrorReason] = useState<string>('');
  const [groupName, setGroupName] = useState('');
  const [advisorName, setAdvisorName] = useState('');

  useEffect(() => {
    if (authLoading) return; // wait for auth to resolve before deciding

    const groupId = searchParams.get('group_id');
    // Razorpay payment_link callback returns these params after redirect:
    //  razorpay_payment_id, razorpay_payment_link_id, razorpay_payment_link_reference_id,
    //  razorpay_payment_link_status, razorpay_signature
    // Our edge function ALSO appends status=paid to the callback URL.
    const paymentId = searchParams.get('razorpay_payment_id') || searchParams.get('payment_id') || '';
    const linkStatus = searchParams.get('razorpay_payment_link_status');
    const ourStatus = searchParams.get('status');
    const isPaid = linkStatus === 'paid' || ourStatus === 'paid';

    if (!groupId) { setErrorReason('Missing group reference.'); setStatus('error'); return; }
    if (!user) { setErrorReason('Please sign in to confirm your subscription.'); setStatus('error'); return; }
    if (!isPaid) {
      setErrorReason(linkStatus === 'expired' ? 'This payment link has expired.' : 'Payment was not completed.');
      setStatus('error');
      return;
    }
    if (!paymentId) {
      setErrorReason('We could not find a payment reference. If money was deducted, contact support with the time of payment.');
      setStatus('error');
      return;
    }
    createSubscription(groupId, paymentId);
  }, [user, authLoading, searchParams]);

  const createSubscription = async (groupId: string, paymentId: string) => {
    const isSandbox = paymentId.startsWith('sandbox_') || searchParams.get('sandbox') === '1';
    const panNumber = sessionStorage.getItem('subscription_pan');
    const consentGiven = sessionStorage.getItem('subscription_consent') === 'true';
    const consentTimestamp = sessionStorage.getItem('subscription_consent_timestamp');

    // Sandbox: ask the server (service role) to materialize the subscription.
    if (isSandbox) {
      try {
        await supabase.functions.invoke('sandbox-confirm-subscription', {
          body: {
            group_id: groupId,
            payment_id: paymentId,
            pan_number: panNumber,
            consent_given: consentGiven,
            consent_timestamp: consentTimestamp,
          },
        });
      } catch (e) {
        console.error('Sandbox confirm failed', e);
      }
    }

    // Poll up to 10s for the subscription row (created by webhook or sandbox fn).
    for (let i = 0; i < 10; i++) {
      const { data: existingByPayment } = await supabase
        .from('subscriptions')
        .select('id, group_id, groups(name, advisors(full_name))')
        .eq('razorpay_payment_id', paymentId)
        .maybeSingle();

      if (existingByPayment) {
        const group = existingByPayment.groups as any;
        setGroupName(group?.name || '');
        setAdvisorName(group?.advisors?.full_name || '');
        setStatus('success');
        return;
      }
      await new Promise(r => setTimeout(r, 1000));
    }

    // Fallback: maybe user already had an active sub for this group
    const now = new Date().toISOString();
    const { data: existing } = await supabase.from('subscriptions')
      .select('id, groups(name, advisors(full_name))')
      .eq('user_id', user!.id)
      .eq('group_id', groupId)
      .eq('status', 'active')
      .gte('end_date', now)
      .maybeSingle();

    if (existing) {
      const group = (existing as any).groups;
      setGroupName(group?.name || '');
      setAdvisorName(group?.advisors?.full_name || '');
      setStatus('success');
      return;
    }

    // Persist PAN acceptance regardless (legal compliance)
    if (panNumber && consentGiven) {
      await supabase.from('user_legal_acceptances').insert({
        user_id: user!.id,
        acceptance_type: 'subscription_pan',
        checkbox_text: `PAN: ${panNumber} — Subscription consent for group ${groupId}`,
        accepted: true,
        full_name: null,
        email: user!.email || null,
        page_url: window.location.href,
        user_agent: navigator.userAgent,
        device_info: navigator.platform,
      }).then(() => {});
    }

    setErrorReason('Your payment is being processed. If this persists, contact support — your payment is safe.');
      setStatus('error');
    }
    else {
      // Clear subscription data from sessionStorage
      sessionStorage.removeItem('subscription_pan');
      sessionStorage.removeItem('subscription_consent');
      sessionStorage.removeItem('subscription_consent_timestamp');
      
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
    <div className="min-h-full h-full flex flex-col bg-muted">
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
                <Link to="/home" className="flex-1">
                  <Button className="w-full rounded-xl bg-primary font-bold">Go to Feed</Button>
                </Link>
                <Link to="/subscriptions" className="flex-1">
                  <Button variant="outline" className="w-full rounded-xl font-bold">My Subscriptions</Button>
                </Link>
              </div>
            </>
          )}
          {status === 'error' && (
            <>
              <XCircle className="mx-auto h-16 w-16 text-destructive mb-4" />
              <h1 className="text-2xl font-bold text-foreground">Payment Not Confirmed</h1>
              <p className="mt-2 text-[14px] text-muted-foreground">{errorReason || 'We could not verify your payment.'}</p>
              <div className="mt-4 rounded-xl bg-muted/50 border border-border p-3 text-left">
                <p className="text-[12px] text-foreground font-semibold mb-1">What to do next</p>
                <ul className="text-[12px] text-muted-foreground space-y-1 list-disc pl-4">
                  <li>If money was deducted, it will auto-refund within 5–7 working days.</li>
                  <li>Check your bank/UPI app for the payment status before retrying.</li>
                  <li>Email <strong className="text-foreground">support@tradecircle.in</strong> with your payment reference.</li>
                </ul>
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => navigate(-1)}>Try Again</Button>
                <Link to="/discover" className="flex-1"><Button className="w-full rounded-xl">Browse Advisors</Button></Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
