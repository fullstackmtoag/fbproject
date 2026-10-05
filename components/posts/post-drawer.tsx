'use client';

import { Dialog } from '@base-ui/react/dialog';
import { ExternalLink, X } from 'lucide-react';
import { formatCompact, formatNumber } from '@/lib/format';
import { PlatformLogo } from '@/components/shared/platform-logo';
import { TypePill } from '@/components/shared/type-pill';
import type { PostsTableRow } from './posts-table';

const METRICS: ReadonlyArray<readonly [keyof Pick<
  PostsTableRow,
  'reactions' | 'comments' | 'shares' | 'saves' | 'reach' | 'views' | 'engagement'
>, string]> = [
  ['reactions', 'Likes/Reactions'],
  ['comments', 'Comments'],
  ['shares', 'Shares'],
  ['saves', 'Saves'],
  ['reach', 'Reach'],
  ['views', 'Views'],
  ['engagement', 'Engagement'],
];

function MetricValue({ value }: { value: number | null }) {
  if (value === null) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="tabular-nums" title={formatNumber(value)}>
      {formatCompact(value)}
    </span>
  );
}

export function PostDrawer({ post, onClose }: { post: PostsTableRow | null; onClose: () => void }) {
  const caption = post?.content?.trim() || '(no caption)';

  return (
    <Dialog.Root
      open={post !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-foreground/20 transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup className="fixed inset-x-3 top-3 bottom-3 z-50 flex w-auto flex-col overflow-hidden rounded-[12px] border border-border bg-card text-card-foreground shadow-lg outline-none sm:inset-y-4 sm:right-4 sm:left-auto sm:w-[22.5rem]">
          {post ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                <PlatformLogo platform={post.platform} />
                <Dialog.Title className="sr-only">Post details</Dialog.Title>
                <Dialog.Description className="sr-only">{post.publishedAt}</Dialog.Description>
                <div className="ml-auto flex items-center gap-2">
                  {post.permalink ? (
                    <a
                      href={post.permalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-border bg-card px-3 text-sm font-medium hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                    >
                      Open post
                      <ExternalLink className="size-3.5 text-muted-foreground" aria-hidden />
                    </a>
                  ) : null}
                  <Dialog.Close
                    aria-label="Close"
                    className="inline-flex size-9 items-center justify-center rounded-[10px] border border-border bg-card text-foreground hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    <X className="size-4" aria-hidden />
                  </Dialog.Close>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                <div className="flex gap-3">
                  <DrawerThumbnail post={post} />
                  <p className="min-w-0 flex-1 text-sm leading-relaxed whitespace-pre-wrap">{caption}</p>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <TypePill type={post.contentType} />
                  <span className="text-xs text-muted-foreground">{post.publishedAt}</span>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-2">
                  {METRICS.map(([key, label]) => (
                    <div key={key} className="rounded-[10px] border border-border bg-muted/50 px-3 py-2">
                      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
                      <dd className="mt-0.5 text-right text-sm font-medium">
                        <MetricValue value={post[key]} />
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          ) : null}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DrawerThumbnail({ post }: { post: PostsTableRow }) {
  if (!post.thumbnailUrl) return null;
  return (
    // Meta CDN hostnames rotate, so a plain <img> avoids a remotePatterns allow-list.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={post.thumbnailUrl}
      alt=""
      width={72}
      height={72}
      loading="lazy"
      referrerPolicy="no-referrer"
      className="size-[4.5rem] shrink-0 rounded-[10px] bg-muted object-cover"
    />
  );
}
