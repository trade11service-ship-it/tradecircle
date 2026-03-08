import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { useAuth } from '@/lib/auth';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [done, setDone] = useState(false);

  useEffect(() => {
    const groupId = searchParams.get('group_id');
    if (groupId && user && !done) {
      createSubscription(groupId);
    }
  }, [user]);

  const createSubscription = async (groupId: string) => {
    const { data: group } = await supabase.from('groups').select('*').eq('id', groupId).single();
    if (!group) return;

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    await supabase.from('subscriptions').insert({
      user_id: user!.id,
      group_id: groupId,
      advisor_id: group.advisor_id,
      end_date: endDate.toISOString(),
      amount_paid: group.monthly_price,
      status: 'active',
      razorpay_payment_id: searchParams.get('payment_id') || 'placeholder',
    });

    setDone(true);
    setTimeout(() => navigate('/dashboard'), 3000);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto max-w-md px-4 py-16 text-center">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-2xl font-bold">Payment Successful!</h1>
        <p className="mt-2 text-muted-foreground">Your subscription is now active. Redirecting to dashboard...</p>
      </div>
    </div>
  );
}
