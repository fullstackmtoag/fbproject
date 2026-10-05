import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Eye, Play, TrendingUp, Users } from 'lucide-react';
import {
  AgeBarChart,
  FollowersAreaChart,
  GenderDonutChart,
  LocationBarChart,
  ReachViewsLineChart,
  type FollowersDatum,
  type ReachViewsDatum,
} from '@/components/audience/audience-charts';
import { DemographicsUnavailable, PlatformUnavailableNotice } from '@/components/audience/audience-notices';
import { AudiencePageHeader } from '@/components/audience/audience-page-header';
import { AudienceSkeleton } from '@/components/audience/audience-skeleton';
import { ChartCard } from '@/components/insights/chart-card';
import { StatCard } from '@/components/overview/stat-card';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { appTimezone, formatCompact, formatShortDate } from '@/lib/format';
import {
  getAccountSeries,
  getAudience,
  normalizeFilters,
  type AccountSeriesPoint,
  type Audience,
  type AudienceSlice,
  type Days,
} from '@/lib/queries';

export const metadata: Metadata = { title: 'Audience' };

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function rangeLabel(days: Days): string {
  return days > 0 ? `last ${days} days` : 'all time';
}

// ---------------------------------------------------------------------------
// Date helpers (same pattern as the Overview trend)
// ---------------------------------------------------------------------------

function todayYmd(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: appTimezone(),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function addDays(ymd: string, delta: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + delta)).toISOString().slice(0, 10);
}

function dayLabel(ymd: string): string {
  return formatShortDate(`${ymd}T00:00:00Z`, { timeZone: 'UTC' });
}

/** Fill in missing dates so the chart axis is continuous. */
function fillSeries<T extends object>(
  rows: AccountSeriesPoint[],
  days: Days,
  mapper: (row: AccountSeriesPoint) => T,
  defaults: T,
): (T & { date: string; label: string })[] {
  const end = todayYmd();
  const start = days > 0 ? addDays(end, -days) : (rows[0]?.date ?? end);
  const lookup = new Map(rows.map((r) => [r.date, r]));
  const out: (T & { date: string; label: string })[] = [];
  for (let date = start; date <= end; date = addDays(date, 1)) {
    const row = lookup.get(date);
    out.push({ date, label: dayLabel(date), ...(row ? mapper(row) : defaults) });
  }
  return out;
}

function sumOrNull(rows: AccountSeriesPoint[], key: 'reach' | 'views'): number | null {
  let total = 0;
  let seen = false;
  for (const row of rows) {
    const value = row[key];
    if (value === null) continue;
    total += value;
    seen = true;
  }
  return seen ? total : null;
}

function signedCompact(value: number): string {
  return value > 0 ? `+${formatCompact(value)}` : formatCompact(value);
}

// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------

const SERIES_HINT = 'Follower history builds up with each daily sync. Click Sync to get started.';

interface SeriesView {
  followers: FollowersDatum[];
  reachViews: ReachViewsDatum[];
  lastLabel: string | null;
  lastFollowers: number | null;
  growth: number | null;
  growthPct: number | null;
  totalReach: number | null;
  totalViews: number | null;
  hasSeries: boolean;
}

/** Derive everything the stat cards and the two time charts need from one series. */
function buildSeriesView(series: AccountSeriesPoint[], days: Days): SeriesView {
  const followers: FollowersDatum[] = fillSeries(series, days, (r) => ({ followers: r.followers }), { followers: null });
  const reachViews: ReachViewsDatum[] = fillSeries(
    series,
    days,
    (r) => ({ reach: r.reach, views: r.views }),
    { reach: null, views: null },
  );

  const firstPoint = followers.find((d) => d.followers !== null) ?? null;
  const lastPoint = [...followers].reverse().find((d) => d.followers !== null) ?? null;
  const firstFollowers = firstPoint?.followers ?? null;
  const lastFollowers = lastPoint?.followers ?? null;
  const growth = firstFollowers !== null && lastFollowers !== null ? lastFollowers - firstFollowers : null;
  const growthPct =
    growth !== null && firstFollowers !== null && firstFollowers > 0 ? (growth / firstFollowers) * 100 : null;

  return {
    followers,
    reachViews,
    lastLabel: lastPoint?.label ?? null,
    lastFollowers,
    growth,
    growthPct,
    totalReach: sumOrNull(series, 'reach'),
    totalViews: sumOrNull(series, 'views'),
    hasSeries: series.length > 0,
  };
}

