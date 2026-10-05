import { TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

export const LOW_DATA_THRESHOLD = 10;

export interface LowDataNoteProps {
  /** Number of posts the comparison is based on. */
  count: number;
  /** Renders nothing when `count >= threshold`. */
  threshold?: number;
  className?: string;
}

/**
 * Shown next to any comparison built on fewer than 10 posts.
 * Returns null when there is enough data, so it can be dropped in unconditionally.
 */
export function LowDataNote({ count, threshold = LOW_DATA_THRESHOLD, className }: LowDataNoteProps) {
  if (count >= threshold) return null;

  return (
    <p
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border border-warning/25 bg-warning/12 px-2 py-1 text-xs font-medium text-amber-800/80 dark:border-transparent dark:bg-warning/15 dark:text-amber-300',
        className,
      )}
    >
      <TriangleAlert className="size-3.5 shrink-0" aria-hidden />
      <span>
        Low data, not conclusive
        <span className="font-normal text-muted-foreground">
          {' '}
          ({count} {count === 1 ? 'post' : 'posts'})
        </span>
      </span>
    </p>
  );
}
