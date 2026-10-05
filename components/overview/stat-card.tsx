import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import type { StatCardProps } from '@/components/dashboard/stat-card';
import { formatCompact, formatNumber, formatPercentChange } from '@/lib/format';

const shell =
  'flex h-full min-h-[88px] min-w-0 flex-col justify-center overflow-hidden rounded-[12px] bg-card px-3.5 py-3 text-card-foreground ring-1 ring-foreground/10';

function ChangeIndicator({ change }: { change: number | null }) {
  if (change === null) {
    return (
      <span className="inline-flex shrink-0 items-center gap-0.5 text-[11px] leading-[14px] text-muted-foreground">
        <Minus className="size-2.5" aria-hidden />
        n/a
      </span>
    );
  }

  const rounded = Math.round(change * 10) / 10;
  const direction = rounded > 0 ? 'up' : rounded < 0 ? 'down' : 'flat';
  const Icon = direction === 'up' ? ArrowUpRight : direction === 'down' ? ArrowDownRight : Minus;

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] leading-[14px] font-medium tabular-nums',
        direction === 'up' && 'bg-success/10 text-success',
        direction === 'down' && 'bg-destructive/10 text-destructive',
        direction === 'flat' && 'bg-muted text-muted-foreground',
      )}
      aria-label={`${formatPercentChange(change)} vs previous period`}
    >
      <Icon className="size-2.5" aria-hidden />
      {formatPercentChange(change)}
    </span>
  );
}

export function StatCard({ label, value, change, icon: Icon, hint, className }: StatCardProps) {
  const isNumber = typeof value === 'number';
  const display = isNumber ? formatCompact(value) : (value ?? formatCompact(null));
  const title = isNumber ? formatNumber(value) : undefined;
  const hintTitle = typeof hint === 'string' ? hint : undefined;

  return (
    <div className={cn(shell, className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium leading-4 tracking-tight text-muted-foreground">{label}</p>
          <p
            className="font-heading text-2xl font-semibold leading-7 tracking-tight tabular-nums"
            title={title}
          >
            {display}
          </p>
        </div>
        {Icon ? (
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Icon className="size-[15px]" aria-hidden />
          </span>
        ) : null}
      </div>
      {change !== undefined || hint ? (
        <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
          {change !== undefined ? <ChangeIndicator change={change} /> : null}
          {hint ? (
            <p className="min-w-0 flex-1 truncate text-[11px] leading-4 text-muted-foreground" title={hintTitle}>
              {hint}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn(shell, className)} aria-busy>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="mt-0 h-7 w-16" />
        </div>
        <Skeleton className="size-7 rounded-lg" />
      </div>
      <div className="mt-0.5 flex items-center gap-1.5">
        <Skeleton className="h-4 w-12 rounded-md" />
        <Skeleton className="h-3 w-24 max-w-full" />
      </div>
    </div>
  );
}
