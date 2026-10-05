import { UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { PlatformBadge, type BadgePlatform } from '@/components/dashboard/platform-badge';
import type { AccountCardProps } from '@/components/dashboard/account-card';
import { formatCompact, formatNumber, formatRelativeTime } from '@/lib/format';

type Platform = BadgePlatform;

const shell =
  'flex min-h-[92px] min-w-0 flex-col justify-center overflow-hidden rounded-[12px] bg-card px-4 py-[14px] text-card-foreground ring-1 ring-foreground/10';

function Avatar({ src, alt, platform }: { src: string | null; alt: string; platform: Platform }) {
  const ring = platform === 'facebook' ? 'ring-facebook/40' : 'ring-instagram/40';
  if (!src) {
    return (
      <span
        className={cn(
          'flex size-11 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground ring-2',
          ring,
        )}
        aria-hidden
      >
        <UserRound className="size-5" />
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
      width={44}
      height={44}
      loading="lazy"
      referrerPolicy="no-referrer"
      className={cn('size-11 shrink-0 rounded-full bg-muted object-cover ring-2', ring)}
    />
  );
}

function Stat({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="min-w-0">
      <p
        className="font-heading text-lg font-semibold leading-none tracking-tight tabular-nums"
        title={formatNumber(value)}
      >
        {formatCompact(value)}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function Stats({ items }: { items: { label: string; value: number | null }[] }) {
  return (
    <div className="flex shrink-0 items-stretch">
      {items.map((item, index) => (
        <div key={item.label} className="flex items-stretch">
          {index > 0 ? <span className="mx-3 w-px self-stretch bg-border" aria-hidden /> : null}
          <Stat label={item.label} value={item.value} />
        </div>
      ))}
    </div>
  );
}

function Profile({
  platform,
  title,
  caption,
  captionTitle,
  pictureUrl,
}: {
  platform: Platform;
  title: string;
  caption: string | null;
  captionTitle?: string;
  pictureUrl: string | null;
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <Avatar src={pictureUrl} alt={pictureUrl ? `${title} profile picture` : ''} platform={platform} />
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="truncate font-heading text-lg font-semibold leading-tight">{title}</h2>
          <PlatformBadge platform={platform} size="sm" />
        </div>
        {caption ? (
          <p className="truncate text-xs text-muted-foreground" title={captionTitle}>
            {caption}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** Compact horizontal account summary used only on the Overview page. */
export function AccountCard({ account, platform, className }: AccountCardProps) {
  if (!account) {
    return (
      <div className={cn(shell, className)}>
        <Profile
          platform={platform}
          title="Not synced yet"
          caption="Click Sync to fetch this account."
          pictureUrl={null}
        />
      </div>
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
  const caption = [updated, subtitle].filter(Boolean).join(' · ') || null;

  const stats = [
    { label: 'Followers', value: account.followers },
    ...(isInstagram
      ? [
          { label: 'Following', value: account.following },
          { label: 'Posts', value: account.mediaCount },
        ]
      : []),
  ];

  return (
    <div className={cn(shell, className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5">
        <div className="flex min-w-[min(100%,14rem)] max-w-full flex-1">
          <Profile
            platform={platform}
            title={title}
            caption={caption}
            captionTitle={account.updatedAt ?? undefined}
            pictureUrl={account.pictureUrl}
          />
        </div>
        <Stats items={stats} />
      </div>
    </div>
  );
}

export function AccountCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn(shell, className)} aria-busy>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Skeleton className="size-11 rounded-full" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-4 w-36 max-w-full" />
            <Skeleton className="h-3 w-28 max-w-full" />
          </div>
        </div>
        <div className="flex items-center">
          <Skeleton className="h-8 w-12" />
          <span className="mx-3 h-8 w-px bg-border" aria-hidden />
          <Skeleton className="h-8 w-12" />
          <span className="mx-3 h-8 w-px bg-border" aria-hidden />
          <Skeleton className="h-8 w-12" />
        </div>
      </div>
    </div>
  );
}
