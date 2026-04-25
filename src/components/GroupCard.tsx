import { Link } from 'react-router-dom';
import { Shield, Users, BarChart2, ArrowRight, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  groupId, advisorId, advisorName, advisorPhoto, sebiRegNo,
  groupName, description, monthlyPrice,
  subCount, signalCount, winCount, resolvedCount,
  strategyType, compact,
}: GroupCardProps) {
  const accuracy = resolvedCount > 0 ? Math.round((winCount / resolvedCount) * 100) : null;
  const hasHighAccuracy = accuracy !== null && accuracy >= 70 && signalCount >= 10;

  return (
    <Link to={`/group/${groupId}`}>
      <div className={`group overflow-hidden rounded-2xl border-[1.5px] border-l-4 border-l-green-500 bg-card shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all ${
        hasHighAccuracy ? 'border-green-500' : 'border-border'
      }`}>
        <div className={compact ? 'p-3.5' : 'p-4'}>
          {/* Header: Photo + Name + Price */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3 flex-1">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-base font-bold text-primary-foreground overflow-hidden ring-2 ring-primary/20">
                {advisorPhoto ? (
                  <img src={advisorPhoto} alt={advisorName} className="h-full w-full object-cover" />
                ) : toTitleCase(advisorName).charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-bold text-foreground text-sm truncate">{toTitleCase(advisorName)}</p>
                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                </div>
                <p className="text-xs text-muted-foreground truncate">{groupName}</p>
              </div>
            </div>
            <span className="shrink-0 text-lg font-extrabold text-green-500 whitespace-nowrap">
              ₹{monthlyPrice}
            </span>
          </div>

          {/* SEBI Badge - Prominent */}
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-primary/5 px-2.5 py-1.5">
            <Shield className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-xs font-bold text-primary truncate">SEBI {sebiRegNo}</span>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="rounded-lg bg-muted p-2 text-center">
              <p className="text-xs font-bold text-foreground">{signalCount}</p>
              <p className="text-[10px] text-muted-foreground">Signals</p>
            </div>
            <div className={`rounded-lg p-2 text-center ${hasHighAccuracy ? 'bg-primary/10' : 'bg-muted'}`}>
              <p className={`text-xs font-bold ${hasHighAccuracy ? 'text-primary' : 'text-foreground'}`}>
                {accuracy !== null ? `${accuracy}%` : <span className="text-gray-400">New</span>}
              </p>
              <p className={`text-[10px] ${hasHighAccuracy ? 'text-primary' : 'text-muted-foreground'}`}>Accuracy</p>
            </div>
            <div className="rounded-lg bg-muted p-2 text-center">
              <p className="text-xs font-bold text-foreground">{subCount}</p>
              <p className="text-[10px] text-muted-foreground">Members</p>
            </div>
          </div>

          {/* Specialty Tag */}
          {strategyType && (
            <div className="mb-3 flex flex-wrap gap-2">
              {strategyType.split(',').map((tag, i) => (
                <span key={i} className="inline-flex items-center rounded-full bg-secondary/10 px-2.5 py-1 text-[10px] font-semibold text-secondary">
                  {tag.trim()}
                </span>
              ))}
            </div>
          )}

          {/* Description */}
          {description && !compact && (
            <p className="text-[11px] text-muted-foreground line-clamp-2 mb-3 italic">"{description}"</p>
          )}

          {!compact && (
            <Button size="sm" className="w-full rounded-lg bg-primary font-semibold text-xs h-9">
              See Group & Subscribe <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </Link>
  );
}
