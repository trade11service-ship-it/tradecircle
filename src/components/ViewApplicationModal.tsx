import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink, FileText, Check, X } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Advisor = Tables<'advisors'>;

interface ViewApplicationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  advisor: Advisor | null;
  onApprove: (advisor: Advisor) => Promise<void>;
  onRejectClick: (advisor: Advisor) => void;
  isApproving?: boolean;
}

export function ViewApplicationModal({
  open,
  onOpenChange,
  advisor,
  onApprove,
  onRejectClick,
  isApproving = false,
}: ViewApplicationModalProps) {
  if (!advisor) return null;

  const handleVerifySebi = () => {
    // Open SEBI verification page with INH number pre-filled
    const sebiUrl = `https://www.sebi.gov.in/sebiweb/other/OtherAction.do?doRecognisedFpi=yes&intmId=13`;
    window.open(sebiUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Advisor Application Review</DialogTitle>
          <DialogDescription>
            Review all submitted information before approving or rejecting
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Header */}
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-[16px] font-bold text-foreground">{advisor.full_name}</h3>
                <p className="text-[13px] text-muted-foreground mt-1">
                  Applied: {new Date(advisor.created_at || '').toLocaleDateString('en-IN', { 
                    day: '2-digit', 
                    month: 'short', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              <span className="inline-flex rounded-full bg-[hsl(45,100%,94%)] px-3 py-1 text-[11px] font-bold text-[hsl(35,100%,35%)]">
                ⏳ Pending Review
              </span>
            </div>
          </div>

          {/* Basic Details */}
          <div className="space-y-3">
            <h4 className="text-[14px] font-bold text-foreground">Basic Details</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted p-3">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase">Full Name</p>
                <p className="text-[14px] font-medium text-foreground mt-1">{advisor.full_name}</p>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase">Email</p>
                <p className="text-[14px] font-medium text-foreground mt-1">{advisor.email}</p>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase">Mobile</p>
                <p className="text-[14px] font-medium text-foreground mt-1">{advisor.phone || '—'}</p>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase">PAN</p>
                <p className="text-[14px] font-medium text-foreground mt-1 font-mono">{advisor.pan_no || '—'}</p>
              </div>
            </div>
          </div>

          {/* SEBI Details */}
          <div className="space-y-3">
            <h4 className="text-[14px] font-bold text-foreground">SEBI Registration Details</h4>
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase">Registration Number</p>
                  <p className="text-[16px] font-bold text-foreground mt-1 font-mono">{advisor.sebi_reg_no}</p>
                  <p className="text-[11px] text-muted-foreground mt-2">
                    Format: INH followed by 9 digits (e.g., INH000012345)
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleVerifySebi}
                  className="gap-2 shrink-0"
                >
                  <ExternalLink className="h-4 w-4" />
                  Verify on SEBI
                </Button>
              </div>
            </div>

            {/* Certificate */}
            {(advisor as any).sebi_certificate_url ? (
              <div className="rounded-lg border border-border p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-[13px] font-semibold text-foreground">SEBI Certificate Uploaded</p>
                    <p className="text-[11px] text-muted-foreground">PDF/Image file attached</p>
                  </div>
                </div>
                <a
                  href={(advisor as any).sebi_certificate_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-[12px] font-semibold"
                >
                  View
                </a>
              </div>
            ) : (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                <p className="text-[12px] text-destructive font-medium">❌ No SEBI certificate uploaded</p>
              </div>
            )}
          </div>

          {/* Experience & Speciality */}
          <div className="space-y-3">
            <h4 className="text-[14px] font-bold text-foreground">Professional Details</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted p-3">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase">Strategy Type</p>
                <p className="text-[14px] font-medium text-foreground mt-1">{advisor.strategy_type || '—'}</p>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase">Address</p>
                <p className="text-[14px] font-medium text-foreground mt-1 truncate">{advisor.address || '—'}</p>
              </div>
            </div>
          </div>

          {/* Bio */}
          {advisor.bio && (
            <div className="space-y-2">
              <h4 className="text-[14px] font-bold text-foreground">Professional Bio</h4>
              <div className="rounded-lg bg-muted p-4">
                <p className="text-[13px] text-foreground leading-relaxed whitespace-pre-wrap">{advisor.bio}</p>
              </div>
            </div>
          )}

          {/* Documents Status */}
          <div className="space-y-3">
            <h4 className="text-[14px] font-bold text-foreground">Documents & Verification</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="flex items-center gap-2">
                  {(advisor as any).sebi_certificate_url ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : (
                    <X className="h-4 w-4 text-destructive" />
                  )}
                  <p className="text-[13px] font-medium text-foreground">SEBI Certificate</p>
                </div>
                <span className={`text-[11px] font-bold ${(advisor as any).sebi_certificate_url ? 'text-primary' : 'text-destructive'}`}>
                  {(advisor as any).sebi_certificate_url ? 'Uploaded' : 'Missing'}
                </span>
              </div>
            </div>
          </div>

          {/* Compliance Note */}
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
            <p className="text-[12px] text-blue-900 font-medium">
              ℹ️ Ensure SEBI registration is active and valid before approval. This advisor will be able to post signals and accept subscribers immediately upon approval.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t border-border">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Close
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onRejectClick(advisor);
              onOpenChange(false);
            }}
            className="flex-1"
          >
            ✕ Reject
          </Button>
          <Button
            onClick={() => {
              onApprove(advisor);
              onOpenChange(false);
            }}
            disabled={isApproving}
            className="flex-1 gap-2"
          >
            {isApproving ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                Approving...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Approve
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
