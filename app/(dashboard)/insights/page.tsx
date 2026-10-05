import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AlignLeft, CalendarDays, Clock, LayoutGrid, Lightbulb } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { ChartCard } from '@/components/insights/chart-card';
import { ContentTypeTable, type ContentTypeRow } from '@/components/insights/content-type-table';
import {
  BestTimeHeatmap,
  BucketBarChart,
  ContentTypeBarChart,
  type BucketBar,
  type ContentTypeBar,
} from '@/components/insights/insights-charts';
import { InsightsPageHeader } from '@/components/insights/insights-page-header';
import { InsightsSkeleton } from '@/components/insights/insights-skeleton';
import { LowDataPill } from '@/components/insights/low-data-pill';
import { PlatformCard } from '@/components/insights/platform-card';
import { SummaryCallout } from '@/components/insights/summary-callout';
import { WinnerCard } from '@/components/insights/winner-card';
import { appTimezone, formatCompact } from '@/lib/format';
import {
  getBestTimeStats,
  getCaptionStats,
  getContentTypeStats,
  getTrend,
  normalizeFilters,
  type BestTimeStats,
  type BestWindow,
  type BucketStat,
  type CaptionLengthBucket,
  type CaptionStats,
  type ContentTypeStat,
  type Days,
  type Filters,
  type TrendPoint,
} from '@/lib/queries';

export const metadata: Metadata = { title: 'Insights' };

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

const COMPARE_MIN = 5;
const WEEKDAY_NAME = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const TYPE_COPY: Record<string, { axis: string; subject: string; object: string }> = {
  image: { axis: 'Image', subject: 'Images', object: 'images' },
  video: { axis: 'Video', subject: 'Videos', object: 'videos' },
  carousel: { axis: 'Carousel', subject: 'Carousels', object: 'carousels' },
  reel: { axis: 'Reel', subject: 'Reels', object: 'reels' },
  link: { axis: 'Link', subject: 'Link posts', object: 'link posts' },
  text: { axis: 'Text', subject: 'Text posts', object: 'text posts' },
  other: { axis: 'Other', subject: 'Other posts', object: 'other posts' },
};

const LENGTH_COPY: Record<
  CaptionLengthBucket,
  { axis: string; subject: string; object: string; detail: string }
> = {
  none: {
    axis: 'None',
    subject: 'Posts with no caption',
    object: 'posts with no caption',
    detail: 'No caption text',
  },
  short: {
    axis: 'Short',
    subject: 'Short captions',
    object: 'short captions',
    detail: 'Under 80 characters',
  },
  medium: {
    axis: 'Medium',
    subject: 'Medium captions',
    object: 'medium captions',
    detail: '80–200 characters',
  },
  long: {
    axis: 'Long',
    subject: 'Long captions',
    object: 'long captions',
    detail: 'Over 200 characters',
  },
};

const HASHTAG_AXIS: Record<string, string> = {
  '0': '0',
  '1-3': '1–3',
  '4-7': '4–7',
  '8+': '8+',
};

