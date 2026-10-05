'use client';

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PlatformBadge, type BadgePlatform } from '@/components/dashboard/platform-badge';
import { formatCompact, formatNumber } from '@/lib/format';

export interface TrendDatum {
  /** YYYY-MM-DD in APP_TIMEZONE (unique key). */
  date: string;
  /** Pre-formatted axis label, e.g. "Oct 1" (formatted on the server). */
  label: string;
  /** Posts published that day (all selected platforms). */
  posts: number;
  /** Engagement per platform. Absent when the platform is filtered out. */
  facebook?: number;
  instagram?: number;
}

export interface EngagementTrendChartProps {
  data: TrendDatum[];
  /** Which engagement lines to draw. */
  platforms: BadgePlatform[];
  className?: string;
}

const PLATFORM_COLOR: Record<BadgePlatform, string> = {
  facebook: 'var(--facebook)',
  instagram: 'var(--instagram)',
};

function seriesLabel(key: string) {
  if (key === 'facebook' || key === 'instagram') {
    return <PlatformBadge platform={key} size="sm" />;
  }
  if (key === 'posts') return 'Posts';
  return key;
}

interface TooltipEntry {
  dataKey?: string | number;
  value?: number | string | Array<number | string>;
  color?: string;
}

function TrendTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: ReadonlyArray<TooltipEntry>;
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      <p className="mb-1.5 font-medium">{label}</p>
      <ul className="space-y-1">
        {payload.map((entry) => {
          const key = String(entry.dataKey ?? '');
          const value = typeof entry.value === 'number' ? entry.value : null;
          return (
            <li key={key} className="flex items-center justify-between gap-4">
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                {key === 'facebook' || key === 'instagram' ? null : (
                  <span className="size-2 rounded-full" style={{ background: entry.color }} aria-hidden />
                )}
                {seriesLabel(key)}
              </span>
              <span className="font-medium tabular-nums">{formatNumber(value)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Daily engagement (lines, one per platform) with posts per day as muted bars
 * on a secondary axis. Pure presentational Client Component.
 */
export function EngagementTrendChart({ data, platforms, className }: EngagementTrendChartProps) {
  // ~12 ticks keeps the axis readable for 7-day and 365-day ranges alike.
  const tickInterval = Math.max(0, Math.ceil(data.length / 12) - 1);

  return (
    <div className={className} style={{ width: '100%', height: 300 }}>
      <ComposedChart
        responsive
        data={data}
        margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        style={{ width: '100%', height: '100%' }}
      >
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="label"
          interval={tickInterval}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
          tickMargin={8}
        />
        <YAxis
          yAxisId="engagement"
          width={44}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
          tickFormatter={(v: number) => formatCompact(v)}
          allowDecimals={false}
        />
        <YAxis
          yAxisId="posts"
          orientation="right"
          width={32}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
          allowDecimals={false}
        />
        <Tooltip
          content={<TrendTooltip />}
          cursor={{ stroke: 'var(--border)' }}
          isAnimationActive={false}
        />
        <Legend
          verticalAlign="top"
          align="right"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, paddingBottom: 8 }}
          content={(props) => {
            const payload = (props.payload ?? []) as ReadonlyArray<{ value?: string; color?: string }>;
            return (
              <ul className="flex flex-wrap items-center justify-end gap-3 pb-2">
                {payload.map((entry) => {
                  const key = String(entry.value ?? '');
                  const isPlatform = key === 'facebook' || key === 'instagram';
                  return (
                    <li key={key} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      {isPlatform ? null : (
                        <span className="size-2 rounded-full" style={{ background: entry.color }} aria-hidden />
                      )}
                      {seriesLabel(key)}
                    </li>
                  );
                })}
              </ul>
            );
          }}
        />
        <Bar
          yAxisId="posts"
          dataKey="posts"
          name="posts"
          fill="var(--muted-foreground)"
          fillOpacity={0.2}
          radius={[3, 3, 0, 0]}
          maxBarSize={18}
          isAnimationActive={false}
        />
        {platforms.map((platform) => (
          <Line
            key={platform}
            yAxisId="engagement"
            type="monotone"
            dataKey={platform}
            name={platform}
            stroke={PLATFORM_COLOR[platform]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            connectNulls
            isAnimationActive={false}
          />
        ))}
      </ComposedChart>
    </div>
  );
}
