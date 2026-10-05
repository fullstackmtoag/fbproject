import { SectionCard } from '@/components/shared/section-card';
import { SkeletonRows } from '@/components/shared/skeleton-rows';
import { Skeleton } from '@/components/ui/skeleton';

/** Toolbar strip plus table rows, shown while posts are loading. */
export function PostsSkeleton() {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <SectionCard>
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-9 w-full rounded-[10px] sm:max-w-xs" />
          <Skeleton className="h-9 w-16 rounded-[10px]" />
          <Skeleton className="h-9 w-16 rounded-[10px]" />
          <Skeleton className="size-9 rounded-[10px]" />
          <Skeleton className="size-9 rounded-[10px]" />
          <Skeleton className="h-9 w-24 rounded-[10px]" />
          <Skeleton className="size-9 rounded-[10px]" />
          <Skeleton className="h-9 w-28 rounded-[10px]" />
          <Skeleton className="ml-auto h-4 w-16" />
        </div>
      </SectionCard>
      <SectionCard flush>
        <SkeletonRows />
      </SectionCard>
    </div>
  );
}
