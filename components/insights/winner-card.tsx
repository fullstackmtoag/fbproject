import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { LowDataPill } from '@/components/insights/low-data-pill';
import { formatCompact, formatNumber } from '@/lib/format';

/** Same compact shell as the Overview stat cards. */
export const winnerShell =
  'flex h-full min-h-[88px] min-w-0 flex-col justify-center overflow-hidden rounded-[12px] bg-card px-3.5 py-3 text-card-foreground ring-1 ring-foreground/10';

export interface WinnerCardProps {
  label: string;
  icon: LucideIcon;
  /** NULL when there is nothing to compare yet. */
  winner: string | null;
  /** Short qualifier for the winner, e.g. "80–200 characters". */
  detail?: string;
  avg: number | null;
  posts: number;
  className?: string;
}

export function WinnerCard({ label, icon: Icon, winner, detail, avg, posts, className }: WinnerCardProps) {
  return (
    <div className={cn(winnerShell, 'relative', className)}>
      {/* Absolutely placed so the value can use the full card width on narrow screens. */}
      <span className="absolute top-3 right-3.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent text-muted-foreground">
        <Icon className="size-[15px]" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="pr-9 text-xs font-medium leading-4 tracking-tight text-muted-foreground">{label}</p>
        {winner === null ? (
          <p className="mt-1 text-sm leading-5 text-muted-foreground">No data yet. Needs synced posts with metrics.</p>
        ) : (
          <p
            className="font-heading text-2xl font-semibold leading-7 tracking-tight break-words"
            title={detail ? `${winner} (${detail})` : winner}
          >
            {winner}
          </p>
        )}
      </div>
      {winner !== null ? (
        <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <p className="min-w-0 text-[11px] leading-4 text-muted-foreground tabular-nums">
            {detail ? <>{detail} · </> : null}
            <span className="font-medium text-foreground" title={formatNumber(avg)}>
              {formatCompact(avg)}
            </span>{' '}
            avg engagement · {formatNumber(posts)} {posts === 1 ? 'post' : 'posts'}
          </p>
          <LowDataPill count={posts} />
        </div>
      ) : null}
    </div>
  );
}

export function WinnerCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn(winnerShell, 'relative', className)} aria-busy>
      <Skeleton className="absolute top-3 right-3.5 size-7 rounded-lg" />
      <div className="min-w-0 pr-9">
        <Skeleton className="h-4 w-24 max-w-full" />
        <Skeleton className="mt-1 h-6 w-20" />
      </div>
      <Skeleton className="mt-1.5 h-3 w-32 max-w-full" />
    </div>
  );
}
