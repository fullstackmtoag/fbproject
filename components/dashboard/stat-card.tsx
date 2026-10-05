import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCompact, formatNumber, formatPercentChange } from '@/lib/format';

export interface StatCardProps {
  label: string;
  /** Numbers are shown compact (1.2K) with the full value in a tooltip. NULL renders as "—". */
  value: number | string | null | undefined;
  /**
   * Percent change vs the previous period.
   * - `undefined`: no comparison row at all
   * - `null`: comparison not available (shown muted)
   */
  change?: number | null;
  icon?: LucideIcon;
  /** Small muted line under the value, e.g. "vs previous 30 days". */
  hint?: ReactNode;
  className?: string;
}

function ChangeIndicator({ change }: { change: number | null }) {
  if (change === null) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="size-3" aria-hidden />
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
        'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-medium tabular-nums',
        direction === 'up' && 'bg-success/10 text-success',
        direction === 'down' && 'bg-destructive/10 text-destructive',
        direction === 'flat' && 'bg-muted text-muted-foreground',
      )}
      aria-label={`${formatPercentChange(change)} vs previous period`}
    >
      <Icon className="size-3" aria-hidden />
      {formatPercentChange(change)}
    </span>
  );
}

export function StatCard({ label, value, change, icon: Icon, hint, className }: StatCardProps) {
  const isNumber = typeof value === 'number';
  const display = isNumber ? formatCompact(value) : (value ?? formatCompact(null));
  const title = isNumber ? formatNumber(value) : undefined;

  return (
    <Card size="sm" className={cn('gap-2', className)}>
      <div className="flex items-start justify-between gap-3 px-(--card-spacing)">
        <p className="text-[0.8125rem] font-medium tracking-tight text-muted-foreground">{label}</p>
        {Icon ? (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Icon className="size-4" aria-hidden />
          </span>
        ) : null}
      </div>
      <div className="flex flex-wrap items-end gap-x-2 gap-y-1 px-(--card-spacing)">
        <span
          className="font-heading text-[1.75rem] font-semibold leading-none tracking-tight tabular-nums"
          title={title}
        >
          {display}
        </span>
        {change !== undefined ? <ChangeIndicator change={change} /> : null}
      </div>
      {hint ? <p className="px-(--card-spacing) text-xs text-muted-foreground">{hint}</p> : null}
    </Card>
  );
}

export function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <Card size="sm" className={cn('gap-3', className)} aria-busy>
      <div className="flex items-start justify-between gap-3 px-(--card-spacing)">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="size-8 rounded-lg" />
      </div>
      <div className="flex items-end gap-2 px-(--card-spacing)">
        <Skeleton className="h-7 w-20" />
        <Skeleton className="h-5 w-12" />
      </div>
      <div className="px-(--card-spacing)">
        <Skeleton className="h-3 w-32" />
      </div>
    </Card>
  );
}
