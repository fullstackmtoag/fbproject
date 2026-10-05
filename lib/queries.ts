import 'server-only';
import { query } from './db';

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

export type Platform = 'all' | 'facebook' | 'instagram';
export type SinglePlatform = Exclude<Platform, 'all'>;
export type Days = 7 | 30 | 90 | 365 | 0; // 0 = all time

export interface Filters {
  platform: Platform;
  days: Days;
}

export const PLATFORMS: Platform[] = ['all', 'facebook', 'instagram'];
export const DAYS_OPTIONS: Days[] = [7, 30, 90, 365, 0];

export const DEFAULT_FILTERS: Filters = { platform: 'all', days: 30 };

/** Coerce untrusted input (e.g. URL search params) into valid filters. */
export function normalizeFilters(input?: {
  platform?: string | null;
  days?: string | number | null;
}): Filters {
  const platform = PLATFORMS.find((p) => p === input?.platform) ?? DEFAULT_FILTERS.platform;
  const daysNum = input?.days === undefined || input.days === null ? NaN : Number(input.days);
  const days = DAYS_OPTIONS.find((d) => d === daysNum) ?? DEFAULT_FILTERS.days;
  return { platform, days };
}

function appTimezone(): string {
  return process.env.APP_TIMEZONE || 'Asia/Kolkata';
}

/** Params for every filtered query: $1 platform (or NULL), $2 days. */
function filterParams(filters: Filters): [string | null, number] {
  return [filters.platform === 'all' ? null : filters.platform, filters.days];
}

/** Same plus $3 timezone; only for queries that use LOCAL_TIME (pg rejects unused params). */
function filterParamsTz(filters: Filters): [string | null, number, string] {
  return [...filterParams(filters), appTimezone()];
}

// Current period: last N days (or everything when $2 = 0).
const WHERE_CURRENT = `
  ($1::text IS NULL OR p.platform = $1::text)
  AND ($2::int = 0 OR p.created_time >= now() - make_interval(days => $2::int))`;

// Previous period of equal length: [now - 2N days, now - N days).
const WHERE_PREVIOUS = `
  ($1::text IS NULL OR p.platform = $1::text)
  AND $2::int > 0
  AND p.created_time >= now() - make_interval(days => 2 * $2::int)
  AND p.created_time <  now() - make_interval(days => $2::int)`;

// Latest post_metrics snapshot per post.
const LATEST_CTE = `
  latest AS (
    SELECT DISTINCT ON (post_id)
      post_id, fetched_at, reactions, comments, shares, saves, reach, views, engagement
    FROM post_metrics
    ORDER BY post_id, fetched_at DESC
  )`;

// Post timestamp converted to the app timezone (timestamp without tz).
const LOCAL_TIME = `(p.created_time AT TIME ZONE $3::text)`;

// ---------------------------------------------------------------------------
// Accounts & sync
// ---------------------------------------------------------------------------

export interface Account {
  id: string;
  platform: SinglePlatform;
  name: string | null;
  username: string | null;
  followers: number | null;
  following: number | null;
  mediaCount: number | null;
  pictureUrl: string | null;
  updatedAt: string | null;
}

interface AccountRow {
  id: string;
  platform: SinglePlatform;
  name: string | null;
  username: string | null;
  followers: number | null;
  following: number | null;
  media_count: number | null;
  picture_url: string | null;
  updated_at: Date | null;
}

export async function getAccounts(): Promise<Account[]> {
  const rows = await query<AccountRow>(
    `SELECT id, platform, name, username, followers, following, media_count, picture_url, updated_at
     FROM accounts
     ORDER BY platform`,
  );
  return rows.map((r) => ({
    id: r.id,
    platform: r.platform,
    name: r.name,
    username: r.username,
    followers: r.followers,
    following: r.following,
    mediaCount: r.media_count,
    pictureUrl: r.picture_url,
    updatedAt: r.updated_at?.toISOString() ?? null,
  }));
}

export interface SyncRun {
  id: number;
  startedAt: string;
  finishedAt: string | null;
  status: string | null;
  details: unknown;
}

interface SyncRunRow {
  id: string;
  started_at: Date;
  finished_at: Date | null;
  status: string | null;
  details: unknown;
}

