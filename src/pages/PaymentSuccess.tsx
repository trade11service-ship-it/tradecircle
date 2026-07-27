import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth';
import { CheckCircle, Loader2, ShieldCheck, XCircle } from 'lucide-react';

/**
 * Return handshake from the analyst's own payment page.
 * If the gateway sends a payment reference we activate immediately; otherwise
 * the client enters the UTR / payment reference themselves.
 */
export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [status, setStatus] = useState<'resolving' | 'need_reference' | 'confirming' | 'success' | 'error'>('resolving');
  const [errorReason, setErrorReason] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupId, setGroupId] = useState('');
  const [reference, setReference] = useState('');
  const [onboardingId, setOnboardingId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setErrorReason('Please sign in to confirm your subscription.');
      setStatus('error');
      return;
    }

    const id = searchParams.get('onboarding_id') || sessionStorage.getItem('ra_onboarding_id');
    if (!id) {
      setErrorReason('We could not match this payment to a subscription request. Please start the subscription again.');
      setStatus('error');
      return;
    }
    setOnboardingId(id);

    const txn =
      searchParams.get('razorpay_payment_id') ||
      searchParams.get('payment_id') ||
      searchParams.get('txn_id') ||
      '';

    if (txn) confirmPayment(id, txn);
    else setStatus('need_reference');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, searchParams]);

  const confirmPayment = async (id: string, txn: string) => {
    setStatus('confirming');
    setErrorReason('');
    const { data, error } = await supabase.functions.invoke('payment-confirm', {
      body: { onboarding_id: id, txn_id: txn },
    });

    if (error || data?.error) {
      setErrorReason(data?.error || 'We could not confirm this payment. Your money is safe — contact the analyst with your reference.');
      setStatus('need_reference');
      return;
    }

    sessionStorage.removeItem('ra_onboarding_id');
    sessionStorage.removeItem('ra_onboarding_group');
    setGroupName(data.group_name || '');
    setGroupId(data.group_id || '');
    setStatus('success');
  };

  return (
    <div className="min-h-full h-full flex flex-col bg-muted">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-xl border bg-background p-6 text-center">
          {(status === 'resolving' || status === 'confirming') && (
            <>
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
              <h1 className="mt-4 text-lg font-semibold">Confirming your payment</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Hold on while we verify the reference and activate your access.
              </p>
            </>
          )}

          {status === 'need_reference' && (
            <>
              <ShieldCheck className="mx-auto h-10 w-10 text-primary" />
              <h1 className="mt-4 text-lg font-semibold">Enter your payment reference</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                The analyst collected this payment directly. Enter the UTR / transaction reference from your bank or
                payment receipt to activate access.
              </p>
              {errorReason && <p className="mt-3 text-xs text-destructive">{errorReason}</p>}
              <div className="mt-4 space-y-2 text-left">
                <Label htmlFor="utr" className="text-xs">Payment reference / UTR</Label>
                <Input
                  id="utr"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="e.g. pay_QxYz123 or 402512345678"
                />
              </div>
              <Button
                className="mt-4 w-full"
                disabled={reference.trim().length < 6 || !onboardingId}
                onClick={() => confirmPayment(onboardingId!, reference.trim())}
              >
                Activate my subscription
              </Button>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Reference numbers are verified and can only be used once.
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="mx-auto h-10 w-10 text-primary" />
              <h1 className="mt-4 text-lg font-semibold">You're subscribed</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Access to {groupName || 'your research package'} is now active. A signed copy of your agreement has been
                emailed to you and archived in your account.
              </p>
              <div className="mt-5 space-y-2">
                {groupId && (
                  <Button className="w-full" onClick={() => navigate(`/group/${groupId}`)}>
                    Open the research feed
                  </Button>
                )}
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/profile">View my subscriptions</Link>
                </Button>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="mx-auto h-10 w-10 text-destructive" />
              <h1 className="mt-4 text-lg font-semibold">We hit a snag</h1>
              <p className="mt-1 text-sm text-muted-foreground">{errorReason}</p>
              <Button variant="outline" className="mt-5 w-full" asChild>
                <Link to="/discover">Back to discover</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
