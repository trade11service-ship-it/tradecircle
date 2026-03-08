import type { Tables } from '@/integrations/supabase/types';

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
      <div className="relative tc-card-static p-4">
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-muted/80 backdrop-blur-sm">
          <div className="text-center">
            <span className="text-2xl">🔒</span>
            <p className="mt-1 text-sm text-muted-foreground">Subscribe to see today's signals</p>
          </div>
        </div>
        <div className="blur-sm">
          <p className="font-semibold">HIDDEN SIGNAL</p>
          <p className="text-sm text-muted-foreground">Entry: ₹XXXX | Target: ₹XXXX | SL: ₹XXXX</p>
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

  if (isMessage) {
    return (
      <div className="tc-card-static p-4 overflow-hidden">
        <div className="flex-1">
          {(groupName || advisorName) && (
            <p className="mb-2 tc-small">{groupName} • {advisorName}</p>
          )}
          {signal.message_text && <p className="text-sm">{signal.message_text}</p>}
          {signal.image_url && <img src={signal.image_url} alt="Post" className="mt-2 rounded-lg max-h-64 object-cover" />}
          <p className="mt-2 tc-small">{formatDate(signal.signal_date)}</p>
          <p className="mt-2 text-[11px] italic text-muted-foreground">Past performance ≠ future results. Trade at your own risk.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tc-card-static p-4 overflow-hidden">
      <div className="flex">
        <div className={`w-1 rounded-full mr-3 self-stretch ${isBuy ? 'bg-primary' : 'bg-destructive'}`} />
        <div className="flex-1">
          {(groupName || advisorName) && (
            <p className="mb-2 tc-small">{groupName} • {advisorName}</p>
          )}
          <div className="flex items-center justify-between">
            <p className="tc-card-title">{signal.instrument}</p>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${isBuy ? 'bg-[hsl(var(--light-green))] text-primary' : 'bg-[hsl(0,100%,95%)] text-destructive'}`}>
              {signal.signal_type}
            </span>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
            <div><span className="text-muted-foreground">Entry:</span> <span className="tc-amount">₹{signal.entry_price}</span></div>
            <div><span className="text-muted-foreground">Target:</span> <span className="tc-amount">₹{signal.target_price}</span></div>
            <div><span className="text-muted-foreground">SL:</span> <span className="font-bold text-destructive">₹{signal.stop_loss}</span></div>
          </div>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <span className="tc-badge-strategy">{signal.timeframe}</span>
            <span className={
              signal.result === 'WIN' ? 'tc-badge-active' :
              signal.result === 'LOSS' ? 'tc-badge-rejected' :
              'tc-badge-pending'
            }>
              {signal.result}
            </span>
            <span className="ml-auto tc-small">{formatDate(signal.signal_date)}</span>
          </div>
          {signal.notes && <p className="mt-2 tc-small">{signal.notes}</p>}
          <p className="mt-2 text-[11px] italic text-muted-foreground">Past performance ≠ future results. Trade at your own risk.</p>
        </div>
      </div>
    </div>
  );
}
