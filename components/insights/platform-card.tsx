import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { PlatformLogo, type LogoPlatform } from '@/components/shared/platform-logo';
import { InfoTip } from '@/components/insights/info-tip';
import { LowDataPill } from '@/components/insights/low-data-pill';
import { winnerShell } from '@/components/insights/winner-card';
import { formatCompact, formatNumber } from '@/lib/format';

const FORMULA: Record<LogoPlatform, string> = {
  facebook: 'Engagement = reactions + comments + shares',
  instagram: 'Engagement = likes + comments + saves + shares',
};

const NAME: Record<LogoPlatform, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
};

export interface PlatformCardProps {
  platform: LogoPlatform;
  /** False when the platform filter excludes this account. */
  included: boolean;
  posts: number;
  avg: number | null;
  className?: string;
}

/** Compact per-platform engagement card. Shows only the platform mark, never the name. */
export function PlatformCard({ platform, included, posts, avg, className }: PlatformCardProps) {
  return (
    <div className={cn(winnerShell, className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <PlatformLogo platform={platform} />
          {included ? (
            <p
              className="mt-1 font-heading text-2xl font-semibold leading-7 tracking-tight tabular-nums"
              title={avg === null ? undefined : formatNumber(avg)}
            >
              {formatCompact(avg)}
            </p>
          ) : (
            <p className="mt-1 text-sm leading-5 text-muted-foreground">Not included in the current platform filter.</p>
          )}
        </div>
        <InfoTip label={`How ${NAME[platform]} engagement is calculated`}>{FORMULA[platform]}</InfoTip>
      </div>
      {included ? (
        <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <p className="min-w-0 text-[11px] leading-4 text-muted-foreground tabular-nums">
            Avg engagement · {formatNumber(posts)} {posts === 1 ? 'post' : 'posts'}
          </p>
          {posts > 0 ? <LowDataPill count={posts} /> : null}
        </div>
      ) : null}
    </div>
  );
}

export function PlatformCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn(winnerShell, className)} aria-busy>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Skeleton className="size-6 rounded-md" />
          <Skeleton className="mt-1 h-6 w-16" />
        </div>
        <Skeleton className="size-7 rounded-lg" />
      </div>
      <Skeleton className="mt-1.5 h-3 w-28 max-w-full" />
    </div>
  );
}
