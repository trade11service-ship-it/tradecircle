import { Badge } from '@/components/ui/badge';
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
      <div className="relative rounded-lg border bg-card p-4">
        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-muted/80 backdrop-blur-sm">
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

  return (
    <div className="rounded-lg border bg-card p-4">
      {(groupName || advisorName) && (
        <p className="mb-2 text-xs text-muted-foreground">{groupName} • {advisorName}</p>
      )}
      <div className="flex items-center justify-between">
        <p className="font-semibold">{signal.instrument}</p>
        <Badge className={signal.signal_type === 'BUY' ? 'bg-primary text-primary-foreground' : 'bg-destructive text-destructive-foreground'}>
          {signal.signal_type}
        </Badge>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
        <div><span className="text-muted-foreground">Entry:</span> ₹{signal.entry_price}</div>
        <div><span className="text-muted-foreground">Target:</span> ₹{signal.target_price}</div>
        <div><span className="text-muted-foreground">SL:</span> ₹{signal.stop_loss}</div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Badge variant="outline">{signal.timeframe}</Badge>
        <Badge variant={signal.result === 'WIN' ? 'default' : signal.result === 'LOSS' ? 'destructive' : 'secondary'}>
          {signal.result}
        </Badge>
        <span className="ml-auto text-xs text-muted-foreground">{formatDate(signal.signal_date)}</span>
      </div>
      {signal.notes && <p className="mt-2 text-sm text-muted-foreground">{signal.notes}</p>}
    </div>
  );
}
