import 'server-only';

// ---------------------------------------------------------------------------
// Low-level Graph API helpers
// ---------------------------------------------------------------------------

type Params = Record<string, string | number | undefined>;

interface MetaErrorBody {
  error?: { code?: number; message?: string; error_subcode?: number };
}

interface MetaList<T> {
  data?: T[];
  paging?: { next?: string };
}

// Env is read lazily (at call time) so scripts can load .env.local first.
function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

function baseUrl(): string {
  return `https://graph.facebook.com/${process.env.GRAPH_VERSION ?? 'v24.0'}`;
}

function buildUrl(path: string, params?: Params): string {
  const url = new URL(`${baseUrl()}${path.startsWith('/') ? path : `/${path}`}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function metaFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${env('PAGE_ACCESS_TOKEN')}` },
    cache: 'no-store',
  });

  let body: (T & MetaErrorBody) | null = null;
  try {
    body = (await res.json()) as T & MetaErrorBody;
  } catch {
    body = null;
  }

  if (body?.error) {
    const { code, message } = body.error;
    throw new Error(`Meta ${code ?? res.status}: ${message ?? 'Unknown error'}`);
  }
  if (!res.ok || body === null) {
    throw new Error(`Meta HTTP ${res.status}: ${res.statusText || 'Request failed'}`);
  }
  return body;
}

/** GET a single Graph API resource, e.g. metaGet('/me', { fields: 'id,name' }). */
export async function metaGet<T = unknown>(path: string, params?: Params): Promise<T> {
  return metaFetch<T>(buildUrl(path, params));
}

/** GET a list edge and follow `paging.next` until done (bounded by maxPages). */
export async function metaGetAll<T = unknown>(
  path: string,
  maxPages = 10,
  params?: Params,
): Promise<T[]> {
  const items: T[] = [];
  let url: string | undefined = buildUrl(path, params);
  let page = 0;

  while (url && page < maxPages) {
    const body: MetaList<T> = await metaFetch<MetaList<T>>(url);
    items.push(...(body.data ?? []));
    url = body.paging?.next;
    page += 1;
  }
  return items;
}

// ---------------------------------------------------------------------------
// Shared normalized shapes
// ---------------------------------------------------------------------------

export type ContentType = 'image' | 'video' | 'carousel' | 'reel' | 'link' | 'text' | 'other';

export interface FbPage {
  id: string;
  name: string;
  followers: number | null;
  pictureUrl: string | null;
}

export interface FbPost {
  id: string;
  content: string | null;
  contentType: ContentType;
  permalink: string | null;
  thumbnailUrl: string | null;
  createdTime: string;
  reactions: number | null;
  comments: number | null;
  shares: number;
  raw: RawFbPost;
}

export interface IgProfile {
  id: string;
  username: string;
  name: string | null;
  followers: number | null;
  follows: number | null;
  mediaCount: number | null;
  pictureUrl: string | null;
}

export interface IgMedia {
  id: string;
  content: string | null;
  contentType: ContentType;
  mediaProductType: string | null;
  permalink: string | null;
  thumbnailUrl: string | null;
  createdTime: string;
  likes: number | null;
  comments: number | null;
  raw: RawIgMedia;
}

export interface IgMediaInsights {
  reach: number | null;
  saves: number | null;
  shares: number | null;
  views: number | null;
}

export interface IgAccountInsights {
  reach: number | null;
  views: number | null;
  accountsEngaged: number | null;
  totalInteractions: number | null;
}

export interface DailyPoint {
  date: string; // YYYY-MM-DD
  value: number;
}

export interface AudienceSlice {
  label: string;
  value: number;
}

export type IgAudienceBreakdown = 'age' | 'gender' | 'city' | 'country';

// ---------------------------------------------------------------------------
// Raw Graph API shapes (only the fields we request)
// ---------------------------------------------------------------------------

interface RawFbPage {
  id: string;
  name: string;
  fan_count?: number;
  followers_count?: number;
  picture?: { data?: { url?: string } };
}

export interface RawFbPost {
  id: string;
  message?: string;
  created_time: string;
  permalink_url?: string;
  status_type?: string;
  full_picture?: string;
  shares?: { count?: number };
  attachments?: { data?: { media_type?: string }[] };
  reactions?: { summary?: { total_count?: number } };
  comments?: { summary?: { total_count?: number } };
}

