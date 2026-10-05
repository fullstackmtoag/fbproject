import { Skeleton } from '@/components/ui/skeleton';

/** Toolbar + row placeholders for the posts table. */
export function PostsTableSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading posts</span>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Skeleton className="h-8 w-full sm:max-w-xs" />
        <Skeleton className="h-8 w-36" />
        <div className="flex gap-2 sm:ml-auto">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-28" />
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="flex gap-3 border-b bg-muted/40 px-3 py-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-4 w-20" />
          ))}
        </div>
        <div className="divide-y">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-3">
              <Skeleton className="size-10 shrink-0 rounded-md" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-4 min-w-0 flex-1" />
              <Skeleton className="hidden h-4 w-16 sm:block" />
              <Skeleton className="hidden h-4 w-14 md:block" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
