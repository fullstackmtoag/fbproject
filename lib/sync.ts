import 'server-only';
import type { PoolClient } from 'pg';
import { pool, query } from './db';
import {
  getFbPage,
  getFbPosts,
  getIgAccountInsights,
  getIgAudience,
  getIgDailySeries,
  getIgMedia,
  getIgMediaInsights,
  getIgProfile,
  type AudienceSlice,
  type ContentType,
  type IgAudienceBreakdown,
} from './meta';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface SyncCounts {
  account: boolean;
  posts: number;
  postMetrics: number;
  accountMetrics: number;
  audience: number;
}

export interface SyncResult {
  synced: SyncCounts;
  warnings: string[];
}

export type SyncStatus = 'ok' | 'partial' | 'failed';

export type PlatformOutcome = SyncResult | { error: string };

export interface SyncAllResult {
  runId: number;
  status: SyncStatus;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  facebook: PlatformOutcome;
  instagram: PlatformOutcome;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;
const SNAPSHOT_MAX_AGE_MS = 6 * 60 * 60 * 1000;
const IG_INSIGHTS_LIMIT = 30;
const IG_INSIGHTS_CONCURRENCY = 3;
const ACCOUNT_METRICS_DAYS = 30;
const AUDIENCE_BREAKDOWNS: IgAudienceBreakdown[] = ['age', 'gender', 'city', 'country'];

// ---------------------------------------------------------------------------
// Generic helpers
// ---------------------------------------------------------------------------

/** Today's calendar date (YYYY-MM-DD) in APP_TIMEZONE. */
function todayInAppTimezone(): string {
  const timeZone = process.env.APP_TIMEZONE || 'Asia/Kolkata';
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Unknown error';
}

async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Connection is already broken; nothing more to do.
    }
    throw err;
  } finally {
    client.release();
  }
}

/** Run `fn` over `items` with at most `limit` in flight; preserves order. */
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

/** Sum where the result is NULL only if every "core" input is NULL. */
function sumEngagement(core: (number | null)[], extras: (number | null)[]): number | null {
  if (core.every((v) => v === null)) return null;
  return [...core, ...extras].reduce<number>((acc, v) => acc + (v ?? 0), 0);
}

// ---------------------------------------------------------------------------
// DB write helpers (all take a transaction client)
// ---------------------------------------------------------------------------

interface PostRow {
  id: string;
  platform: 'facebook' | 'instagram';
  accountId: string;
  content: string | null;
  contentType: ContentType;
  permalink: string | null;
  thumbnailUrl: string | null;
  createdTime: string;
  raw: unknown;
}

async function upsertPost(client: PoolClient, post: PostRow): Promise<void> {
  await client.query(
    `INSERT INTO posts
       (id, platform, account_id, content, content_type, permalink, thumbnail_url, created_time, raw)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
     ON CONFLICT (id) DO UPDATE SET
       platform      = EXCLUDED.platform,
       account_id    = EXCLUDED.account_id,
       content       = EXCLUDED.content,
       content_type  = EXCLUDED.content_type,
       permalink     = EXCLUDED.permalink,
       thumbnail_url = EXCLUDED.thumbnail_url,
       created_time  = EXCLUDED.created_time,
       raw           = EXCLUDED.raw`,
    [
      post.id,
      post.platform,
      post.accountId,
      post.content,
      post.contentType,
      post.permalink,
      post.thumbnailUrl,
      post.createdTime,
      JSON.stringify(post.raw),
    ],
  );
}

interface MetricSnapshot {
  reactions: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  reach: number | null;
  views: number | null;
}

interface LatestSnapshotRow extends MetricSnapshot {
  post_id: string;
  fetched_at: Date;
}

interface PendingMetrics {
  postId: string;
  metrics: MetricSnapshot;
  engagement: number | null;
}

const METRIC_KEYS: (keyof MetricSnapshot)[] = [
  'reactions',
  'comments',
  'shares',
  'saves',
  'reach',
  'views',
];

async function fetchLatestSnapshots(
  client: PoolClient,
  postIds: string[],
): Promise<Map<string, LatestSnapshotRow>> {
  if (postIds.length === 0) return new Map();
  const { rows } = await client.query<LatestSnapshotRow>(
    `SELECT DISTINCT ON (post_id)
       post_id, fetched_at, reactions, comments, shares, saves, reach, views
     FROM post_metrics
     WHERE post_id = ANY($1::text[])
     ORDER BY post_id, fetched_at DESC`,
    [postIds],
  );
  return new Map(rows.map((row) => [row.post_id, row]));
}

