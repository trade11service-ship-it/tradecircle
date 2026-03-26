import { ReactNode } from 'react';
import { Search, TrendingUp, Heart, AlertCircle, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: 'default' | 'search' | 'no-data' | 'error';
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  variant = 'default',
}: EmptyStateProps) {
  const getIcon = () => {
    if (icon) return icon;

    switch (variant) {
      case 'search':
        return <Search className="h-12 w-12 text-muted-foreground/50" />;
      case 'no-data':
        return <TrendingUp className="h-12 w-12 text-muted-foreground/50" />;
      case 'error':
        return <AlertCircle className="h-12 w-12 text-destructive/50" />;
      default:
        return <Heart className="h-12 w-12 text-muted-foreground/50" />;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 md:p-12 text-center">
      <div className="mb-4 animate-fade-in">{getIcon()}</div>
      <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-6">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button onClick={onAction} className="rounded-lg">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export function NoSignalsEmpty() {
  return (
    <EmptyState
      icon={<Zap className="h-12 w-12 text-primary/50" />}
      title="No signals yet"
      description="This advisor hasn't posted any trading signals yet. Check back soon!"
      variant="no-data"
    />
  );
}

export function NoAdvisorsEmpty() {
  return (
    <EmptyState
      icon={<Search className="h-12 w-12 text-primary/50" />}
      title="No advisors found"
      description="Try adjusting your search filters or browse all advisors."
      actionLabel="Browse All"
      variant="search"
    />
  );
}

export function NoSubscriptionsEmpty() {
  return (
    <EmptyState
      icon={<Heart className="h-12 w-12 text-primary/50" />}
      title="No subscriptions yet"
      description="Subscribe to an advisor to start receiving their trading signals."
      actionLabel="Browse Advisors"
      variant="no-data"
    />
  );
}

export function LoadingSkeletonCard() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-12 w-12 rounded-lg bg-muted" />
        <div className="flex-1">
          <div className="h-4 bg-muted rounded mb-2 w-3/4" />
          <div className="h-3 bg-muted rounded w-1/2" />
        </div>
      </div>
      <div className="space-y-3">
        <div className="h-3 bg-muted rounded" />
        <div className="h-3 bg-muted rounded w-5/6" />
      </div>
    </div>
  );
}

export function LoadingSkeletonGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[...Array(4)].map((_, i) => (
        <LoadingSkeletonCard key={i} />
      ))}
    </div>
  );
}
