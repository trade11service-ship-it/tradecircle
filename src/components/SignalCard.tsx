import type { Tables } from '@/integrations/supabase/types';
import { Lock } from 'lucide-react';

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
      <div className="relative overflow-hidden rounded-xl border-[1.5px] border-border bg-card">
        <div className="pointer-events-none blur-[6px] p-4">
          <p className="font-semibold text-foreground">HIDDEN SIGNAL</p>
          <p className="text-sm text-muted-foreground">Entry: ₹XXXX | Target: ₹XXXX | SL: ₹XXXX</p>
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/85 backdrop-blur-[2px]">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-border bg-muted">
            <Lock className="h-[22px] w-[22px] text-primary" />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Subscribe to see today's signals</p>
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

  // Result bar color
  const barColor =
    signal.result === 'WIN' ? 'bg-primary' :
    signal.result === 'LOSS' ? 'bg-[hsl(var(--small-text))]' :
    'bg-[hsl(var(--warning))]';

  // Result badge
  const resultBadge = signal.result === 'WIN'
    ? { bg: 'bg-light-green', text: 'text-primary', label: '✓ WIN' }
    : signal.result === 'LOSS'
    ? { bg: 'bg-muted', text: 'text-[hsl(var(--small-text))]', label: '✗ Loss' }
    : { bg: 'bg-[hsl(45,100%,94%)]', text: 'text-[hsl(25,100%,40%)]', label: '⏳ Open' };

  if (isMessage) {
    return (
      <div className="overflow-hidden rounded-xl border-[1.5px] border-border bg-card p-4">
        {(groupName || advisorName) && (
          <p className="mb-2 text-[11px] text-[hsl(var(--small-text))]">{groupName} • {advisorName}</p>
        )}
        {signal.message_text && <p className="text-sm text-foreground">{signal.message_text}</p>}
        {signal.image_url && <img src={signal.image_url} alt="Post" className="mt-2 rounded-lg max-h-64 object-cover" />}
        <p className="mt-2 text-[11px] text-[hsl(var(--small-text))]">{formatDate(signal.signal_date)}</p>
        <p className="mt-2 text-[11px] italic text-muted-foreground">Past performance ≠ future results. Trade at your own risk.</p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl border-[1.5px] border-border bg-card p-4 pl-[18px]">
      {/* Left color bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${barColor}`} />

      {(groupName || advisorName) && (
        <p className="mb-2 text-[11px] text-[hsl(var(--small-text))]">{groupName} • {advisorName}</p>
      )}

      {/* Instrument + Type */}
      <div className="flex items-center justify-between">
        <p className="text-[15px] font-bold text-foreground">{signal.instrument}</p>
        <span className={`rounded px-2 py-0.5 text-[11px] font-bold ${
          isBuy
            ? 'bg-light-green text-primary'
            : 'bg-[hsl(45,100%,94%)] text-[hsl(25,100%,40%)]'
        }`}>
          {signal.signal_type}
        </span>
      </div>

      {/* Entry / Target / SL */}
      <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
        <span>Entry ₹{signal.entry_price}</span>
        <span>Target ₹{signal.target_price}</span>
        <span>SL ₹{signal.stop_loss}</span>
      </div>

      {/* Result + Date */}
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[11px] text-[hsl(var(--small-text))]">{formatDate(signal.signal_date)}</span>
        {signal.result && (
          <span className={`rounded px-2 py-0.5 text-[11px] font-bold ${resultBadge.bg} ${resultBadge.text}`}>
            {resultBadge.label}
          </span>
        )}
      </div>

      {signal.notes && <p className="mt-2 text-[11px] text-[hsl(var(--small-text))]">{signal.notes}</p>}
      <p className="mt-2 text-[11px] italic text-muted-foreground">Past performance ≠ future results. Trade at your own risk.</p>
    </div>
  );
}