export async function getLastSync(): Promise<SyncRun | null> {
  const [row] = await query<SyncRunRow>(
    `SELECT id, started_at, finished_at, status, details
     FROM sync_runs
     ORDER BY started_at DESC, id DESC
     LIMIT 1`,
  );
  if (!row) return null;
  return {
    id: Number(row.id),
    startedAt: row.started_at.toISOString(),
    finishedAt: row.finished_at?.toISOString() ?? null,
    status: row.status,
    details: row.details,
  };
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

export interface OverviewStats {
  totalPosts: number;
  totalEngagement: number;
  avgEngagement: number | null;
  totalReactions: number;
  totalComments: number;
  totalShares: number;
  totalSaves: number | null;
  totalReach: number | null;
}

export interface Overview {
  current: OverviewStats;
  /** NULL when days = 0 (all time has no "previous period"). */
  previous: OverviewStats | null;
  /** Percent change vs previous period; NULL when not computable. */
  change: Record<keyof OverviewStats, number | null>;
}

interface OverviewRow {
  total_posts: number;
  total_engagement: number;
  avg_engagement: number | null;
  total_reactions: number;
  total_comments: number;
  total_shares: number;
  total_saves: number | null;
  total_reach: number | null;
}

const OVERVIEW_SELECT = `
  SELECT
    COUNT(*)::int                       AS total_posts,
    COALESCE(SUM(m.engagement), 0)::int AS total_engagement,
    AVG(m.engagement)::float            AS avg_engagement,
    COALESCE(SUM(m.reactions), 0)::int  AS total_reactions,
    COALESCE(SUM(m.comments), 0)::int   AS total_comments,
    COALESCE(SUM(m.shares), 0)::int     AS total_shares,
    SUM(m.saves)::int                   AS total_saves,
    SUM(m.reach)::int                   AS total_reach
  FROM posts p
  LEFT JOIN latest m ON m.post_id = p.id`;

function toOverviewStats(r: OverviewRow): OverviewStats {
  return {
    totalPosts: r.total_posts,
    totalEngagement: r.total_engagement,
    avgEngagement: r.avg_engagement,
    totalReactions: r.total_reactions,
    totalComments: r.total_comments,
    totalShares: r.total_shares,
    totalSaves: r.total_saves,
    totalReach: r.total_reach,
  };
}

function pctChange(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export async function getOverview(filters: Filters): Promise<Overview> {
  const params = filterParams(filters);

  const [currentRow] = await query<OverviewRow>(
    `WITH ${LATEST_CTE} ${OVERVIEW_SELECT} WHERE ${WHERE_CURRENT}`,
    params,
  );
  const current = toOverviewStats(currentRow);

  let previous: OverviewStats | null = null;
  if (filters.days > 0) {
    const [previousRow] = await query<OverviewRow>(
      `WITH ${LATEST_CTE} ${OVERVIEW_SELECT} WHERE ${WHERE_PREVIOUS}`,
      params,
    );
    previous = toOverviewStats(previousRow);
  }

  const keys = Object.keys(current) as (keyof OverviewStats)[];
  const change = Object.fromEntries(
    keys.map((key) => [key, pctChange(current[key], previous ? previous[key] : null)]),
  ) as Record<keyof OverviewStats, number | null>;

  return { current, previous, change };
}

// ---------------------------------------------------------------------------
// Trend
// ---------------------------------------------------------------------------

export interface TrendPoint {
  date: string; // YYYY-MM-DD in APP_TIMEZONE
  posts: number;
  engagement: number;
}

interface TrendRow {
  date: string;
  posts: number;
  engagement: number;
}

export async function getTrend(filters: Filters): Promise<TrendPoint[]> {
  return query<TrendRow>(
    `WITH ${LATEST_CTE}
     SELECT
       to_char(${LOCAL_TIME}::date, 'YYYY-MM-DD') AS date,
       COUNT(*)::int                               AS posts,
       COALESCE(SUM(m.engagement), 0)::int         AS engagement
     FROM posts p
     LEFT JOIN latest m ON m.post_id = p.id
     WHERE ${WHERE_CURRENT}
     GROUP BY 1
     ORDER BY 1`,
    filterParamsTz(filters),
  );
}

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------

export interface PostWithMetrics {
  id: string;
  platform: SinglePlatform;
  accountId: string | null;
  content: string | null;
  contentType: string | null;
  permalink: string | null;
  thumbnailUrl: string | null;
  createdTime: string;
  reactions: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  reach: number | null;
  views: number | null;
  engagement: number | null;
  metricsFetchedAt: string | null;
}

interface PostRow {
  id: string;
  platform: SinglePlatform;
  account_id: string | null;
  content: string | null;
  content_type: string | null;
  permalink: string | null;
  thumbnail_url: string | null;
  created_time: Date;
  reactions: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  reach: number | null;
  views: number | null;
  engagement: number | null;
  metrics_fetched_at: Date | null;
}

const POSTS_SELECT = `
  SELECT
    p.id, p.platform, p.account_id, p.content, p.content_type, p.permalink,
    p.thumbnail_url, p.created_time,
    m.reactions, m.comments, m.shares, m.saves, m.reach, m.views, m.engagement,
    m.fetched_at AS metrics_fetched_at
  FROM posts p
  LEFT JOIN latest m ON m.post_id = p.id`;

function toPost(r: PostRow): PostWithMetrics {
  return {
    id: r.id,
    platform: r.platform,
    accountId: r.account_id,
    content: r.content,
    contentType: r.content_type,
    permalink: r.permalink,
    thumbnailUrl: r.thumbnail_url,
    createdTime: r.created_time.toISOString(),
    reactions: r.reactions,
    comments: r.comments,
    shares: r.shares,
    saves: r.saves,
    reach: r.reach,
    views: r.views,
    engagement: r.engagement,
    metricsFetchedAt: r.metrics_fetched_at?.toISOString() ?? null,
  };
}

export async function getTopPosts(filters: Filters, limit = 10): Promise<PostWithMetrics[]> {
  const rows = await query<PostRow>(
    `WITH ${LATEST_CTE} ${POSTS_SELECT}
     WHERE ${WHERE_CURRENT}
     ORDER BY m.engagement DESC NULLS LAST, p.created_time DESC
     LIMIT $3::int`,
    [...filterParams(filters), limit],
  );
  return rows.map(toPost);
}

export async function getPosts(filters: Filters): Promise<PostWithMetrics[]> {
  const rows = await query<PostRow>(
    `WITH ${LATEST_CTE} ${POSTS_SELECT}
     WHERE ${WHERE_CURRENT}
     ORDER BY p.created_time DESC`,
    filterParams(filters),
  );
  return rows.map(toPost);
}

// ---------------------------------------------------------------------------
// Content type
// ---------------------------------------------------------------------------

export interface ContentTypeStat {
  contentType: string;
  posts: number;
  avgEngagement: number | null;
  avgLikes: number | null;
  avgComments: number | null;
}

interface ContentTypeRow {
  content_type: string;
  posts: number;
  avg_engagement: number | null;
  avg_likes: number | null;
  avg_comments: number | null;
}

export async function getContentTypeStats(filters: Filters): Promise<ContentTypeStat[]> {
  const rows = await query<ContentTypeRow>(
    `WITH ${LATEST_CTE}
     SELECT
       COALESCE(p.content_type, 'other') AS content_type,
       COUNT(*)::int                     AS posts,
       AVG(m.engagement)::float          AS avg_engagement,
       AVG(m.reactions)::float           AS avg_likes,
       AVG(m.comments)::float            AS avg_comments
     FROM posts p
     LEFT JOIN latest m ON m.post_id = p.id
     WHERE ${WHERE_CURRENT}
     GROUP BY 1
     ORDER BY avg_engagement DESC NULLS LAST, posts DESC`,
    filterParams(filters),
  );
  return rows.map((r) => ({
    contentType: r.content_type,
    posts: r.posts,
    avgEngagement: r.avg_engagement,
    avgLikes: r.avg_likes,
    avgComments: r.avg_comments,
  }));
}

// ---------------------------------------------------------------------------
// Best time
// ---------------------------------------------------------------------------

export interface TimeBucket {
  posts: number;
  avgEngagement: number | null;
}

export interface TimeCell extends TimeBucket {
  weekday: number; // 0 = Sunday .. 6 = Saturday (in APP_TIMEZONE)
  hour: number; // 0..23 (in APP_TIMEZONE)
}

export interface BestWindow {
  /** First hour of the window (inclusive). */
  startHour: number;
  /** Hour after the window (exclusive); wraps past midnight, e.g. 22 -> 1. */
  endHour: number;
  posts: number;
  avgEngagement: number;
}

export interface BestTimeStats {
  totalPosts: number;
  /** Only non-empty weekday x hour cells. */
  cells: TimeCell[];
  /** Always 7 entries, index = weekday. */
  byWeekday: (TimeBucket & { weekday: number })[];
  /** Always 24 entries, index = hour. */
  byHour: (TimeBucket & { hour: number })[];
  bestWeekday: number | null;
  bestWindow: BestWindow | null;
}

interface TimeCellRow {
  weekday: number;
  hour: number;
  posts: number;
  eng_sum: number | null;
  eng_count: number;
}

interface Accum {
  posts: number;
  sum: number;
  count: number;
}

function avgOf(a: Accum): number | null {
  return a.count > 0 ? a.sum / a.count : null;
}

export async function getBestTimeStats(filters: Filters): Promise<BestTimeStats> {
  const rows = await query<TimeCellRow>(
    `WITH ${LATEST_CTE}
     SELECT
       EXTRACT(DOW  FROM ${LOCAL_TIME})::int AS weekday,
       EXTRACT(HOUR FROM ${LOCAL_TIME})::int AS hour,
       COUNT(*)::int                          AS posts,
       SUM(m.engagement)::int                 AS eng_sum,
       COUNT(m.engagement)::int               AS eng_count
     FROM posts p
     LEFT JOIN latest m ON m.post_id = p.id
     WHERE ${WHERE_CURRENT}
     GROUP BY 1, 2
     ORDER BY 1, 2`,
    filterParamsTz(filters),
  );

  const weekdays: Accum[] = Array.from({ length: 7 }, () => ({ posts: 0, sum: 0, count: 0 }));
  const hours: Accum[] = Array.from({ length: 24 }, () => ({ posts: 0, sum: 0, count: 0 }));
  let totalPosts = 0;

  const cells: TimeCell[] = rows.map((r) => {
    const sum = r.eng_sum ?? 0;
    totalPosts += r.posts;
    for (const acc of [weekdays[r.weekday], hours[r.hour]]) {
      acc.posts += r.posts;
      acc.sum += sum;
      acc.count += r.eng_count;
    }
    return {
      weekday: r.weekday,
      hour: r.hour,
      posts: r.posts,
      avgEngagement: r.eng_count > 0 ? sum / r.eng_count : null,
    };
  });

  let bestWeekday: number | null = null;
  let bestWeekdayAvg = -Infinity;
  weekdays.forEach((acc, weekday) => {
    const avg = avgOf(acc);
    if (avg !== null && avg > bestWeekdayAvg) {
      bestWeekdayAvg = avg;
      bestWeekday = weekday;
    }
  });

  // Best consecutive 3-hour window (wrapping past midnight), by weighted average.
  let bestWindow: BestWindow | null = null;
  for (let start = 0; start < 24; start += 1) {
    const window: Accum = { posts: 0, sum: 0, count: 0 };
    for (let offset = 0; offset < 3; offset += 1) {
      const acc = hours[(start + offset) % 24];
      window.posts += acc.posts;
      window.sum += acc.sum;
      window.count += acc.count;
    }
    const avg = avgOf(window);
    if (avg !== null && (bestWindow === null || avg > bestWindow.avgEngagement)) {
      bestWindow = {
        startHour: start,
        endHour: (start + 3) % 24,
        posts: window.posts,
        avgEngagement: avg,
      };
    }
  }

  return {
    totalPosts,
    cells,
    byWeekday: weekdays.map((acc, weekday) => ({
      weekday,
      posts: acc.posts,
      avgEngagement: avgOf(acc),
    })),
    byHour: hours.map((acc, hour) => ({ hour, posts: acc.posts, avgEngagement: avgOf(acc) })),
    bestWeekday,
    bestWindow,
  };
}

// ---------------------------------------------------------------------------
// Caption stats
// ---------------------------------------------------------------------------

export type CaptionLengthBucket = 'none' | 'short' | 'medium' | 'long';
export type HashtagBucket = '0' | '1-3' | '4-7' | '8+';

export const CAPTION_LENGTH_BUCKETS: CaptionLengthBucket[] = ['none', 'short', 'medium', 'long'];
export const HASHTAG_BUCKETS: HashtagBucket[] = ['0', '1-3', '4-7', '8+'];

export interface BucketStat<B extends string> {
  bucket: B;
  posts: number;
  avgEngagement: number | null;
}

export interface CaptionStats {
  byLength: BucketStat<CaptionLengthBucket>[]; // always 4, in CAPTION_LENGTH_BUCKETS order
  byHashtags: BucketStat<HashtagBucket>[]; // always 4, in HASHTAG_BUCKETS order
}

interface BucketRow {
  kind: 'length' | 'hashtags';
  bucket: string;
  posts: number;
  avg_engagement: number | null;
}

function fillBuckets<B extends string>(order: B[], rows: BucketRow[]): BucketStat<B>[] {
  return order.map((bucket) => {
    const row = rows.find((r) => r.bucket === bucket);
    return {
      bucket,
      posts: row?.posts ?? 0,
      avgEngagement: row?.avg_engagement ?? null,
    };
  });
}

export async function getCaptionStats(filters: Filters): Promise<CaptionStats> {
  const rows = await query<BucketRow>(
    `WITH ${LATEST_CTE},
     scored AS (
       SELECT
         CASE
           WHEN p.content IS NULL OR btrim(p.content) = '' THEN 'none'
           WHEN length(p.content) < 80                      THEN 'short'
           WHEN length(p.content) <= 200                    THEN 'medium'
           ELSE 'long'
         END AS length_bucket,
         CASE
           WHEN t.n = 0  THEN '0'
           WHEN t.n <= 3 THEN '1-3'
           WHEN t.n <= 7 THEN '4-7'
           ELSE '8+'
         END AS hashtag_bucket,
         m.engagement
       FROM posts p
       LEFT JOIN latest m ON m.post_id = p.id
       CROSS JOIN LATERAL (
         SELECT COUNT(*)::int AS n
         FROM regexp_matches(COALESCE(p.content, ''), '#\\w+', 'g')
       ) t
       WHERE ${WHERE_CURRENT}
     )
     SELECT 'length' AS kind, length_bucket AS bucket,
            COUNT(*)::int AS posts, AVG(engagement)::float AS avg_engagement
     FROM scored GROUP BY 2
     UNION ALL
     SELECT 'hashtags' AS kind, hashtag_bucket AS bucket,
            COUNT(*)::int AS posts, AVG(engagement)::float AS avg_engagement
     FROM scored GROUP BY 2`,
    filterParams(filters),
  );

  return {
    byLength: fillBuckets(
      CAPTION_LENGTH_BUCKETS,
      rows.filter((r) => r.kind === 'length'),
    ),
    byHashtags: fillBuckets(
      HASHTAG_BUCKETS,
      rows.filter((r) => r.kind === 'hashtags'),
    ),
  };
}

// ---------------------------------------------------------------------------
// Audience
// ---------------------------------------------------------------------------

export type AudienceBreakdown = 'age' | 'gender' | 'city' | 'country';

export interface AudienceSlice {
  label: string;
  value: number;
}

export type Audience = Record<AudienceBreakdown, AudienceSlice[]>;

interface AudienceRow {
  breakdown: AudienceBreakdown;
  label: string;
  value: number;
}

export async function getAudience(): Promise<Audience> {
  const rows = await query<AudienceRow>(
    `SELECT breakdown, label, value
     FROM audience
     WHERE breakdown IN ('age', 'gender', 'city', 'country')
     ORDER BY breakdown, value DESC, label`,
  );
  const audience: Audience = { age: [], gender: [], city: [], country: [] };
  for (const row of rows) {
    audience[row.breakdown].push({ label: row.label, value: row.value });
  }
  return audience;
}

// ---------------------------------------------------------------------------
// Account series
// ---------------------------------------------------------------------------

export interface AccountSeriesPoint {
  date: string; // YYYY-MM-DD
  followers: number | null;
  reach: number | null;
  views: number | null;
}

export async function getAccountSeries(
  platform: SinglePlatform,
  days: Days,
): Promise<AccountSeriesPoint[]> {
  return query<AccountSeriesPoint>(
    `SELECT
       to_char(am.date, 'YYYY-MM-DD') AS date,
       am.followers,
       am.reach,
       am.views
     FROM account_metrics am
     JOIN accounts a ON a.id = am.account_id
     WHERE a.platform = $1::text
       AND ($2::int = 0 OR am.date >= (now() AT TIME ZONE $3::text)::date - $2::int)
     ORDER BY am.date`,
    [platform, days, appTimezone()],
  );
}
