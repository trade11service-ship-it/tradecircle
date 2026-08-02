import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ShieldCheck, Lock, AlertTriangle } from 'lucide-react';

interface Props {
  advisor: any;
  onVerified: () => void;
}

export function AdvisorKycTab({ advisor, onVerified }: Props) {
  const [form, setForm] = useState({
    full_legal_name: advisor?.full_name || '',
    pan: '',
    bank_account_number: '',
    bank_ifsc: '',
    bank_account_holder_name: advisor?.full_name || '',
  });
  const [submitting, setSubmitting] = useState(false);
  const status = advisor?.kyc_status || 'unverified';

  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.full_legal_name || !form.pan || !form.bank_account_number || !form.bank_ifsc || !form.bank_account_holder_name) {
      toast.error('All fields are required for verification.');
      return;
    }
    setSubmitting(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/advisor-kyc-verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.session?.access_token}`,
        },
        body: JSON.stringify(form),
      });
      const out = await res.json();
      if (!res.ok) throw new Error(out.error || 'Verification failed');
      toast.success('Verified! Group creation is now unlocked.');
      onVerified();
    } catch (e: any) {
      toast.error(e.message || 'Verification failed');
    }
    setSubmitting(false);
  };

  if (status === 'approved') {
    return (
      <div className="rounded-2xl border-[1.5px] border-border bg-card p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-emerald-600" />
          <div>
            <p className="text-[15px] font-bold text-foreground">Identity & bank verified</p>
            <p className="text-[13px] text-muted-foreground">
              PAN {advisor.pan_masked || 'XXXXX••••'} · Account ••••{String(advisor.bank_ifsc || '').slice(-4)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border-[1.5px] border-border bg-card p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] space-y-4">
        <div className="flex items-start gap-3">
          <Lock className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div>
            <h3 className="text-[16px] font-bold text-foreground">Complete PAN & Bank Verification</h3>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              Your SEBI registration has been verified manually by our compliance team. One last step unlocks group creation and payouts.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-[12px] leading-relaxed text-slate-700">
          <strong className="text-slate-900">Why we need this:</strong> Verified for identity match, SEBI compliance, and payout
          processing via Digio. Retained as encrypted data. We never display or share your full PAN or account number.
        </div>

        {status === 'rejected' && advisor?.kyc_rejection_reason && (
          <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-[12px] text-destructive">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{advisor.kyc_rejection_reason}</span>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--small-text))]">Full Legal Name (as on PAN)</Label>
            <Input className="mt-1.5" value={form.full_legal_name} onChange={e => update('full_legal_name', e.target.value)} />
          </div>
          <div>
            <Label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--small-text))]">PAN Number</Label>
            <Input className="mt-1.5" maxLength={10} placeholder="ABCDE1234F" value={form.pan} onChange={e => update('pan', e.target.value.toUpperCase())} />
          </div>
          <div>
            <Label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--small-text))]">IFSC Code</Label>
            <Input className="mt-1.5" maxLength={11} placeholder="HDFC0001234" value={form.bank_ifsc} onChange={e => update('bank_ifsc', e.target.value.toUpperCase())} />
          </div>
          <div>
            <Label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--small-text))]">Bank Account Number</Label>
            <Input className="mt-1.5" inputMode="numeric" value={form.bank_account_number} onChange={e => update('bank_account_number', e.target.value.replace(/\D/g, ''))} />
          </div>
          <div>
            <Label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--small-text))]">Account Holder Name</Label>
            <Input className="mt-1.5" value={form.bank_account_holder_name} onChange={e => update('bank_account_holder_name', e.target.value)} />
          </div>
        </div>

        <Button onClick={submit} disabled={submitting} className="font-semibold">
          {submitting ? 'Verifying…' : 'Verify & Unlock Dashboard'}
        </Button>
      </div>
    </div>
  );
}