interface RawIgProfile {
  id: string;
  username: string;
  name?: string;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
  profile_picture_url?: string;
}

export interface RawIgMedia {
  id: string;
  caption?: string;
  media_type?: string;
  media_product_type?: string;
  timestamp: string;
  permalink?: string;
  like_count?: number;
  comments_count?: number;
  thumbnail_url?: string;
  media_url?: string;
}

interface RawInsight {
  name: string;
  period?: string;
  values?: { value?: number; end_time?: string }[];
  total_value?: {
    value?: number;
    breakdowns?: {
      dimension_keys?: string[];
      results?: { dimension_values?: string[]; value?: number }[];
    }[];
  };
}

// ---------------------------------------------------------------------------
// Facebook
// ---------------------------------------------------------------------------

export async function getFbPage(): Promise<FbPage> {
  const page = await metaGet<RawFbPage>(`/${env('PAGE_ID')}`, {
    fields: 'id,name,fan_count,followers_count,picture{url}',
  });
  return {
    id: page.id,
    name: page.name,
    followers: page.followers_count ?? page.fan_count ?? null,
    pictureUrl: page.picture?.data?.url ?? null,
  };
}

function mapFbContentType(post: RawFbPost): ContentType {
  const mediaType = post.attachments?.data?.[0]?.media_type?.toLowerCase();
  switch (mediaType) {
    case 'photo':
      return 'image';
    case 'video':
      return 'video';
    case 'album':
      return 'carousel';
    case 'link':
    case 'share':
      return 'link';
  }

  switch (post.status_type) {
    case 'added_photos':
      return 'image';
    case 'added_video':
      return 'video';
    case 'shared_story':
      return 'link';
    case 'mobile_status_update':
      return 'text';
  }

  if (!mediaType && post.message) return 'text';
  return 'other';
}

export async function getFbPosts(maxPages = 10): Promise<FbPost[]> {
  const posts = await metaGetAll<RawFbPost>(`/${env('PAGE_ID')}/posts`, maxPages, {
    fields:
      'id,message,created_time,permalink_url,status_type,full_picture,shares,' +
      'attachments{media_type},reactions.limit(0).summary(true),comments.limit(0).summary(true)',
    limit: 25,
  });

  return posts.map((post) => ({
    id: post.id,
    content: post.message ?? null,
    contentType: mapFbContentType(post),
    permalink: post.permalink_url ?? null,
    thumbnailUrl: post.full_picture ?? null,
    createdTime: post.created_time,
    reactions: post.reactions?.summary?.total_count ?? null,
    comments: post.comments?.summary?.total_count ?? null,
    // Facebook omits `shares` entirely when the count is 0.
    shares: post.shares?.count ?? 0,
    raw: post,
  }));
}

// ---------------------------------------------------------------------------
// Instagram
// ---------------------------------------------------------------------------

export async function getIgProfile(): Promise<IgProfile> {
  const profile = await metaGet<RawIgProfile>(`/${env('IG_USER_ID')}`, {
    fields: 'id,username,name,followers_count,follows_count,media_count,profile_picture_url',
  });
  return {
    id: profile.id,
    username: profile.username,
    name: profile.name ?? null,
    followers: profile.followers_count ?? null,
    follows: profile.follows_count ?? null,
    mediaCount: profile.media_count ?? null,
    pictureUrl: profile.profile_picture_url ?? null,
  };
}

function mapIgContentType(media: RawIgMedia): ContentType {
  if (media.media_product_type === 'REELS') return 'reel';
  switch (media.media_type) {
    case 'VIDEO':
      return 'video';
    case 'IMAGE':
      return 'image';
    case 'CAROUSEL_ALBUM':
      return 'carousel';
    default:
      return 'other';
  }
}

export async function getIgMedia(maxPages = 10): Promise<IgMedia[]> {
  const media = await metaGetAll<RawIgMedia>(`/${env('IG_USER_ID')}/media`, maxPages, {
    fields:
      'id,caption,media_type,media_product_type,timestamp,permalink,like_count,' +
      'comments_count,thumbnail_url,media_url',
    limit: 25,
  });

  return media.map((item) => ({
    id: item.id,
    content: item.caption ?? null,
    contentType: mapIgContentType(item),
    mediaProductType: item.media_product_type ?? null,
    permalink: item.permalink ?? null,
    // Videos/reels expose thumbnail_url; images only expose media_url.
    thumbnailUrl: item.thumbnail_url ?? item.media_url ?? null,
    createdTime: item.timestamp,
    likes: item.like_count ?? null,
    comments: item.comments_count ?? null,
    raw: item,
  }));
}