function hasChanged(prev: MetricSnapshot, next: MetricSnapshot): boolean {
  return METRIC_KEYS.some((key) => prev[key] !== next[key]);
}

/**
 * Inserts a post_metrics snapshot only when the latest one is older than
 * 6 hours OR any metric value changed. Returns the number of rows inserted.
 */
async function insertPostMetrics(
  client: PoolClient,
  pending: PendingMetrics[],
  latest: Map<string, LatestSnapshotRow>,
): Promise<number> {
  const now = Date.now();
  let inserted = 0;

  for (const { postId, metrics, engagement } of pending) {
    const prev = latest.get(postId);
    const isFresh = prev !== undefined && now - prev.fetched_at.getTime() < SNAPSHOT_MAX_AGE_MS;
    if (prev && isFresh && !hasChanged(prev, metrics)) continue;

    await client.query(
      `INSERT INTO post_metrics
         (post_id, reactions, comments, shares, saves, reach, views, engagement)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        postId,
        metrics.reactions,
        metrics.comments,
        metrics.shares,
        metrics.saves,
        metrics.reach,
        metrics.views,
        engagement,
      ],
    );
    inserted += 1;
  }
  return inserted;
}

interface AccountMetricsRow {
  accountId: string;
  date: string; // YYYY-MM-DD
  followers?: number | null;
  following?: number | null;
  mediaCount?: number | null;
  reach?: number | null;
  views?: number | null;
  accountsEngaged?: number | null;
  totalInteractions?: number | null;
}

/** Upsert one account_metrics day; NULL inputs never overwrite existing values. */
async function upsertAccountMetrics(client: PoolClient, row: AccountMetricsRow): Promise<void> {
  await client.query(
    `INSERT INTO account_metrics
       (account_id, date, followers, following, media_count, reach, views,
        accounts_engaged, total_interactions)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (account_id, date) DO UPDATE SET
       followers          = COALESCE(EXCLUDED.followers, account_metrics.followers),
       following          = COALESCE(EXCLUDED.following, account_metrics.following),
       media_count        = COALESCE(EXCLUDED.media_count, account_metrics.media_count),
       reach              = COALESCE(EXCLUDED.reach, account_metrics.reach),
       views              = COALESCE(EXCLUDED.views, account_metrics.views),
       accounts_engaged   = COALESCE(EXCLUDED.accounts_engaged, account_metrics.accounts_engaged),
       total_interactions = COALESCE(EXCLUDED.total_interactions, account_metrics.total_interactions)`,
    [
      row.accountId,
      row.date,
      row.followers ?? null,
      row.following ?? null,
      row.mediaCount ?? null,
      row.reach ?? null,
      row.views ?? null,
      row.accountsEngaged ?? null,
      row.totalInteractions ?? null,
    ],
  );
}

async function replaceAudience(
  client: PoolClient,
  accountId: string,
  breakdown: IgAudienceBreakdown,
  slices: AudienceSlice[],
): Promise<void> {
  await client.query('DELETE FROM audience WHERE account_id = $1 AND breakdown = $2', [
    accountId,
    breakdown,
  ]);
  for (const slice of slices) {
    await client.query(
      `INSERT INTO audience (account_id, breakdown, label, value, fetched_at)
       VALUES ($1, $2, $3, $4, now())
       ON CONFLICT (account_id, breakdown, label) DO UPDATE SET
         value = EXCLUDED.value, fetched_at = now()`,
      [accountId, breakdown, slice.label, slice.value],
    );
  }
}

// ---------------------------------------------------------------------------
// Facebook
// ---------------------------------------------------------------------------

export async function syncFacebook(): Promise<SyncResult> {
  const warnings: string[] = [];

  // All network calls happen before the transaction so we never hold a DB
  // connection open while waiting on Meta.
  const page = await getFbPage();
  const posts = await getFbPosts();
  const today = todayInAppTimezone();

  if (page.followers === null) warnings.push('Facebook follower count unavailable');

  const synced = await withTransaction<SyncCounts>(async (client) => {
    await client.query(
      `INSERT INTO accounts (id, platform, name, followers, picture_url, updated_at)
       VALUES ($1, 'facebook', $2, $3, $4, now())
       ON CONFLICT (id) DO UPDATE SET
         platform    = 'facebook',
         name        = EXCLUDED.name,
         followers   = EXCLUDED.followers,
         picture_url = EXCLUDED.picture_url,
         updated_at  = now()`,
      [page.id, page.name, page.followers, page.pictureUrl],
    );

    for (const post of posts) {
      await upsertPost(client, {
        id: post.id,
        platform: 'facebook',
        accountId: page.id,
        content: post.content,
        contentType: post.contentType,
        permalink: post.permalink,
        thumbnailUrl: post.thumbnailUrl,
        createdTime: post.createdTime,
        raw: post.raw,
      });
    }

    const pending: PendingMetrics[] = posts.map((post) => ({
      postId: post.id,
      metrics: {
        reactions: post.reactions,
        comments: post.comments,
        shares: post.shares,
        saves: null,
        reach: null,
        views: null,
      },
      // Facebook engagement = reactions + comments + shares
      engagement: sumEngagement([post.reactions, post.comments], [post.shares]),
    }));
    const latest = await fetchLatestSnapshots(
      client,
      posts.map((p) => p.id),
    );
    const postMetrics = await insertPostMetrics(client, pending, latest);

    await upsertAccountMetrics(client, {
      accountId: page.id,
      date: today,
      followers: page.followers,
    });

    return { account: true, posts: posts.length, postMetrics, accountMetrics: 1, audience: 0 };
  });

  return { synced, warnings };
}

// ---------------------------------------------------------------------------
// Instagram
// ---------------------------------------------------------------------------

export async function syncInstagram(): Promise<SyncResult> {
  const warnings: string[] = [];
  const now = new Date();
  const today = todayInAppTimezone();

  // ---- Network phase (no DB connection held) ----------------------------
  const profile = await getIgProfile();
  const media = await getIgMedia();

  // Insights only for the latest 30 posts, max 3 requests in flight.
  const recent = [...media]
    .sort((a, b) => Date.parse(b.createdTime) - Date.parse(a.createdTime))
    .slice(0, IG_INSIGHTS_LIMIT);
  const recentInsights = await mapLimit(recent, IG_INSIGHTS_CONCURRENCY, (m) =>
    getIgMediaInsights(m.id),
  );
  const insightsById = new Map(recent.map((m, i) => [m.id, recentInsights[i]]));
  const missingInsights = recentInsights.filter(
    (i) => i.reach === null && i.saves === null && i.shares === null && i.views === null,
  ).length;
  if (missingInsights > 0) {
    warnings.push(
      `Instagram media insights unavailable for ${missingInsights} of ${recent.length} recent posts`,
    );
  }

  const since = new Date(now.getTime() - ACCOUNT_METRICS_DAYS * DAY_MS);
  const reachSeries = await getIgDailySeries('reach', since, now);
  if (reachSeries.length === 0) {
    warnings.push('Instagram daily reach series unavailable');
  }

  // Account-level totals for the last 24h, stored on today's row.
  const accountInsights = await getIgAccountInsights(new Date(now.getTime() - DAY_MS), now);
  if (
    accountInsights.reach === null &&
    accountInsights.views === null &&
    accountInsights.accountsEngaged === null &&
    accountInsights.totalInteractions === null
  ) {
    warnings.push('Instagram account insights unavailable');
  }

  const audience = await Promise.all(
    AUDIENCE_BREAKDOWNS.map(async (breakdown) => ({
      breakdown,
      slices: await getIgAudience(breakdown),
    })),
  );
  for (const { breakdown, slices } of audience) {
    if (slices.length === 0) {
      warnings.push(
        `Instagram audience '${breakdown}' empty (needs 100+ followers); existing rows kept`,
      );
    }
  }

  // ---- DB phase (single transaction) ------------------------------------
  const synced = await withTransaction<SyncCounts>(async (client) => {
    await client.query(
      `INSERT INTO accounts
         (id, platform, name, username, followers, following, media_count, picture_url, updated_at)
       VALUES ($1, 'instagram', $2, $3, $4, $5, $6, $7, now())
       ON CONFLICT (id) DO UPDATE SET
         platform    = 'instagram',
         name        = EXCLUDED.name,
         username    = EXCLUDED.username,
         followers   = EXCLUDED.followers,
         following   = EXCLUDED.following,
         media_count = EXCLUDED.media_count,
         picture_url = EXCLUDED.picture_url,
         updated_at  = now()`,
      [
        profile.id,
        profile.name,
        profile.username,
        profile.followers,
        profile.follows,
        profile.mediaCount,
        profile.pictureUrl,
      ],
    );

    for (const item of media) {
      await upsertPost(client, {
        id: item.id,
        platform: 'instagram',
        accountId: profile.id,
        content: item.content,
        contentType: item.contentType,
        permalink: item.permalink,
        thumbnailUrl: item.thumbnailUrl,
        createdTime: item.createdTime,
        raw: item.raw,
      });
    }

    const latest = await fetchLatestSnapshots(
      client,
      media.map((m) => m.id),
    );

    const pending: PendingMetrics[] = media.map((item) => {
      const fresh = insightsById.get(item.id);
      const prev = latest.get(item.id);
      // Posts outside the latest 30 are not re-queried for insights; carry
      // forward the last known values instead of overwriting them with NULL.
      const saves = fresh ? fresh.saves : (prev?.saves ?? null);
      const shares = fresh ? fresh.shares : (prev?.shares ?? null);
      const reach = fresh ? fresh.reach : (prev?.reach ?? null);
      const views = fresh ? fresh.views : (prev?.views ?? null);
      return {
        postId: item.id,
        metrics: { reactions: item.likes, comments: item.comments, shares, saves, reach, views },
        // Instagram engagement = likes + comments + COALESCE(saves,0) + COALESCE(shares,0)
        engagement: sumEngagement([item.likes, item.comments], [saves, shares]),
      };
    });
    const postMetrics = await insertPostMetrics(client, pending, latest);

    let accountMetrics = 0;
    for (const point of reachSeries) {
      await upsertAccountMetrics(client, {
        accountId: profile.id,
        date: point.date,
        reach: point.value,
      });
      accountMetrics += 1;
    }

    const seriesHasToday = reachSeries.some((p) => p.date === today);
    await upsertAccountMetrics(client, {
      accountId: profile.id,
      date: today,
      followers: profile.followers,
      following: profile.follows,
      mediaCount: profile.mediaCount,
      reach: seriesHasToday ? null : accountInsights.reach,
      views: accountInsights.views,
      accountsEngaged: accountInsights.accountsEngaged,
      totalInteractions: accountInsights.totalInteractions,
    });
    accountMetrics += 1;

    let audienceRows = 0;
    for (const { breakdown, slices } of audience) {
      // Empty means "no data" OR "API error"; either way, keep what we have.
      if (slices.length === 0) continue;
      await replaceAudience(client, profile.id, breakdown, slices);
      audienceRows += slices.length;
    }

    return {
      account: true,
      posts: media.length,
      postMetrics,
      accountMetrics,
      audience: audienceRows,
    };
  });

  return { synced, warnings };
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

function settle(result: PromiseSettledResult<SyncResult>): PlatformOutcome {
  return result.status === 'fulfilled'
    ? result.value
    : { error: errorMessage(result.reason) };
}

export async function syncAll(): Promise<SyncAllResult> {
  const startedAt = new Date();
  const [run] = await query<{ id: string }>(
    `INSERT INTO sync_runs (started_at, status) VALUES ($1, 'running') RETURNING id`,
    [startedAt],
  );
  const runId = Number(run.id);

  // Both platforms run independently; one failing never stops the other.
  const [fb, ig] = await Promise.allSettled([syncFacebook(), syncInstagram()]);
  const facebook = settle(fb);
  const instagram = settle(ig);

  const failures = [facebook, instagram].filter((r) => 'error' in r).length;
  const status: SyncStatus = failures === 0 ? 'ok' : failures === 2 ? 'failed' : 'partial';

  const finishedAt = new Date();
  const durationMs = finishedAt.getTime() - startedAt.getTime();
  const details = { facebook, instagram, durationMs };

  await query(
    `UPDATE sync_runs SET status = $2, finished_at = $3, details = $4::jsonb WHERE id = $1`,
    [runId, status, finishedAt, JSON.stringify(details)],
  );

  return {
    runId,
    status,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs,
    facebook,
    instagram,
  };
}
