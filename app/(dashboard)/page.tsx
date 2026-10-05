import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import {
  Activity,
  ArrowRight,
  Bookmark,
  Eye,
  FileText,
  Heart,
  MessageCircle,
  Share2,
  ThumbsUp,
} from 'lucide-react';
import { PlatformBadge } from '@/components/dashboard/platform-badge';
import { SectionCard } from '@/components/dashboard/section-card';
import { EmptyState } from '@/components/dashboard/empty-state';
import { ErrorState } from '@/components/dashboard/error-state';
import { LOW_DATA_THRESHOLD, LowDataNote } from '@/components/dashboard/low-data-note';
import { AccountCard } from '@/components/overview/account-card';
import { StatCard } from '@/components/overview/stat-card';
import { EngagementTrendChart, type TrendDatum } from '@/components/dashboard/engagement-trend-chart';
import { TopPostsChart, type TopPostDatum } from '@/components/dashboard/top-posts-chart';
import { RecentPosts, RecentPostsSkeleton, type RecentPostItem } from '@/components/dashboard/recent-posts';
import { Skeleton } from '@/components/ui/skeleton';
import {
  getAccounts,
  getOverview,
  getPosts,
  getTopPosts,
  getTrend,
  normalizeFilters,
  type Filters,
  type SinglePlatform,
  type TrendPoint,
} from '@/lib/queries';
import { appTimezone, formatDate, formatDateTime, formatShortDate } from '@/lib/format';

export const metadata: Metadata = { title: 'Overview' };

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

const SYNC_HINT = 'Click Sync to fetch data';
const PLATFORMS: SinglePlatform[] = ['facebook', 'instagram'];

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function selectedPlatforms(filters: Filters): SinglePlatform[] {
  return filters.platform === 'all' ? PLATFORMS : [filters.platform];
}

function periodHint(filters: Filters): string {
  return filters.days > 0 ? `vs previous ${filters.days} days` : 'All time, no comparison';
}