const IG_MEDIA_METRIC_SETS = [
  'reach,saved,shares,total_interactions,views',
  'reach,saved,shares,total_interactions',
  'reach,saved',
] as const;

function insightValue(insights: RawInsight[], name: string): number | null {
  const insight = insights.find((i) => i.name === name);
  if (!insight) return null;
  const value = insight.total_value?.value ?? insight.values?.[0]?.value;
  return typeof value === 'number' ? value : null;
}

/** Best-effort: tries metric sets in order, returns all-null if none work. */
export async function getIgMediaInsights(mediaId: string): Promise<IgMediaInsights> {
  for (const metric of IG_MEDIA_METRIC_SETS) {
    try {
      const body = await metaGet<MetaList<RawInsight>>(`/${mediaId}/insights`, { metric });
      const data = body.data ?? [];
      return {
        reach: insightValue(data, 'reach'),
        saves: insightValue(data, 'saved'),
        shares: insightValue(data, 'shares'),
        views: insightValue(data, 'views'),
      };
    } catch {
      // Try the next, smaller metric set.
    }
  }
  return { reach: null, saves: null, shares: null, views: null };
}

function toUnixSeconds(value: Date | number): number {
  return value instanceof Date ? Math.floor(value.getTime() / 1000) : Math.floor(value);
}

/** Best-effort: account totals for the range (period=day, metric_type=total_value). */
export async function getIgAccountInsights(
  since: Date | number,
  until: Date | number,
): Promise<IgAccountInsights> {
  try {
    const body = await metaGet<MetaList<RawInsight>>(`/${env('IG_USER_ID')}/insights`, {
      metric: 'reach,views,accounts_engaged,total_interactions',
      period: 'day',
      metric_type: 'total_value',
      since: toUnixSeconds(since),
      until: toUnixSeconds(until),
    });
    const data = body.data ?? [];
    return {
      reach: insightValue(data, 'reach'),
      views: insightValue(data, 'views'),
      accountsEngaged: insightValue(data, 'accounts_engaged'),
      totalInteractions: insightValue(data, 'total_interactions'),
    };
  } catch {
    return { reach: null, views: null, accountsEngaged: null, totalInteractions: null };
  }
}

// Meta's `end_time` marks the END of a 24h bucket (midnight Pacific), so the
// bucket's calendar day is the day before `end_time`.
function bucketDate(endTime: string): string {
  const end = new Date(endTime);
  end.setUTCDate(end.getUTCDate() - 1);
  return end.toISOString().slice(0, 10);
}

/** Best-effort: daily time series for one metric (e.g. 'reach'). */
export async function getIgDailySeries(
  metric: string,
  since: Date | number,
  until: Date | number,
): Promise<DailyPoint[]> {
  try {
    const body = await metaGet<MetaList<RawInsight>>(`/${env('IG_USER_ID')}/insights`, {
      metric,
      period: 'day',
      metric_type: 'time_series',
      since: toUnixSeconds(since),
      until: toUnixSeconds(until),
    });
    const values = body.data?.find((i) => i.name === metric)?.values ?? [];
    return values
      .filter((v) => typeof v.value === 'number' && typeof v.end_time === 'string')
      .map((v) => ({ date: bucketDate(v.end_time as string), value: v.value as number }));
  } catch {
    return [];
  }
}

/** Best-effort: follower demographics for ONE breakdown. Empty is normal (<100 followers). */
export async function getIgAudience(breakdown: IgAudienceBreakdown): Promise<AudienceSlice[]> {
  try {
    const body = await metaGet<MetaList<RawInsight>>(`/${env('IG_USER_ID')}/insights`, {
      metric: 'follower_demographics',
      period: 'lifetime',
      metric_type: 'total_value',
      breakdown,
    });
    const results = body.data?.[0]?.total_value?.breakdowns?.[0]?.results ?? [];
    return results
      .filter((r) => typeof r.value === 'number')
      .map((r) => ({
        label: r.dimension_values?.join(' / ') ?? 'unknown',
        value: r.value as number,
      }));
  } catch {
    return [];
  }
}
