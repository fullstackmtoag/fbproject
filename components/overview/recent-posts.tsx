import { Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { appTimezone, formatCompact, formatDateTime, formatShortDate } from '@/lib/format';
import type { BadgePlatform } from '@/components/dashboard/platform-badge';

export type { BadgePlatform };

export interface RecentPostItem {
  id: string;
  platform: BadgePlatform;
  content: string | null;
  contentType: string | null;
  permalink: string | null;
  thumbnailUrl: string | null;
  /** Pre-formatted publish time in APP_TIMEZONE, e.g. "Oct 1, 2026, 4:49 PM". */
  publishedAt: string;
  engagement: number | null;
}

export interface RecentPostsProps {
  posts: RecentPostItem[];
  className?: string;
}

function Thumbnail({ post }: { post: RecentPostItem }) {
  if (!post.thumbnailUrl) {
    return (
      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"
        aria-hidden
      >
        <ImageIcon className="size-4" />
      </span>
    );
  }
  return (
    // Meta CDN hostnames rotate, so a plain <img> avoids a remotePatterns allow-list.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={post.thumbnailUrl}
      alt=""
      width={40}
      height={40}
      loading="lazy"
      referrerPolicy="no-referrer"
      className="size-10 shrink-0 rounded-md bg-muted object-cover"
    />
  );
}

function normalizeCaption(content: string | null): { text: string; isPlaceholder: boolean } {
  if (!content) return { text: 'No caption', isPlaceholder: true };
  const cleaned = content.replace(/\s+/g, ' ').trim();
  if (!cleaned) return { text: 'No caption', isPlaceholder: true };
  return { text: cleaned, isPlaceholder: false };
}

function PlatformLogoMark({ platform }: { platform: BadgePlatform }) {
  const isFb = platform === 'facebook';
  return (
    <span
      className={cn(
        'inline-flex size-3.5 shrink-0 items-center justify-center text-white',
        isFb ? 'rounded-full bg-facebook' : 'rounded-[3px] bg-instagram-gradient',
      )}
      role="img"
      aria-label={isFb ? 'Facebook' : 'Instagram'}
    >
      {isFb ? (
        <svg viewBox="0 0 24 24" fill="currentColor" className="size-2.5" aria-hidden>
          <path d="M13.5 21v-7.2h2.4l.4-2.9h-2.8V9.1c0-.8.2-1.4 1.4-1.4h1.5V5.1c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2.1H8v2.9h2.5V21h3Z" />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-2.5"
          aria-hidden
        >
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="0.75" fill="currentColor" />
        </svg>
      )}
    </span>
  );
}

function formatPostDate(publishedAt: string): string {
  const d = new Date(publishedAt);
  if (Number.isNaN(d.getTime())) return publishedAt;

  const tz = appTimezone();
  const getTzYmd = (date: Date) => {
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(date);
    } catch {
      return date.toISOString().slice(0, 10);
    }
  };

  const todayYmd = getTzYmd(new Date());
  const postYmd = getTzYmd(d);

  const [ty, tm, td] = todayYmd.split('-').map(Number);
  const [py, pm, pd] = postYmd.split('-').map(Number);
  const todayUtc = Date.UTC(ty, tm - 1, td);
  const postUtc = Date.UTC(py, pm - 1, pd);

  const diffMs = todayUtc - postUtc;
  const dayDiff = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (dayDiff <= 0) return 'Today';
  if (dayDiff === 1) return 'Yesterday';
  if (dayDiff >= 2 && dayDiff < 7) return `${dayDiff} days ago`;

  return formatShortDate(d, { timeZone: tz });
}

function getFullDateTimeTooltip(publishedAt: string): string {
  const d = new Date(publishedAt);
  if (!Number.isNaN(d.getTime())) {
    return formatDateTime(d, { timeZone: appTimezone() });
  }
  return publishedAt;
}

const HIDE_SUBTITLE_STYLE = `
  [data-slot="card"]:has([data-recent-posts]) [data-slot="card-description"] {
    display: none !important;
  }
`;

/** Server Component: compact list of the newest posts on the Overview page. */
export function RecentPosts({ posts, className }: RecentPostsProps) {
  const displayPosts = posts.slice(0, 5);

  if (displayPosts.length === 0) {
    return (
      <div data-recent-posts className={cn('flex min-h-[140px] items-center justify-center py-8 text-center', className)}>
        <style>{HIDE_SUBTITLE_STYLE}</style>
        <p className="text-sm text-muted-foreground">No posts yet</p>
      </div>
    );
  }

  return (
    <div data-recent-posts className={cn('min-w-0', className)}>
      <style>{HIDE_SUBTITLE_STYLE}</style>
      <ul className="divide-y divide-border">
        {displayPosts.map((post) => {
          const caption = normalizeCaption(post.content);
          const fullDateTime = getFullDateTimeTooltip(post.publishedAt);
          const relativeDate = formatPostDate(post.publishedAt);

          const rowContent = (
            <>
              <Thumbnail post={post} />
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    'truncate text-sm leading-snug',
                    caption.isPlaceholder ? 'text-muted-foreground' : 'font-medium text-foreground',
                  )}
                  title={caption.isPlaceholder ? undefined : caption.text}
                >
                  {caption.text}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <PlatformLogoMark platform={post.platform} />
                  <span className="text-muted-foreground/60" aria-hidden>
                    ·
                  </span>
                  <span title={fullDateTime}>{relativeDate}</span>
                </p>
              </div>
              <div className="shrink-0 text-right">
                <span
                  className="font-heading text-sm font-semibold tabular-nums text-foreground"
                  title="Engagement"
                >
                  {formatCompact(post.engagement)}
                </span>
              </div>
            </>
          );

          return (
            <li key={post.id} className="flex min-h-[56px] items-stretch">
              {post.permalink ? (
                <a
                  href={post.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-1 min-w-0 items-center gap-3 py-2 px-2.5 rounded-lg transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 -mx-2.5"
                >
                  {rowContent}
                </a>
              ) : (
                <div className="flex flex-1 min-w-0 items-center gap-3 py-2 px-2.5 rounded-lg -mx-2.5">
                  {rowContent}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function RecentPostsSkeleton({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div data-recent-posts className={cn('min-w-0', className)} aria-busy="true">
      <style>{HIDE_SUBTITLE_STYLE}</style>
      <ul className="divide-y divide-border">
        {Array.from({ length: rows }, (_, i) => (
          <li key={i} className="flex min-h-[56px] items-center gap-3 py-2 px-2.5 -mx-2.5">
            <Skeleton className="size-10 shrink-0 rounded-md" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-4 w-4/5 max-w-[220px]" />
              <div className="flex items-center gap-1.5">
                <Skeleton className="size-3.5 rounded-[3px]" />
                <span className="text-xs text-muted-foreground/40" aria-hidden>
                  ·
                </span>
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            <Skeleton className="h-4 w-8 shrink-0" />
          </li>
        ))}
      </ul>
    </div>
  );
}
