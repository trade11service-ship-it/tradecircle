import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { buildMitc } from '@/lib/mitc';
import { AlertCircle, BadgeCheck, ExternalLink, FileSignature, IndianRupee, Loader2, Lock, ShieldCheck } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Group = Tables<'groups'>;

interface SubscribeFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: Group;
  advisorName: string;
  sebiRegNo?: string | null;
  onActivated?: () => void;
}

const STEPS = ['Plan', 'Identity', 'Agreement', 'Payment'] as const;

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export function SubscribeFlow({
  open,
  onOpenChange,
  group,
  advisorName,
  sebiRegNo,
  onActivated,
}: SubscribeFlowProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [pan, setPan] = useState('');
  const [dob, setDob] = useState('');
  const [onboardingId, setOnboardingId] = useState<string | null>(null);
  const [panMasked, setPanMasked] = useState('');
  const [kraStatus, setKraStatus] = useState('');

  const [acceptMitc, setAcceptMitc] = useState(false);
  const [acceptRisk, setAcceptRisk] = useState(false);

  const durationDays = Number((group as any).duration_days ?? 30);
  const price = Number(group.monthly_price ?? 0);
  const paymentMode = ((group as any).payment_mode ?? 'payment_link') as 'payment_link' | 'merchant_keys';

  const clauses = useMemo(
    () =>
      buildMitc({
        advisorName,
        sebiRegNo: sebiRegNo || 'Pending disclosure',
        groupName: group.name,
        price,
        durationDays,
      }),
    [advisorName, sebiRegNo, group.name, price, durationDays],
  );

  useEffect(() => {
    if (!open) {
      setStep(0);
      setError('');
      setBusy(false);
      setPan('');
      setDob('');
      setAcceptMitc(false);
      setAcceptRisk(false);
    }
  }, [open]);

  /* ------------------------- Step 2: KYC ------------------------- */
  const submitKyc = async () => {
    setError('');
    const value = pan.toUpperCase().trim();
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(value)) {
      setError('Enter a valid PAN in the format ABCDE1234F.');
      return;
    }
    if (!dob) {
      setError('Date of birth is required for KRA verification.');
      return;
    }
    setBusy(true);
    const { data, error: fnError } = await supabase.functions.invoke('kyc-verify', {
      body: { group_id: group.id, pan: value, dob },
    });
    setBusy(false);
    if (fnError || data?.error) {
      setError(data?.error || 'We could not verify these details. Please check and try again.');
      return;
    }
    setOnboardingId(data.onboarding_id);
    setPanMasked(data.pan_masked);
    setKraStatus(data.kra_status);
    setPan('');
    setDob('');
    setStep(2);
  };

  /* --------------------- Step 3: MITC consent -------------------- */
  const submitConsent = async () => {
    setError('');
    if (!acceptMitc || !acceptRisk) {
      setError('Both confirmations are required to execute the agreement.');
      return;
    }
    setBusy(true);
    const { data, error: fnError } = await supabase.functions.invoke('mitc-consent', {
      body: { onboarding_id: onboardingId },
    });
    setBusy(false);
    if (fnError || data?.error) {
      setError(data?.error || 'We could not record your acceptance. Please try again.');
      return;
    }
    setStep(3);
  };

  /* ----------------------- Step 4: Payment ----------------------- */
  const payViaLink = async () => {
    setError('');
    setBusy(true);
    const { data, error: fnError } = await supabase.functions.invoke('advisor-checkout', {
      body: { onboarding_id: onboardingId },
    });
    setBusy(false);
    if (fnError || data?.error || !data?.payment_url) {
      setError(data?.error || 'This analyst has not published a payment link yet. Please contact them directly.');
      return;
    }
    sessionStorage.setItem('ra_onboarding_id', String(onboardingId));
    sessionStorage.setItem('ra_onboarding_group', group.id);
    window.location.href = data.payment_url as string;
  };

  const payViaGateway = async () => {
    setError('');
    setBusy(true);
    const { data, error: fnError } = await supabase.functions.invoke('advisor-checkout', {
      body: { onboarding_id: onboardingId },
    });
    if (fnError || data?.error) {
      setBusy(false);
      setError(data?.error || 'The analyst payment gateway is unavailable right now.');
      return;
    }
    const ok = await loadRazorpay();
    if (!ok) {
      setBusy(false);
      setError('Could not load the payment window. Check your connection and retry.');
      return;
    }
    setBusy(false);

    const rzp = new (window as any).Razorpay({
      key: data.key_id,
      order_id: data.order_id,
      amount: data.amount,
      currency: data.currency,
      name: advisorName,
      description: group.name,
      handler: async (response: any) => {
        setBusy(true);
        const { data: confirm, error: confirmError } = await supabase.functions.invoke('payment-confirm', {
          body: {
            onboarding_id: onboardingId,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
          },
        });
        setBusy(false);
        if (confirmError || confirm?.error) {
          setError(confirm?.error || 'Payment received but activation failed. Contact support with your payment ID.');
          return;
        }
        toast({ title: 'Subscription active', description: `You now have access to ${group.name}.` });
        onOpenChange(false);
        onActivated?.();
      },
      modal: { ondismiss: () => setBusy(false) },
      theme: { color: '#0F172A' },
    });
    rzp.open();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (busy ? null : onOpenChange(v))}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b">
          <DialogTitle className="text-base">Subscribe to {group.name}</DialogTitle>
          <DialogDescription className="text-xs">
            {advisorName}
            {sebiRegNo ? ` • SEBI Reg. ${sebiRegNo}` : ''}
          </DialogDescription>

          <div className="flex items-center gap-1.5 pt-3">
            {STEPS.map((label, i) => (
              <div key={label} className="flex-1">
                <div className={`h-1 rounded-full ${i <= step ? 'bg-primary' : 'bg-muted'}`} />
                <p className={`mt-1 text-[10px] uppercase tracking-wide ${i === step ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                  {label}
                </p>
              </div>
            ))}
          </div>
        </DialogHeader>

        <div className="px-5 py-4 max-h-[60vh] overflow-y-auto">
          {error && (
            <div className="mb-3 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-2.5">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}

          {/* Step 1 — Plan review */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold">{group.name}</span>
                  <span className="flex items-center text-xl font-bold">
                    <IndianRupee className="h-4 w-4" />
                    {price}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {durationDays}-day research subscription • fees collected directly by the analyst
                </p>
              </div>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li className="flex gap-2"><BadgeCheck className="h-4 w-4 text-primary shrink-0" /> KRA identity check before the agreement is executed</li>
                <li className="flex gap-2"><FileSignature className="h-4 w-4 text-primary shrink-0" /> SEBI Most Important Terms &amp; Conditions, archived for 5 years</li>
                <li className="flex gap-2"><Lock className="h-4 w-4 text-primary shrink-0" /> PAN encrypted at rest and never displayed unmasked</li>
              </ul>
              <p className="rounded-md bg-muted p-3 text-[11px] leading-relaxed text-muted-foreground">
                RA Circle is a technology service provider. Your fee is paid to and received by the research analyst.
                RA Circle does not collect advisory fees and takes no commission on this transaction.
              </p>
            </div>
          )}

          {/* Step 2 — Identity */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                SEBI requires the analyst to complete KYC before onboarding you. Your PAN is sent straight to the
                verification provider and stored encrypted — the analyst only ever sees a masked value.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="pan" className="text-xs">PAN</Label>
                <Input
                  id="pan"
                  value={pan}
                  onChange={(e) => setPan(e.target.value.toUpperCase())}
                  placeholder="ABCDE1234F"
                  maxLength={10}
                  autoComplete="off"
                  className="uppercase tracking-widest"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dob" className="text-xs">Date of birth</Label>
                <Input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
              </div>
            </div>
          )}

          {/* Step 3 — Agreement */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 p-2.5">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <p className="text-xs">
                  Identity verified · PAN <span className="font-mono">{panMasked}</span> · {kraStatus}
                </p>
              </div>
              <ScrollArea className="h-52 rounded-md border p-3">
                <div className="space-y-3">
                  {clauses.map((c, i) => (
                    <div key={c.heading}>
                      <p className="text-[11px] font-semibold uppercase tracking-wide">{i + 1}. {c.heading}</p>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{c.body}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <label className="flex gap-2.5 cursor-pointer">
                <Checkbox checked={acceptMitc} onCheckedChange={(v) => setAcceptMitc(v === true)} className="mt-0.5" />
                <span className="text-[11px] leading-relaxed">
                  I have read and accept the Most Important Terms &amp; Conditions of this research subscription with {advisorName}.
                </span>
              </label>
              <label className="flex gap-2.5 cursor-pointer">
                <Checkbox checked={acceptRisk} onCheckedChange={(v) => setAcceptRisk(v === true)} className="mt-0.5" />
                <span className="text-[11px] leading-relaxed">
                  I understand securities markets carry risk, that no returns are guaranteed, and that every trading
                  decision I take is my own responsibility.
                </span>
              </label>
              <p className="text-[10px] text-muted-foreground">
                Your IP address, device details and timestamp are recorded with this acceptance for SEBI audit.
              </p>
            </div>
          )}

          {/* Step 4 — Payment */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4">
                <p className="text-xs text-muted-foreground">Amount payable to {advisorName}</p>
                <p className="mt-1 flex items-center text-2xl font-bold">
                  <IndianRupee className="h-5 w-5" />
                  {price}
                </p>
              </div>
              {paymentMode === 'merchant_keys' ? (
                <p className="text-xs text-muted-foreground">
                  You will pay through the analyst's own payment gateway. Your access is activated automatically once
                  the payment is confirmed.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  You will be redirected to the analyst's own payment page. After paying, return here and enter your
                  payment reference (UTR) to activate access instantly.
                </p>
              )}
              <p className="rounded-md bg-muted p-3 text-[11px] leading-relaxed text-muted-foreground">
                Payment is made directly to the research analyst. RA Circle never holds, routes or refunds these funds.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t px-5 py-3">
          <Button
            variant="ghost"
            size="sm"
            disabled={busy || step === 0 || step >= 2}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            Back
          </Button>

          {step === 0 && (
            <Button size="sm" onClick={() => setStep(1)}>Continue to verification</Button>
          )}
          {step === 1 && (
            <Button size="sm" onClick={submitKyc} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}Verify identity
            </Button>
          )}
          {step === 2 && (
            <Button size="sm" onClick={submitConsent} disabled={busy || !acceptMitc || !acceptRisk}>
              {busy && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}Accept &amp; continue
            </Button>
          )}
          {step === 3 && (
            <Button size="sm" onClick={paymentMode === 'merchant_keys' ? payViaGateway : payViaLink} disabled={busy}>
              {busy ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
              Pay ₹{price}
              {paymentMode === 'payment_link' && <ExternalLink className="ml-2 h-3.5 w-3.5" />}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SubscribeFlow;
