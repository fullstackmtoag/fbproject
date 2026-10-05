import { TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LOW_DATA_THRESHOLD } from '@/components/dashboard/low-data-note';

export interface LowDataPillProps {
  /** Number of posts the comparison is based on. */
  count: number;
  className?: string;
}

/** Compact warning pill. Renders nothing when there are enough posts (>= 10). */
export function LowDataPill({ count, className }: LowDataPillProps) {
  if (count >= LOW_DATA_THRESHOLD) return null;

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-md bg-warning/15 px-1.5 py-0.5 text-[11px] leading-4 font-medium text-amber-800/80 dark:bg-warning/15 dark:text-amber-300',
        className,
      )}
      title={`Based on ${count} ${count === 1 ? 'post' : 'posts'}`}
    >
      <TriangleAlert className="size-3 shrink-0" aria-hidden />
      Low data, not conclusive
      <span className="sr-only">
        {' '}
        ({count} {count === 1 ? 'post' : 'posts'})
      </span>
    </span>
  );
}
