import type { Tables } from '@/integrations/supabase/types';
import { Lock, CheckCheck } from 'lucide-react';

type Signal = Tables<'signals'>;

interface SignalCardProps {
  signal: Signal;
  groupName?: string;
  advisorName?: string;
  locked?: boolean;
}

export function SignalCard({ signal, groupName, advisorName, locked }: SignalCardProps) {
  if (locked) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
        <div className="pointer-events-none blur-[6px] p-5">
          <p className="tc-caption text-muted-foreground">Hidden Signal</p>
          <p className="mt-2 font-mono text-sm text-foreground">Entry ₹XXXX · Target ₹XXXX · SL ₹XXXX</p>
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/90 backdrop-blur-md">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-muted">
            <Lock className="h-5 w-5 text-secondary" />
          </div>
          <p className="mt-2 text-sm font-semibold text-foreground">Subscribe to unlock today's signals</p>
        </div>
      </div>
    );
  }

  const formatDate = (date: string | null) => {
    if (!date) return '';
    const d = new Date(date);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  };

  const isBuy = signal.signal_type === 'BUY';
  const isMessage = signal.post_type === 'message';

  // Institutional left-border audit color
  const barColor =
    signal.result === 'WIN' ? 'bg-secondary' :
    signal.result === 'LOSS' ? 'bg-destructive' :
    isBuy ? 'bg-secondary' : 'bg-destructive';

  const resultBadge = signal.result === 'WIN'
    ? { cls: 'bg-secondary/10 text-secondary border-secondary/30', label: 'TARGET HIT' }
    : signal.result === 'LOSS'
    ? { cls: 'bg-destructive/10 text-destructive border-destructive/30', label: 'SL HIT' }
    : { cls: 'bg-muted text-muted-foreground border-border', label: 'OPEN' };

  if (isMessage) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 pl-6">
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary" />
        {(groupName || advisorName) && (
          <p className="tc-caption text-muted-foreground mb-2">{groupName} · {advisorName}</p>
        )}
        {signal.message_text && <p className="text-sm text-foreground leading-relaxed">{signal.message_text}</p>}
        {signal.image_url && <img src={signal.image_url} alt="Post" className="mt-3 rounded-xl max-h-64 object-cover" />}
        <p className="mt-3 font-mono text-[11px] text-muted-foreground">{formatDate(signal.signal_date)}</p>
      </div>
    );
  }

  const isLocked = signal.result === 'WIN' || signal.result === 'LOSS';

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 pl-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-shadow hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
      {/* 6px audit bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${barColor}`} />

      {(groupName || advisorName) && (
        <p className="tc-caption text-muted-foreground mb-2">{groupName} · {advisorName}</p>
      )}

      {/* Instrument + Type */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-[17px] font-black tracking-tight text-foreground">{signal.instrument}</p>
        <span className={`rounded-md px-2 py-0.5 text-[11px] font-extrabold tracking-wider ${
          isBuy
            ? 'bg-secondary/10 text-secondary'
            : 'bg-destructive/10 text-destructive'
        }`}>
          {signal.signal_type}
        </span>
      </div>

      {/* Entry / Target / SL — terminal readout */}
      <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg border border-border bg-muted/40 p-2.5">
        <div>
          <p className="tc-caption text-muted-foreground">Entry</p>
          <p className="font-mono text-sm font-bold text-foreground">₹{signal.entry_price}</p>
        </div>
        <div>
          <p className="tc-caption text-secondary">Target</p>
          <p className="font-mono text-sm font-bold text-foreground">₹{signal.target_price}</p>
        </div>
        <div>
          <p className="tc-caption text-destructive">Stop</p>
          <p className="font-mono text-sm font-bold text-foreground">₹{signal.stop_loss}</p>
        </div>
      </div>

      {/* Result + Date */}
      <div className="mt-3 flex items-center justify-between">
        <span className="font-mono text-[11px] text-muted-foreground">{formatDate(signal.signal_date)}</span>
        <div className="flex items-center gap-2">
          {isLocked && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-secondary">
              <CheckCheck className="h-3 w-3" /> Verified
            </span>
          )}
          {signal.result && (
            <span className={`rounded-md border px-2 py-0.5 text-[10px] font-extrabold tracking-wider ${resultBadge.cls}`}>
              {resultBadge.label}
            </span>
          )}
        </div>
      </div>

      {signal.notes && <p className="mt-2 text-[12px] text-muted-foreground leading-relaxed">{signal.notes}</p>}
    </div>
  );
}
