import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle } from 'lucide-react';
import { useState } from 'react';

interface RejectApplicationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  advisorName: string;
  onConfirm: (reason: string) => Promise<void>;
  isLoading?: boolean;
}

export function RejectApplicationModal({
  open,
  onOpenChange,
  advisorName,
  onConfirm,
  isLoading = false,
}: RejectApplicationModalProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    
    if (!reason.trim()) {
      setError('Please provide a rejection reason');
      return;
    }

    if (reason.trim().length < 10) {
      setError('Reason should be at least 10 characters');
      return;
    }

    try {
      await onConfirm(reason);
      setReason('');
      onOpenChange(false);
    } catch (err) {
      setError((err as Error).message || 'Failed to reject application');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reject Application</DialogTitle>
          <DialogDescription>
            {advisorName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning */}
          <div className="flex gap-3 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-[12px] text-destructive">
              This will send a rejection email to the advisor. They can reapply after fixing issues.
            </p>
          </div>

          {/* Reason Input */}
          <div className="space-y-2">
            <label className="text-[13px] font-semibold text-foreground">
              Rejection Reason *
            </label>
            <Textarea
              placeholder="e.g., SEBI registration not found in database. Please provide active certificate and reapply."
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setError('');
              }}
              disabled={isLoading}
              className="min-h-[120px]"
            />
            <p className="text-[11px] text-muted-foreground">
              This reason will be sent to the advisor's email
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-[12px] text-destructive">{error}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              onOpenChange(false);
              setReason('');
              setError('');
            }}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onClick={handleSubmit}
            disabled={isLoading || !reason.trim()}
          >
            {isLoading ? 'Rejecting...' : 'Reject Application'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