function StatsAndFollowers({ view, days }: { view: SeriesView; days: Days }) {
  const range = rangeLabel(days);
  return (
    <>
      <section aria-label="Key metrics" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Followers"
          value={view.lastFollowers}
          icon={Users}
          hint={view.lastLabel ? `as of ${view.lastLabel}` : 'No follower history yet'}
        />
        <StatCard
          label="Growth"
          value={view.growth === null ? null : signedCompact(view.growth)}
          change={view.growth === null ? undefined : view.growthPct}
          icon={TrendingUp}
          hint={view.growth === null ? 'Needs two or more synced days' : range}
        />
        <StatCard
          label="Reach"
          value={view.totalReach}
          icon={Eye}
          hint={view.totalReach === null ? 'No reach insights synced' : `Total, ${range}`}
        />
        <StatCard
          label="Views"
          value={view.totalViews}
          icon={Play}
          hint={view.totalViews === null ? 'No view insights synced' : `Total, ${range}`}
        />
      </section>

      <ChartCard title="Followers growth" description="Daily follower count in the selected range.">
        {view.hasSeries ? <FollowersAreaChart data={view.followers} /> : <EmptyState icon={Users} hint={SERIES_HINT} />}
      </ChartCard>
    </>
  );
}

function ReachViews({ view }: { view: SeriesView | null }) {
  const hasData = view !== null && view.hasSeries && (view.totalReach !== null || view.totalViews !== null);
  return (
    <ChartCard title="Reach and views" description="Daily accounts reached and video views.">
      {view === null ? (
        <ErrorState message="Reach and views could not be loaded." className="min-h-32 py-6" />
      ) : hasData ? (
        <ReachViewsLineChart data={view.reachViews} />
      ) : (
        <EmptyState
          icon={Eye}
          hint={view.hasSeries ? 'No reach or views in this period yet. They are collected during each sync.' : SERIES_HINT}
        />
      )}
    </ChartCard>
  );
}

function Breakdown({
  title,
  description,
  data,
  children,
}: {
  title: string;
  description: string;
  data: AudienceSlice[];
  children: React.ReactNode;
}) {
  return (
    <ChartCard title={title} description={description}>
      {data.length > 0 ? children : <EmptyState hint="Not available yet." className="min-h-32 py-6" />}
    </ChartCard>
  );
}

function DemographicsBlocks({ audience }: { audience: Audience }) {
  const isEmpty =
    audience.age.length === 0 &&
    audience.gender.length === 0 &&
    audience.city.length === 0 &&
    audience.country.length === 0;

  if (isEmpty) return <DemographicsUnavailable />;

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        <Breakdown title="Age" description="Share of followers by age group." data={audience.age}>
          <AgeBarChart data={audience.age} />
        </Breakdown>
        <Breakdown title="Gender" description="Share of followers by gender." data={audience.gender}>
          <GenderDonutChart data={audience.gender} />
        </Breakdown>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Breakdown title="Top cities" description="Where followers live." data={audience.city}>
          <LocationBarChart data={audience.city} limit={10} />
        </Breakdown>
        <Breakdown title="Top countries" description="Follower share by country." data={audience.country}>
          <LocationBarChart data={audience.country} limit={10} />
        </Breakdown>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Content (streams in behind the skeleton)
// ---------------------------------------------------------------------------

async function AudienceContent({ days }: { days: Days }) {
  const [seriesResult, audienceResult] = await Promise.allSettled([getAccountSeries('instagram', days), getAudience()]);

  if (seriesResult.status === 'rejected' && audienceResult.status === 'rejected') {
    return (
      <ErrorState
        title="Audience unavailable"
        message="The dashboard could not read from the database. Check the connection and refresh."
      />
    );
  }

  // Order: stat cards, followers growth, demographics, reach and views.
  const view = seriesResult.status === 'fulfilled' ? buildSeriesView(seriesResult.value, days) : null;

  return (
    <>
      {view ? (
        <StatsAndFollowers view={view} days={days} />
      ) : (
        <ErrorState message="Follower history could not be loaded." />
      )}
      {audienceResult.status === 'fulfilled' ? (
        <DemographicsBlocks audience={audienceResult.value} />
      ) : (
        <ErrorState message="Demographics could not be loaded." />
      )}
      <ReachViews view={view} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AudiencePage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const filters = normalizeFilters({ platform: first(sp.platform), days: first(sp.days) });

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <AudiencePageHeader />
      {filters.platform === 'facebook' ? (
        <PlatformUnavailableNotice />
      ) : (
        <Suspense key={String(filters.days)} fallback={<AudienceSkeleton />}>
          <AudienceContent days={filters.days} />
        </Suspense>
      )}
    </div>
  );
}
