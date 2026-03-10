import { Link } from 'react-router-dom';
import { Shield, Users, BarChart2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GroupCardProps {
  advisorId: string;
  advisorName: string;
  advisorPhoto: string | null;
  sebiRegNo: string;
  groupName: string;
  description: string | null;
  monthlyPrice: number;
  subCount: number;
  signalCount: number;
  winCount: number;
  resolvedCount: number;
  strategyType: string | null;
  compact?: boolean;
}

const toTitleCase = (s: string) => s.replace(/\b\w/g, c => c.toUpperCase());

export function GroupCard({
  advisorId, advisorName, advisorPhoto, sebiRegNo,
  groupName, description, monthlyPrice,
  subCount, signalCount, winCount, resolvedCount,
  strategyType, compact,
}: GroupCardProps) {
  const accuracy = resolvedCount > 0 ? Math.round((winCount / resolvedCount) * 100) : null;
  const hasHighAccuracy = accuracy !== null && accuracy >= 70 && signalCount >= 10;

  return (
    <Link to={`/advisor/${advisorId}`}>
      <div className={`group overflow-hidden rounded-2xl border-[1.5px] bg-card shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 ${
        hasHighAccuracy ? 'border-l-4 border-l-primary border-r-border border-t-border border-b-border' : 'border-border'
      }`}>
        <div className={compact ? 'p-3.5' : 'p-4'}>
          {/* Identity */}
          <div className="flex items-center gap-3 mb-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-sm font-bold text-primary-foreground overflow-hidden">
              {advisorPhoto ? (
                <img src={advisorPhoto} alt={advisorName} className="h-full w-full object-cover" />
              ) : toTitleCase(advisorName).charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-bold text-foreground text-sm truncate">{toTitleCase(advisorName)}</p>
                <Shield className="h-3 w-3 text-primary shrink-0" />
              </div>
              <p className="text-xs text-muted-foreground truncate">{groupName}</p>
            </div>
            <span className="shrink-0 text-sm font-extrabold text-primary">
              ₹{monthlyPrice.toLocaleString('en-IN')}/mo
            </span>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
            <span className="flex items-center gap-1">📊 {signalCount} signals</span>
            <span className={`flex items-center gap-1 ${accuracy !== null && accuracy >= 70 ? 'text-primary font-semibold' : ''}`}>
              ✅ {accuracy !== null ? `${accuracy}%` : 'New'}
            </span>
            <span className="flex items-center gap-1">👥 {subCount}</span>
            {strategyType && <span className="flex items-center gap-1">💰 {strategyType}</span>}
          </div>

          {/* Description */}
          {description && !compact && (
            <p className="text-[12px] text-muted-foreground line-clamp-1 mb-2">"{description}"</p>
          )}

          {!compact && (
            <Button size="sm" className="w-full rounded-lg bg-primary font-semibold text-xs h-9">
              Subscribe Now <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </Link>
  );
}
