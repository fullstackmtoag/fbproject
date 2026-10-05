import { Skeleton } from '@/components/ui/skeleton';

/** Header plus body placeholders that match the posts table row height. */
export function SkeletonRows({ rows = 8 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading posts</span>
      <div className="flex items-center gap-3 border-b border-border bg-muted px-3 py-2.5">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-3 w-16" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="flex h-[52px] items-center gap-3 border-b border-border px-3 last:border-b-0"
        >
          <Skeleton className="size-8 shrink-0 rounded-md" />
          <Skeleton className="size-5 shrink-0 rounded-md" />
          <Skeleton className="h-4 min-w-0 flex-1" />
          <Skeleton className="hidden h-5 w-14 rounded-full sm:block" />
          <Skeleton className="hidden h-4 w-12 md:block" />
        </div>
      ))}
    </div>
  );
}
