import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Group = Tables<'groups'>;
type Advisor = Tables<'advisors'>;

interface SubscriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: Group & { advisor?: Advisor };
  advisorName: string;
  onConfirm: (panNumber: string) => Promise<void>;
  isLoading?: boolean;
}

export function SubscriptionModal({
  open,
  onOpenChange,
  group,
  advisorName,
  onConfirm,
  isLoading = false,
}: SubscriptionModalProps) {
  const [panNumber, setPanNumber] = useState('');
  const [consented, setConsented] = useState(false);
  const [error, setError] = useState('');

  const validatePAN = (pan: string): boolean => {
    // PAN format: ABCDE1234F (5 letters, 4 numbers, 1 letter)
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(pan.toUpperCase());
  };

  const handleSubmit = async () => {
    setError('');

    // Validate PAN
    if (!panNumber.trim()) {
      setError('PAN number is required');
      return;
    }

    if (!validatePAN(panNumber)) {
      setError('Invalid PAN format. Expected: ABCDE1234F');
      return;
    }

    // Check consent
    if (!consented) {
      setError('You must agree to the terms to subscribe');
      return;
    }

    try {
      await onConfirm(panNumber.toUpperCase());
      // Modal will be closed by parent if successful
    } catch (err) {
      setError((err as Error).message || 'Failed to process subscription');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Subscribe to {group.name}</DialogTitle>
          <DialogDescription>
            by {advisorName} • ₹{group.monthly_price}/month
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* What You Get */}
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 space-y-2">
            <p className="text-[12px] font-semibold text-foreground">✓ What you'll get:</p>
            <ul className="text-[12px] text-muted-foreground space-y-1">
              <li>✓ Trading signals (Entry/Target/SL)</li>
              <li>✓ Market analysis & commentary</li>
              <li>✓ Instant Telegram notifications</li>
              <li>✓ Cancel anytime, no hidden charges</li>
            </ul>
          </div>

          {/* PAN Number Input */}
          <div className="space-y-2">
            <Label htmlFor="pan" className="text-[13px] font-semibold">
              PAN Number *
            </Label>
            <Input
              id="pan"
              placeholder="ABCDE1234F"
              value={panNumber}
              onChange={(e) => {
                setPanNumber(e.target.value.toUpperCase());
                setError('');
              }}
              maxLength={10}
              className="text-[14px] tracking-widest font-mono"
              disabled={isLoading}
            />
            <p className="text-[11px] text-muted-foreground">
              Required for SEBI compliance. Format: ABCDE1234F
            </p>
          </div>

          {/* Consent Checkbox */}
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <Checkbox
                id="consent"
                checked={consented}
                onCheckedChange={setConsented}
                disabled={isLoading}
                className="mt-1"
              />
              <Label htmlFor="consent" className="text-[12px] leading-relaxed pt-0.5 cursor-pointer font-normal">
                I understand this is a research/signal service only. <strong>NOT personalized investment advice.</strong> I subscribe voluntarily and understand market risks.
              </Label>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex gap-2 rounded-lg bg-destructive/10 border border-destructive/30 p-3">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-[12px] text-destructive">{error}</p>
            </div>
          )}

          {/* Razorpay Trust Badge */}
          <p className="text-[11px] text-muted-foreground text-center">
            💳 Secure payment powered by Razorpay
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleSubmit}
            disabled={isLoading || !panNumber.trim() || !consented}
          >
            {isLoading ? 'Processing...' : `Pay ₹${group.monthly_price}`}
          </Button>
        </div>

        {/* SEBI Disclaimer */}
        <p className="text-[10px] text-muted-foreground text-center border-t border-border pt-3">
          TradeCircle is a technology platform. All advisors are independently SEBI registered. Not responsible for trading losses.
        </p>
      </DialogContent>
    </Dialog>
  );
}
