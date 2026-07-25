import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

interface GroupCardProps {
  groupId: string;
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
  groupId, advisorName, advisorPhoto, sebiRegNo,
  groupName, description, monthlyPrice,
  subCount, signalCount, winCount, resolvedCount,
  strategyType, compact,
}: GroupCardProps) {
  const accuracy = resolvedCount > 0 ? Math.round((winCount / resolvedCount) * 100) : null;

  return (
    <Link to={`/group/${groupId}`} className="block group">
      <div className="rounded-xl border border-border bg-card p-6 transition-colors duration-150 group-hover:border-slate-300">
        {/* Header row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 text-sm font-semibold overflow-hidden">
              {advisorPhoto ? (
                <img src={advisorPhoto} alt={advisorName} className="h-full w-full object-cover" />
              ) : toTitleCase(advisorName).charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold text-foreground truncate">
                {toTitleCase(advisorName)}
              </p>
              <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald/10 px-2 py-0.5 text-[11px] font-semibold text-emerald max-w-full">
                <ShieldCheck className="h-3 w-3 shrink-0" />
                <span className="truncate">SEBI {sebiRegNo}</span>
              </div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[16px] font-bold text-foreground tabular-nums">
              ₹{monthlyPrice.toLocaleString('en-IN')}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">/quarter</p>
          </div>
        </div>

        {/* Group name */}
        <p className="mt-4 text-[13px] font-medium text-foreground truncate">{groupName}</p>

        {/* Stats row with vertical dividers */}
        <div className="mt-3 flex items-center rounded-[10px] border border-border">
          <div className="flex-1 px-3 py-2 text-center">
            <p className="text-[13px] font-semibold text-foreground tabular-nums">{signalCount}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Signals</p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="flex-1 px-3 py-2 text-center">
            <p className="text-[13px] font-semibold text-foreground tabular-nums">
              {accuracy !== null ? `${accuracy}%` : '—'}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Accuracy</p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="flex-1 px-3 py-2 text-center">
            <p className="text-[13px] font-semibold text-foreground tabular-nums">{subCount}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Members</p>
          </div>
        </div>

        {/* Strategy tags */}
        {strategyType && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {strategyType.split(',').slice(0, 3).map((tag, i) => (
              <span key={i} className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                {tag.trim()}
              </span>
            ))}
          </div>
        )}

        {/* Description */}
        {description && !compact && (
          <p className="mt-3 text-[12px] text-[hsl(var(--body))] line-clamp-2 leading-relaxed">
            {description}
          </p>
        )}

        {/* CTA */}
        {!compact && (
          <button className="mt-4 w-full h-10 rounded-[10px] bg-primary text-primary-foreground text-[13px] font-semibold transition-colors duration-150 group-hover:bg-primary/90">
            View group
          </button>
        )}
      </div>
    </Link>
  );
}
