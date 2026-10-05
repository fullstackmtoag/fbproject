import { Skeleton } from '@/components/ui/skeleton';
import { ChartCard } from '@/components/insights/chart-card';
import { PlatformCardSkeleton } from '@/components/insights/platform-card';
import { SummaryCalloutSkeleton } from '@/components/insights/summary-callout';
import { WinnerCardSkeleton } from '@/components/insights/winner-card';

function SectionHeadingSkeleton() {
  return (
    <div className="space-y-1.5">
      <Skeleton className="h-5 w-36" />
      <Skeleton className="h-3 w-56 max-w-full" />
    </div>
  );
}

function BarsSkeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-3.5 py-1">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="h-3 w-14 shrink-0" />
          <Skeleton className="h-5 rounded-r-[4px]" style={{ width: `${85 - index * 14}%` }} />
        </div>
      ))}
    </div>
  );
}

/** Mirrors the loaded Insights layout so nothing shifts when data arrives. */
export function InsightsSkeleton() {
  return (
    <div className="flex min-w-0 flex-col gap-4" aria-busy>
      <span className="sr-only">Loading insights</span>

      <section className="flex flex-col gap-3">
        <SectionHeadingSkeleton />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <WinnerCardSkeleton key={index} />
          ))}
        </div>
      </section>

      <ChartCard title="Content type" description="Average engagement per type.">
        <div className="grid items-start gap-4 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <BarsSkeleton rows={4} />
          </div>
          <Skeleton className="h-44 w-full rounded-[8px] lg:col-span-2" />
        </div>
      </ChartCard>

      <ChartCard title="Best time" description="Average engagement by weekday and hour.">
        <Skeleton className="h-52 w-full rounded-[4px]" />
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Caption length" description="Average engagement by caption length.">
          <BarsSkeleton rows={4} />
        </ChartCard>
        <ChartCard title="Hashtags" description="Average engagement by hashtag count.">
          <BarsSkeleton rows={4} />
        </ChartCard>
      </div>

      <section className="flex flex-col gap-3">
        <SectionHeadingSkeleton />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <PlatformCardSkeleton />
          <PlatformCardSkeleton />
        </div>
      </section>

      <SummaryCalloutSkeleton />
    </div>
  );
}
