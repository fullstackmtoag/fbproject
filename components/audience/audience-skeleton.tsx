import { Skeleton } from '@/components/ui/skeleton';
import { ChartCard } from '@/components/insights/chart-card';
import { StatCardSkeleton } from '@/components/overview/stat-card';

function BarsSkeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-3 py-1">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="h-3 w-20 shrink-0" />
          <Skeleton className="h-5 rounded-r-[4px]" style={{ width: `${85 - index * 9}%` }} />
        </div>
      ))}
    </div>
  );
}

/** Mirrors the loaded Audience layout so nothing shifts when data arrives. */
export function AudienceSkeleton() {
  return (
    <div className="flex min-w-0 flex-col gap-4" aria-busy>
      <span className="sr-only">Loading audience</span>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <StatCardSkeleton key={index} />
        ))}
      </div>

      <ChartCard title="Followers growth" description="Daily follower count in the selected range.">
        <Skeleton className="h-[260px] w-full rounded-[8px]" />
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Age" description="Share of followers by age group.">
          <Skeleton className="h-[220px] w-full rounded-[8px]" />
        </ChartCard>
        <ChartCard title="Gender" description="Share of followers by gender.">
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-8">
            <Skeleton className="size-[180px] rounded-full" />
            <div className="space-y-2.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Top cities" description="Where followers live.">
          <BarsSkeleton rows={6} />
        </ChartCard>
        <ChartCard title="Top countries" description="Follower share by country.">
          <BarsSkeleton rows={6} />
        </ChartCard>
      </div>

      <ChartCard title="Reach and views" description="Daily accounts reached and video views.">
        <Skeleton className="h-[260px] w-full rounded-[8px]" />
      </ChartCard>
    </div>
  );
}
