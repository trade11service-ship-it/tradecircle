import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { useAuth } from '@/lib/auth';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');

  useEffect(() => {
    const groupId = searchParams.get('group_id');
    const paymentId = searchParams.get('payment_id');
    const paymentStatus = searchParams.get('status');

    if (groupId && user && paymentStatus === 'paid') {
      createSubscription(groupId, paymentId || '');
    } else if (paymentStatus && paymentStatus !== 'paid') {
      setStatus('error');
    }
  }, [user, searchParams]);

  const createSubscription = async (groupId: string, paymentId: string) => {
    // Check if already subscribed (payment might have been processed by webhook)
    const { data: existing } = await supabase.from('subscriptions')
      .select('id')
      .eq('user_id', user!.id)
      .eq('group_id', groupId)
      .eq('status', 'active')
      .maybeSingle();

    if (existing) {
      setStatus('success');
      setTimeout(() => navigate('/dashboard'), 2000);
      return;
    }

    const { data: group } = await supabase.from('groups').select('*').eq('id', groupId).single();
    if (!group) { setStatus('error'); return; }

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    const { error } = await supabase.from('subscriptions').insert({
      user_id: user!.id,
      group_id: groupId,
      advisor_id: group.advisor_id,
      end_date: endDate.toISOString(),
      amount_paid: group.monthly_price,
      status: 'active',
      razorpay_payment_id: paymentId,
    });

    if (error) {
      console.error('Subscription error:', error);
      setStatus('error');
    } else {
      setStatus('success');
      setTimeout(() => navigate('/dashboard'), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto max-w-md px-4 py-16 text-center">
        {status === 'verifying' && (
          <>
            <div className="h-8 w-8 mx-auto animate-spin rounded-full border-4 border-primary border-t-transparent mb-4" />
            <h1 className="text-2xl font-bold">Verifying Payment...</h1>
            <p className="mt-2 text-muted-foreground">Please wait while we confirm your payment.</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="text-5xl mb-4">✅</div>
            <h1 className="text-2xl font-bold">Payment Successful!</h1>
            <p className="mt-2 text-muted-foreground">Your subscription is now active. Redirecting to dashboard...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h1 className="text-2xl font-bold">Payment Issue</h1>
            <p className="mt-2 text-muted-foreground">Something went wrong. Please contact support if money was deducted.</p>
          </>
        )}
      </div>
    </div>
  );
}