function postsHref(filters: Filters): string {
  const params = new URLSearchParams({ platform: filters.platform, days: String(filters.days) });
  return `/posts?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// Date helpers for the trend (all in APP_TIMEZONE, as YYYY-MM-DD strings)
// ---------------------------------------------------------------------------

function todayYmd(): string {
  // en-CA yields ISO-like "YYYY-MM-DD".
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
  // The string is already a calendar day in APP_TIMEZONE; format it as-is (UTC avoids a day shift).
  return formatShortDate(`${ymd}T00:00:00Z`, { timeZone: 'UTC' });
}

/** Merge per-platform daily rows into one continuous series (gaps filled with 0). */
function buildTrend(filters: Filters, byPlatform: Partial<Record<SinglePlatform, TrendPoint[]>>): TrendDatum[] {
  const allDates = Object.values(byPlatform)
    .flat()
    .map((p) => p.date)
    .sort();
  if (allDates.length === 0) return [];

  const end = todayYmd();
  const start = filters.days > 0 ? addDays(end, -filters.days) : allDates[0];

  const lookup = new Map<string, TrendDatum>();
  for (let date = start; date <= end; date = addDays(date, 1)) {
    const datum: TrendDatum = { date, label: dayLabel(date), posts: 0 };
    for (const platform of selectedPlatforms(filters)) datum[platform] = 0;
    lookup.set(date, datum);
  }

  for (const platform of PLATFORMS) {
    for (const point of byPlatform[platform] ?? []) {
      const datum = lookup.get(point.date);
      if (!datum) continue;
      datum.posts += point.posts;
      datum[platform] = (datum[platform] ?? 0) + point.engagement;
    }
  }
  return [...lookup.values()];
}

function shortLabel(content: string | null, contentType: string | null, max = 25): string {
  const text = content?.replace(/\s+/g, ' ').trim();
  if (!text) return contentType ? `(${contentType})` : '(no caption)';
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

// ---------------------------------------------------------------------------
// Streamed sections (each owns its loading, empty and error state)
// ---------------------------------------------------------------------------

async function TrendSection({ filters }: { filters: Filters }) {
  let data: TrendDatum[];
  try {
    const platforms = selectedPlatforms(filters);
    const rows = await Promise.all(platforms.map((p) => getTrend({ ...filters, platform: p })));
    data = buildTrend(filters, Object.fromEntries(platforms.map((p, i) => [p, rows[i]])));
  } catch {
    return <ErrorState message="The engagement trend could not be loaded." />;
  }

  if (data.length === 0) {
    return <EmptyState hint={`No posts in this period. ${SYNC_HINT} or widen the date range.`} />;
  }
  return <EngagementTrendChart data={data} platforms={selectedPlatforms(filters)} />;
}

async function TopPostsSection({ filters }: { filters: Filters }) {
  let data: TopPostDatum[];
  try {
    const posts = await getTopPosts(filters, 10);
    data = posts
      .filter((p) => p.engagement !== null)
      .map((p) => ({
        id: p.id,
        platform: p.platform,
        label: shortLabel(p.content, p.contentType),
        excerpt: shortLabel(p.content, p.contentType, 120),
        date: formatDate(p.createdTime),
        engagement: p.engagement as number,
        permalink: p.permalink,
      }));
  } catch {
    return <ErrorState message="Top posts could not be loaded." />;
  }

  if (data.length === 0) {
    return <EmptyState hint={`No posts with metrics in this period. ${SYNC_HINT}.`} />;
  }
  return <TopPostsChart data={data} />;
}

async function RecentPostsSection({ filters }: { filters: Filters }) {
  let items: RecentPostItem[];
  try {
    const posts = await getPosts(filters);
    items = posts.slice(0, 5).map((p) => ({
      id: p.id,
      platform: p.platform,
      content: p.content,
      contentType: p.contentType,
      permalink: p.permalink,
      thumbnailUrl: p.thumbnailUrl,
      publishedAt: formatDateTime(p.createdTime),
      engagement: p.engagement,
    }));
  } catch {
    return <ErrorState message="Recent posts could not be loaded." />;
  }

  if (items.length === 0) {
    return <EmptyState hint={`No posts in this period. ${SYNC_HINT}.`} />;
  }
  return <RecentPosts posts={items} />;
}

function ChartSkeleton({ height = 300 }: { height?: number }) {
  return <Skeleton className="w-full" style={{ height }} aria-busy />;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function OverviewPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const filters = normalizeFilters({ platform: first(sp.platform), days: first(sp.days) });

  let accounts: Awaited<ReturnType<typeof getAccounts>>;
  let overview: Awaited<ReturnType<typeof getOverview>>;
  try {
    [accounts, overview] = await Promise.all([getAccounts(), getOverview(filters)]);
  } catch {
    return (
      <ErrorState
        title="Overview unavailable"
        message="The dashboard could not read from the database. Check the connection and refresh."
      />
    );
  }

  if (accounts.length === 0 && overview.current.totalPosts === 0) {
    return <EmptyState hint={SYNC_HINT} className="min-h-80" />;
  }

  const { current, change } = overview;
  const hint = periodHint(filters);
  const isFacebookOnly = filters.platform === 'facebook';
  const platforms = selectedPlatforms(filters);
  const lowData = current.totalPosts < LOW_DATA_THRESHOLD;

  return (
    <div className="flex min-w-0 flex-col">
      <div className="mb-4 flex min-w-0 flex-col">
        <section aria-label="Accounts" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {platforms.map((platform) => (
            <AccountCard
              key={platform}
              platform={platform}
              account={accounts.find((a) => a.platform === platform) ?? null}
            />
          ))}
        </section>

        <section aria-label="Key metrics" className={lowData ? 'mt-2' : 'mt-4'}>
          <LowDataNote count={current.totalPosts} className="mb-2" />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Total posts" value={current.totalPosts} change={change.totalPosts} icon={FileText} hint={hint} />
            <StatCard
              label="Total engagement"
              value={current.totalEngagement}
              change={change.totalEngagement}
              icon={Heart}
              hint={hint}
            />
            <StatCard
              label="Avg engagement / post"
              value={current.avgEngagement}
              change={change.avgEngagement}
              icon={Activity}
              hint="Ignores posts without metrics"
            />
            <StatCard
              label="Reactions / Likes"
              value={current.totalReactions}
              change={change.totalReactions}
              icon={ThumbsUp}
              hint={hint}
            />
            <StatCard label="Comments" value={current.totalComments} change={change.totalComments} icon={MessageCircle} hint={hint} />
            <StatCard label="Shares" value={current.totalShares} change={change.totalShares} icon={Share2} hint={hint} />
            <StatCard
              label="Saves"
              value={isFacebookOnly ? 'n/a' : current.totalSaves}
              change={isFacebookOnly ? undefined : change.totalSaves}
              icon={Bookmark}
              hint={
                isFacebookOnly ? (
                  <span className="inline-flex items-center gap-1">
                    <PlatformBadge platform="instagram" size="sm" />
                    only
                  </span>
                ) : (
                  hint
                )
              }
            />
            <StatCard
              label="Reach"
              value={current.totalReach ?? 'n/a'}
              change={current.totalReach === null ? undefined : change.totalReach}
              icon={Eye}
              hint={current.totalReach === null ? 'No reach insights synced' : hint}
            />
          </div>
        </section>
      </div>

      <SectionCard
        title="Engagement trend"
        description={
          filters.platform === 'all'
            ? 'Daily engagement per platform; bars show posts published that day.'
            : 'Daily engagement; bars show posts published that day.'
        }
        className="mb-6"
      >
        <Suspense fallback={<ChartSkeleton />}>
          <TrendSection filters={filters} />
        </Suspense>
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-5">
        <SectionCard
          title="Top 10 posts"
          description="Highest engagement in the selected period. Click a bar to open the post."
          className="lg:col-span-3"
        >
          <Suspense fallback={<ChartSkeleton height={400} />}>
            <TopPostsSection filters={filters} />
          </Suspense>
        </SectionCard>

        <SectionCard
          title="Recent posts"
          description="Newest posts first."
          className="lg:col-span-2"
          action={
            <Link
              href={postsHref(filters)}
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              View all
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          }
        >
          <Suspense fallback={<RecentPostsSkeleton />}>
            <RecentPostsSection filters={filters} />
          </Suspense>
        </SectionCard>
      </div>
    </div>
  );
}
