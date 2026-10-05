'use client';

import { Bar, BarChart, CartesianGrid, Cell, Tooltip, XAxis, YAxis } from 'recharts';
import { PlatformBadge, type BadgePlatform } from '@/components/dashboard/platform-badge';
import { formatCompact, formatNumber } from '@/lib/format';

export interface TopPostDatum {
  id: string;
  platform: BadgePlatform;
  /** Short axis label (first 25 chars of the caption), built on the server. */
  label: string;
  /** Longer caption excerpt for the tooltip. */
  excerpt: string;
  /** Pre-formatted publish date, e.g. "Oct 1, 2026". */
  date: string;
  engagement: number;
  permalink: string | null;
}

export interface TopPostsChartProps {
  data: TopPostDatum[];
  className?: string;
}

const PLATFORM_COLOR: Record<BadgePlatform, string> = {
  facebook: 'var(--facebook)',
  instagram: 'var(--instagram)',
};

const ROW_HEIGHT = 36;

function TopPostTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: TopPostDatum }>;
}) {
  const post = payload?.[0]?.payload;
  if (!active || !post) return null;
  return (
    <div className="max-w-64 rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      <p className="mb-1 flex items-center gap-1.5 text-muted-foreground">
        <PlatformBadge platform={post.platform} size="sm" />
        <span>{post.date}</span>
      </p>
      <p className="mb-1.5 line-clamp-3 font-medium">{post.excerpt}</p>
      <p className="flex items-center justify-between gap-4">
        <span className="text-muted-foreground">Engagement</span>
        <span className="font-medium tabular-nums">{formatNumber(post.engagement)}</span>
      </p>
      {post.permalink ? <p className="mt-1.5 text-muted-foreground">Click to open the post</p> : null}
    </div>
  );
}

function openPermalink(post: TopPostDatum | undefined) {
  if (!post?.permalink) return;
  window.open(post.permalink, '_blank', 'noopener,noreferrer');
}

/** Horizontal bars, one per post, colored by platform. Clicking a bar opens the post. */
export function TopPostsChart({ data, className }: TopPostsChartProps) {
  const height = Math.max(160, data.length * ROW_HEIGHT + 40);

  return (
    <div className={className} style={{ width: '100%', height }}>
      <BarChart
        responsive
        layout="vertical"
        data={data}
        margin={{ top: 4, right: 16, bottom: 0, left: 0 }}
        barCategoryGap={8}
        style={{ width: '100%', height: '100%' }}
      >
        <CartesianGrid horizontal={false} stroke="var(--border)" />
        <XAxis
          type="number"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
          tickFormatter={(v: number) => formatCompact(v)}
          allowDecimals={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={150}
          tickLine={false}
          axisLine={false}
          interval={0}
          tick={{ fontSize: 12, fill: 'var(--foreground)' }}
        />
        <Tooltip content={<TopPostTooltip />} cursor={{ fill: 'var(--muted)' }} isAnimationActive={false} />
        <Bar
          dataKey="engagement"
          radius={[0, 4, 4, 0]}
          maxBarSize={24}
          isAnimationActive={false}
          onClick={(item) => openPermalink(item?.payload as TopPostDatum | undefined)}
        >
          {data.map((post) => (
            <Cell
              key={post.id}
              fill={PLATFORM_COLOR[post.platform]}
              style={{ cursor: post.permalink ? 'pointer' : 'default' }}
            />
          ))}
        </Bar>
      </BarChart>
    </div>
  );
}
