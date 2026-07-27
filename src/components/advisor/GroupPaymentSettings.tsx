import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { CreditCard, KeyRound, Link2, Loader2, ShieldCheck } from 'lucide-react';

/**
 * How this analyst collects subscription fees.
 * RA Circle never routes the money — it only stores the destination.
 */
export function GroupPaymentSettings({ groupId }: { groupId: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<'payment_link' | 'merchant_keys'>('payment_link');
  const [url, setUrl] = useState('');
  const [keyId, setKeyId] = useState('');
  const [keySecret, setKeySecret] = useState('');
  const [hasSecret, setHasSecret] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data } = await supabase.functions.invoke('advisor-payment-settings', {
        body: { group_id: groupId, action: 'get' },
      });
      if (!active) return;
      if (data && !data.error) {
        setMode(data.payment_mode === 'merchant_keys' ? 'merchant_keys' : 'payment_link');
        setUrl(data.advisor_payment_url || '');
        setKeyId(data.advisor_merchant_key_id || '');
        setHasSecret(Boolean(data.has_secret));
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [groupId]);

  const save = async () => {
    setSaving(true);
    const { data, error } = await supabase.functions.invoke('advisor-payment-settings', {
      body: {
        group_id: groupId,
        payment_mode: mode,
        advisor_payment_url: url.trim(),
        advisor_merchant_key_id: keyId.trim(),
        advisor_merchant_key_secret: keySecret.trim(),
      },
    });
    setSaving(false);
    if (error || data?.error) {
      toast.error(data?.error || 'Could not save payment settings');
      return;
    }
    if (keySecret.trim()) setHasSecret(true);
    setKeySecret('');
    toast.success('Payment settings saved');
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border p-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading payment settings…
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-border p-4">
      <div className="flex items-start gap-2">
        <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Subscribers pay you directly. RA Circle never holds, routes or refunds these funds — it only records the
          payment reference against the signed agreement.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setMode('payment_link')}
          className={`rounded-lg border p-3 text-left transition ${mode === 'payment_link' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted'}`}
        >
          <Link2 className="h-4 w-4 text-primary" />
          <p className="mt-1.5 text-[13px] font-semibold">Payment link</p>
          <p className="text-[11px] text-muted-foreground">Your own hosted checkout URL</p>
        </button>
        <button
          type="button"
          onClick={() => setMode('merchant_keys')}
          className={`rounded-lg border p-3 text-left transition ${mode === 'merchant_keys' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted'}`}
        >
          <CreditCard className="h-4 w-4 text-primary" />
          <p className="mt-1.5 text-[13px] font-semibold">Merchant API</p>
          <p className="text-[11px] text-muted-foreground">In-app checkout with your keys</p>
        </button>
      </div>

      {mode === 'payment_link' ? (
        <div>
          <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Payment URL</Label>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://rzp.io/l/your-plan"
            className="mt-1.5"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Subscribers are sent here after signing the agreement, then return to enter their payment reference.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Key ID</Label>
            <Input value={keyId} onChange={(e) => setKeyId(e.target.value)} placeholder="rzp_live_xxxxxxxx" className="mt-1.5" />
          </div>
          <div>
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Key secret {hasSecret && <span className="ml-1 font-normal normal-case">(saved — leave blank to keep)</span>}
            </Label>
            <Input
              type="password"
              value={keySecret}
              onChange={(e) => setKeySecret(e.target.value)}
              placeholder={hasSecret ? '••••••••••••' : 'Your gateway key secret'}
              autoComplete="new-password"
              className="mt-1.5"
            />
          </div>
          <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
            <KeyRound className="mt-0.5 h-3 w-3 shrink-0" />
            Your secret is encrypted before storage and is never sent back to any browser.
          </p>
        </div>
      )}

      <Button size="sm" onClick={save} disabled={saving}>
        {saving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}Save payment settings
      </Button>
    </div>
  );
}

export default GroupPaymentSettings;