const NOT_ENOUGH = {
  type: 'Not enough data yet to compare content types.',
  weekday: 'Not enough data yet to compare weekdays.',
  window: 'Not enough data yet to compare posting times.',
  caption: 'Not enough data yet to compare caption lengths.',
  platform: 'Not enough data yet to compare the two accounts.',
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function periodPhrase(days: Days): string {
  return days > 0 ? `over the last ${days} days` : 'across all synced posts';
}

function scopePhrase(filters: Filters): string {
  return periodPhrase(filters.days);
}

function typeCopy(contentType: string): { axis: string; subject: string; object: string } {
  return (
    TYPE_COPY[contentType] ?? {
      axis: contentType,
      subject: `${contentType} posts`,
      object: `${contentType} posts`,
    }
  );
}

function clock(hour: number): string {
  const suffix = hour < 12 ? 'AM' : 'PM';
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h} ${suffix}`;
}

/** `endHour` is exclusive and may wrap past midnight (22 -> 1 means 10 PM to 1 AM). */
function windowLabel(startHour: number, endHour: number): string {
  return `${clock(startHour)} to ${clock(endHour)}`;
}

function formatRatio(ratio: number): string {
  const rounded = Math.round(ratio * 10) / 10;
  if (rounded >= 10) return `${Math.round(ratio)}x`;
  return Number.isInteger(rounded) ? `${rounded}x` : `${rounded.toFixed(1)}x`;
}

interface Group {
  subject: string;
  object: string;
  posts: number;
  avg: number | null;
}

/** The two highest averages among groups that each have at least 5 posts. */
function topPair(groups: Group[]): [Group, Group] | null {
  const ready = groups.filter((group): group is Group & { avg: number } => group.avg !== null && group.posts >= COMPARE_MIN);
  ready.sort((a, b) => b.avg - a.avg || b.posts - a.posts);
  if (ready.length < 2) return null;
  return [ready[0], ready[1]];
}

/**
 * One plain-language comparison. Returns null when either group has fewer
 * than 5 posts, so the caller can say there is not enough data yet.
 */
function pairSentence(first: Group, second: Group, scope: string): string | null {
  if (first.avg === null || second.avg === null || first.posts < COMPARE_MIN || second.posts < COMPARE_MIN) {
    return null;
  }
  const firstWins = first.avg >= second.avg;
  const higher = firstWins ? first : second;
  const lower = firstWins ? second : first;
  const higherAvg = higher.avg as number;
  const lowerAvg = lower.avg as number;
  const counts = `(${higher.posts} vs ${lower.posts} posts)`;

  if (lowerAvg <= 0 && higherAvg <= 0) {
    return `${higher.subject} and ${lower.object} average about the same engagement ${scope} ${counts}.`;
  }
  if (lowerAvg <= 0) {
    return `${higher.subject} average ${formatCompact(higherAvg)} engagement and ${lower.object} average 0 ${scope} ${counts}.`;
  }
  const ratio = higherAvg / lowerAvg;
  if (Math.abs(ratio - 1) < 0.05) {
    return `${higher.subject} and ${lower.object} average about the same engagement ${scope} ${counts}.`;
  }
  return `${higher.subject} average ${formatRatio(ratio)} the engagement of ${lower.object} ${scope} ${counts}.`;
}

function sentenceFromPair(groups: Group[], scope: string, fallback: string): string {
  const pair = topPair(groups);
  if (!pair) return fallback;
  return pairSentence(pair[0], pair[1], scope) ?? fallback;
}

function complementHours(stats: BestTimeStats, window: BestWindow): { posts: number; avg: number | null } {
  const inside = new Set<number>();
  for (let offset = 0; offset < 3; offset += 1) inside.add((window.startHour + offset) % 24);

  let posts = 0;
  let weighted = 0;
  let weight = 0;
  for (const hour of stats.byHour) {
    if (inside.has(hour.hour)) continue;
    posts += hour.posts;
    if (hour.avgEngagement !== null && hour.posts > 0) {
      weighted += hour.avgEngagement * hour.posts;
      weight += hour.posts;
    }
  }
  return { posts, avg: weight > 0 ? weighted / weight : null };
}

function trendTotals(points: TrendPoint[]): { posts: number; avg: number | null } {
  let posts = 0;
  let engagement = 0;
  for (const point of points) {
    posts += point.posts;
    engagement += point.engagement;
  }
  return { posts, avg: posts > 0 ? engagement / posts : null };
}

interface PlatformTotal {
  included: boolean;
  posts: number;
  avg: number | null;
}

function buildSummary(
  filters: Filters,
  contentTypes: ContentTypeStat[],
  bestTime: BestTimeStats,
  captions: CaptionStats,
  facebook: PlatformTotal,
  instagram: PlatformTotal,
): string[] {
  const scope = scopePhrase(filters);

  const typeSentence = sentenceFromPair(
    contentTypes.map((stat) => {
      const copy = typeCopy(stat.contentType);
      return { subject: copy.subject, object: copy.object, posts: stat.posts, avg: stat.avgEngagement };
    }),
    scope,
    NOT_ENOUGH.type,
  );

  const weekdaySentence = sentenceFromPair(
    bestTime.byWeekday.map((day) => {
      const name = WEEKDAY_NAME[day.weekday] ?? 'That day';
      return {
        subject: `${name} posts`,
        object: `${name} posts`,
        posts: day.posts,
        avg: day.avgEngagement,
      };
    }),
    scope,
    NOT_ENOUGH.weekday,
  );

  let windowSentence = NOT_ENOUGH.window;
  if (bestTime.bestWindow) {
    const rest = complementHours(bestTime, bestTime.bestWindow);
    const label = windowLabel(bestTime.bestWindow.startHour, bestTime.bestWindow.endHour);
    const sentence = pairSentence(
      {
        subject: `Posts from ${label}`,
        object: `posts from ${label}`,
        posts: bestTime.bestWindow.posts,
        avg: bestTime.bestWindow.avgEngagement,
      },
      { subject: 'Other hours', object: 'other hours', posts: rest.posts, avg: rest.avg },
      scope,
    );
    if (sentence) windowSentence = sentence;
  }

  const captionSentence = sentenceFromPair(
    captions.byLength.map((bucket) => {
      const copy = LENGTH_COPY[bucket.bucket];
      return { subject: copy.subject, object: copy.object, posts: bucket.posts, avg: bucket.avgEngagement };
    }),
    scope,
    NOT_ENOUGH.caption,
  );

  const platformSentence =
    pairSentence(
      {
        subject: '{{facebook}} posts',
        object: '{{facebook}} posts',
        posts: facebook.included ? facebook.posts : 0,
        avg: facebook.included ? facebook.avg : null,
      },
      {
        subject: '{{instagram}} posts',
        object: '{{instagram}} posts',
        posts: instagram.included ? instagram.posts : 0,
        avg: instagram.included ? instagram.avg : null,
      },
      periodPhrase(filters.days),
    ) ?? NOT_ENOUGH.platform;

  return [typeSentence, weekdaySentence, windowSentence, captionSentence, platformSentence];
}

function bestByAvg<B extends string>(buckets: BucketStat<B>[]): BucketStat<B> | null {
  let best: BucketStat<B> | null = null;
  for (const bucket of buckets) {
    if (bucket.avgEngagement === null) continue;
    if (
      !best ||
      best.avgEngagement === null ||
      bucket.avgEngagement > best.avgEngagement ||
      (bucket.avgEngagement === best.avgEngagement && bucket.posts > best.posts)
    ) {
      best = bucket;
    }
  }
  return best;
}

interface InsightsData {
  contentTypes: ContentTypeStat[];
  bestTime: BestTimeStats;
  captions: CaptionStats;
  facebook: PlatformTotal;
  instagram: PlatformTotal;
}

async function loadInsights(filters: Filters): Promise<InsightsData> {
  const wantFacebook = filters.platform !== 'instagram';
  const wantInstagram = filters.platform !== 'facebook';
  const [contentTypes, bestTime, captions, facebookTrend, instagramTrend] = await Promise.all([
    getContentTypeStats(filters),
    getBestTimeStats(filters),
    getCaptionStats(filters),
    wantFacebook ? getTrend({ ...filters, platform: 'facebook' }) : Promise.resolve([]),
    wantInstagram ? getTrend({ ...filters, platform: 'instagram' }) : Promise.resolve([]),
  ]);

  return {
    contentTypes,
    bestTime,
    captions,
    facebook: { included: wantFacebook, ...trendTotals(facebookTrend) },
    instagram: { included: wantInstagram, ...trendTotals(instagramTrend) },
  };
}

function SectionHeading({ id, title, description }: { id: string; title: string; description: string }) {
  return (
    <div className="min-w-0">
      <h2 id={id} className="font-heading text-base leading-snug font-semibold tracking-tight">
        {title}
      </h2>
      <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}

function InsightsView({ filters, data }: { filters: Filters; data: InsightsData }) {
  const { contentTypes, bestTime, captions, facebook, instagram } = data;
  const hasPosts = bestTime.totalPosts > 0 || facebook.posts > 0 || instagram.posts > 0;

  if (!hasPosts) {
    return (
      <EmptyState
        icon={Lightbulb}
        hint="No posts in this period. Click Sync to fetch data, or widen the date range."
        className="min-h-80"
      />
    );
  }

  const bestType = contentTypes.find((stat) => stat.avgEngagement !== null) ?? null;
  const bestDay = bestTime.bestWeekday === null ? null : bestTime.byWeekday[bestTime.bestWeekday];
  const bestCaption = bestByAvg(captions.byLength);
  const bestHashtags = bestByAvg(captions.byHashtags);
  const typePosts = contentTypes.reduce((sum, stat) => sum + stat.posts, 0);
  const captionPosts = captions.byLength.reduce((sum, bucket) => sum + bucket.posts, 0);

  const typeBars: ContentTypeBar[] = contentTypes
    .filter((stat): stat is ContentTypeStat & { avgEngagement: number } => stat.avgEngagement !== null)
    .map((stat) => ({
      label: typeCopy(stat.contentType).axis,
      posts: stat.posts,
      avgEngagement: stat.avgEngagement,
    }));

  const typeRows: ContentTypeRow[] = contentTypes.map((stat) => ({
    key: stat.contentType,
    label: typeCopy(stat.contentType).axis,
    posts: stat.posts,
    avgLikes: stat.avgLikes,
    avgComments: stat.avgComments,
  }));

  const lengthBars: BucketBar[] = captions.byLength.map((bucket) => ({
    label: LENGTH_COPY[bucket.bucket].axis,
    posts: bucket.posts,
    avgEngagement: bucket.avgEngagement,
  }));

  const hashtagBars: BucketBar[] = captions.byHashtags.map((bucket) => ({
    label: HASHTAG_AXIS[bucket.bucket] ?? bucket.bucket,
    posts: bucket.posts,
    avgEngagement: bucket.avgEngagement,
  }));

  const summary = buildSummary(filters, contentTypes, bestTime, captions, facebook, instagram);
  const emptyHint = 'No posts in this period. Click Sync to fetch data, or widen the date range.';

  return (
    <>
      <section aria-labelledby="what-works-heading" className="flex flex-col gap-3">
        <SectionHeading
          id="what-works-heading"
          title="What works best"
          description="Highest average engagement in this filter."
        />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <WinnerCard
            label="Best content type"
            icon={LayoutGrid}
            winner={bestType ? typeCopy(bestType.contentType).axis : null}
            avg={bestType?.avgEngagement ?? null}
            posts={bestType?.posts ?? 0}
          />
          <WinnerCard
            label="Best weekday"
            icon={CalendarDays}
            winner={bestDay ? (WEEKDAY_NAME[bestDay.weekday] ?? null) : null}
            avg={bestDay?.avgEngagement ?? null}
            posts={bestDay?.posts ?? 0}
          />
          <WinnerCard
            label="Best 3-hour window"
            icon={Clock}
            winner={
              bestTime.bestWindow
                ? windowLabel(bestTime.bestWindow.startHour, bestTime.bestWindow.endHour)
                : null
            }
            avg={bestTime.bestWindow?.avgEngagement ?? null}
            posts={bestTime.bestWindow?.posts ?? 0}
          />
          <WinnerCard
            label="Best caption length"
            icon={AlignLeft}
            winner={bestCaption ? LENGTH_COPY[bestCaption.bucket].axis : null}
            detail={bestCaption ? LENGTH_COPY[bestCaption.bucket].detail : undefined}
            avg={bestCaption?.avgEngagement ?? null}
            posts={bestCaption?.posts ?? 0}
          />
        </div>
      </section>

      <ChartCard
        title="Content type"
        description="Average engagement per type."
        action={typePosts > 0 ? <LowDataPill count={typePosts} /> : undefined}
      >
        {contentTypes.length === 0 ? (
          <EmptyState icon={Lightbulb} hint={emptyHint} />
        ) : (
          <div className="grid items-start gap-4 lg:grid-cols-5">
            <div className="min-w-0 lg:col-span-3">
              {typeBars.length > 0 ? (
                <ContentTypeBarChart
                  data={typeBars}
                  highlight={bestType ? typeCopy(bestType.contentType).axis : undefined}
                />
              ) : (
                <p className="text-sm text-muted-foreground">No engagement metrics yet for these posts.</p>
              )}
            </div>
            <ContentTypeTable
              rows={typeRows}
              highlight={bestType?.contentType}
              className="lg:col-span-2"
            />
          </div>
        )}
      </ChartCard>

      <ChartCard
        title="Best time"
        description={`Average engagement by weekday and hour (${appTimezone()}). Hover a cell for the post count and average.`}
        action={bestTime.totalPosts > 0 ? <LowDataPill count={bestTime.totalPosts} /> : undefined}
      >
        {bestTime.totalPosts === 0 ? (
          <EmptyState icon={Lightbulb} hint={emptyHint} />
        ) : (
          <BestTimeHeatmap cells={bestTime.cells} />
        )}
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Caption length"
          description="None, short (under 80 characters), medium (80–200), long (over 200)."
          action={captionPosts > 0 ? <LowDataPill count={captionPosts} /> : undefined}
        >
          {captionPosts === 0 ? (
            <EmptyState icon={Lightbulb} hint={emptyHint} />
          ) : (
            <BucketBarChart
              data={lengthBars}
              highlight={bestCaption ? LENGTH_COPY[bestCaption.bucket].axis : undefined}
            />
          )}
        </ChartCard>
        <ChartCard
          title="Hashtags"
          description="Average engagement by the number of hashtags in the caption."
          action={captionPosts > 0 ? <LowDataPill count={captionPosts} /> : undefined}
        >
          {captionPosts === 0 ? (
            <EmptyState icon={Lightbulb} hint={emptyHint} />
          ) : (
            <BucketBarChart
              data={hashtagBars}
              highlight={bestHashtags ? (HASHTAG_AXIS[bestHashtags.bucket] ?? bestHashtags.bucket) : undefined}
            />
          )}
        </ChartCard>
      </div>

      <section aria-labelledby="platform-compare-heading" className="flex flex-col gap-3">
        <SectionHeading
          id="platform-compare-heading"
          title="Platform comparison"
          description="Average engagement and posts in the selected date range. Engagement formulas differ; hover the info icon."
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <PlatformCard platform="facebook" included={facebook.included} posts={facebook.posts} avg={facebook.avg} />
          <PlatformCard platform="instagram" included={instagram.included} posts={instagram.posts} avg={instagram.avg} />
        </div>
      </section>

      <SummaryCallout
        sentences={summary}
        description="Plain-language read of these comparisons. A comparison is included only when both groups have at least 5 posts."
      />
    </>
  );
}

async function InsightsContent({ filters }: { filters: Filters }) {
  let data: InsightsData;
  try {
    data = await loadInsights(filters);
  } catch {
    return (
      <ErrorState
        title="Insights unavailable"
        message="Insights could not be loaded. Try refreshing the page."
      />
    );
  }
  return <InsightsView filters={filters} data={data} />;
}

export default async function InsightsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const filters = normalizeFilters({ platform: first(sp.platform), days: first(sp.days) });

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <InsightsPageHeader />
      <Suspense key={`${filters.platform}-${filters.days}`} fallback={<InsightsSkeleton />}>
        <InsightsContent filters={filters} />
      </Suspense>
    </div>
  );
}
