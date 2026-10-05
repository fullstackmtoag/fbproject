import { UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PlatformBadge, type BadgePlatform } from '@/components/dashboard/platform-badge';
import { formatCompact, formatNumber, formatRelativeTime } from '@/lib/format';

export interface AccountCardData {
  platform: BadgePlatform;
  name: string | null;
  username: string | null;
  followers: number | null;
  following: number | null;
  mediaCount: number | null;
  pictureUrl: string | null;
  /** ISO timestamp of the last account refresh. */
  updatedAt: string | null;
}

export interface AccountCardProps {
  /** `null` renders a "Not synced yet" placeholder for the platform. */
  account: AccountCardData | null;
  platform: BadgePlatform;
  className?: string;
}

function Stat({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="min-w-0">
      <p className="font-heading text-xl font-semibold leading-none tracking-tight tabular-nums" title={formatNumber(value)}>
        {formatCompact(value)}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function Avatar({ src, alt, platform }: { src: string | null; alt: string; platform: BadgePlatform }) {
  const ring = platform === 'facebook' ? 'ring-facebook/40' : 'ring-instagram/40';
  if (!src) {
    return (
      <span
        className={cn(
          'flex size-14 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground ring-2',
          ring,
        )}
        aria-hidden
      >
        <UserRound className="size-6" />
      </span>
    );
  }
  return (
    // Meta CDN hostnames rotate (scontent-*.fbcdn.net), so a plain <img> is used
    // instead of next/image to avoid maintaining a remotePatterns allow-list.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={56}
      height={56}
      loading="lazy"
      referrerPolicy="no-referrer"
      className={cn('size-14 shrink-0 rounded-full bg-muted object-cover ring-2', ring)}
    />
  );
}

/** Server Component: profile summary for one connected account. */
export function AccountCard({ account, platform, className }: AccountCardProps) {
  if (!account) {
    return (
      <Card size="sm" className={cn('justify-center', className)}>
        <div className="flex items-center gap-4 px-(--card-spacing)">
          <Avatar src={null} alt="" platform={platform} />
          <div className="min-w-0 space-y-1.5">
            <PlatformBadge platform={platform} size="sm" />
            <p className="text-sm font-medium">Not synced yet</p>
            <p className="text-xs text-muted-foreground">Click Sync to fetch this account.</p>
          </div>
        </div>
      </Card>
    );
  }

  const isInstagram = platform === 'instagram';
  const title = isInstagram
    ? account.username
      ? `@${account.username}`
      : (account.name ?? 'Account')
    : (account.name ?? account.username ?? 'Account');
  const subtitle = isInstagram && account.username && account.name ? account.name : null;
  const updated = account.updatedAt ? `updated ${formatRelativeTime(account.updatedAt)}` : null;

  return (
    <Card size="sm" className={cn('gap-4', className)}>
      <div className="flex items-start gap-4 px-(--card-spacing)">
        <Avatar src={account.pictureUrl} alt={`${title} profile picture`} platform={platform} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate font-heading text-lg font-semibold leading-tight">{title}</h2>
            <PlatformBadge platform={platform} size="sm" />
          </div>
          {subtitle ? <p className="truncate text-sm text-muted-foreground">{subtitle}</p> : null}
          {updated ? (
            <p className="mt-1 text-xs text-muted-foreground" title={account.updatedAt ?? undefined}>
              {updated}
            </p>
          ) : null}
        </div>
      </div>
      <div
        className={cn(
          'grid gap-4 border-t px-(--card-spacing) pt-(--card-spacing)',
          isInstagram ? 'grid-cols-3' : 'grid-cols-1',
        )}
      >
        <Stat label="Followers" value={account.followers} />
        {isInstagram ? <Stat label="Following" value={account.following} /> : null}
        {isInstagram ? <Stat label="Posts" value={account.mediaCount} /> : null}
      </div>
    </Card>
  );
}

export function AccountCardSkeleton({ className }: { className?: string }) {
  return (
    <Card size="sm" className={cn('gap-4', className)} aria-busy>
      <div className="flex items-start gap-4 px-(--card-spacing)">
        <Skeleton className="size-14 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 border-t px-(--card-spacing) pt-(--card-spacing)">
        <Skeleton className="h-9 w-16" />
        <Skeleton className="h-9 w-16" />
        <Skeleton className="h-9 w-16" />
      </div>
    </Card>
  );
}
