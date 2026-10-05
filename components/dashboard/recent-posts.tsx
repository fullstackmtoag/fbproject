import { ExternalLink, FileText, Film, Image as ImageIcon, Images, Link as LinkIcon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { PlatformBadge, type BadgePlatform } from '@/components/dashboard/platform-badge';
import { formatCompact, formatNumber } from '@/lib/format';

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

const TYPE_ICON: Record<string, LucideIcon> = {
  image: ImageIcon,
  video: Film,
  reel: Film,
  carousel: Images,
  link: LinkIcon,
  text: FileText,
};

function Thumbnail({ post }: { post: RecentPostItem }) {
  const Icon = TYPE_ICON[post.contentType ?? ''] ?? FileText;
  if (!post.thumbnailUrl) {
    return (
      <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground" aria-hidden>
        <Icon className="size-5" />
      </span>
    );
  }
  return (
    // Meta CDN hostnames rotate, so a plain <img> avoids a remotePatterns allow-list.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={post.thumbnailUrl}
      alt=""
      width={48}
      height={48}
      loading="lazy"
      referrerPolicy="no-referrer"
      className="size-12 shrink-0 rounded-md bg-muted object-cover"
    />
  );
}

function snippet(content: string | null, contentType: string | null): string {
  const text = content?.replace(/\s+/g, ' ').trim();
  if (text) return text;
  return contentType ? `(${contentType}, no caption)` : '(no caption)';
}

/** Server Component: compact list of the newest posts. */
export function RecentPosts({ posts, className }: RecentPostsProps) {
  return (
    <ul className={cn('divide-y', className)}>
      {posts.map((post) => {
        const body = (
          <>
            <Thumbnail post={post} />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm leading-snug">{snippet(post.content, post.contentType)}</p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <PlatformBadge platform={post.platform} variant="icon" size="sm" />
                <span>{post.publishedAt}</span>
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-heading text-sm font-semibold tabular-nums" title={formatNumber(post.engagement)}>
                {formatCompact(post.engagement)}
              </p>
              <p className="text-[11px] text-muted-foreground">engagement</p>
            </div>
          </>
        );

        return (
          <li key={post.id}>
            {post.permalink ? (
              <a
                href={post.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 py-3 first:pt-0 last:pb-0 hover:bg-muted/40 -mx-2 rounded-md px-2"
              >
                {body}
                <ExternalLink
                  className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                  aria-hidden
                />
              </a>
            ) : (
              <div className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function RecentPostsSkeleton({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <ul className={cn('divide-y', className)} aria-busy>
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
          <Skeleton className="size-12 rounded-md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-5 w-10" />
        </li>
      ))}
    </ul>
  );
}
