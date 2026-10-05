'use client';

import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCompact, formatNumber } from '@/lib/format';

export interface ContentTypeBar {
  label: string;
  posts: number;
  avgEngagement: number;
}

export interface BucketBar {
  label: string;
  posts: number;
  /** NULL when the bucket has posts but no engagement metrics. */
  avgEngagement: number | null;
}

export interface HeatCell {
  weekday: number; // 0 = Sunday .. 6 = Saturday
  hour: number; // 0..23
  posts: number;
  avgEngagement: number | null;
}

interface BarTooltipEntry<T> {
  payload?: T;
}

function ChartTooltip({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: string }[];
}) {
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      <p className="mb-1.5 font-medium">{title}</p>
      <ul className="space-y-1">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">{row.label}</span>
            <span className="font-medium tabular-nums">{row.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ContentTypeTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<BarTooltipEntry<ContentTypeBar>>;
}) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  return (
    <ChartTooltip
      title={row.label}
      rows={[
        { label: 'Avg engagement', value: formatNumber(row.avgEngagement) },
        { label: 'Posts', value: formatNumber(row.posts) },
      ]}
    />
  );
}

interface BucketDatum extends BucketBar {
  value: number;
}

function BucketTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<BarTooltipEntry<BucketDatum>>;
}) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  return (
    <ChartTooltip
      title={row.label}
      rows={[
        { label: 'Avg engagement', value: formatNumber(row.avgEngagement) },
        { label: 'Posts', value: formatNumber(row.posts) },
      ]}
    />
  );
}

const AXIS_TICK = { fontSize: 12, fill: 'var(--muted-foreground)' };

/** Horizontal bars: average engagement per content type. */
export function ContentTypeBarChart({ data, className }: { data: ContentTypeBar[]; className?: string }) {
  const height = Math.max(160, data.length * 36 + 24);

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
          tick={AXIS_TICK}
          tickFormatter={(value: number) => formatCompact(value)}
          allowDecimals={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={92}
          tickLine={false}
          axisLine={false}
          interval={0}
          tick={{ fontSize: 12, fill: 'var(--foreground)' }}
        />
        <Tooltip content={<ContentTypeTooltip />} cursor={{ fill: 'var(--muted)' }} isAnimationActive={false} />
        <Bar
          dataKey="avgEngagement"
          fill="var(--foreground)"
          radius={[0, 4, 4, 0]}
          maxBarSize={22}
          isAnimationActive={false}
        />
      </BarChart>
    </div>
  );
}

/** Vertical bars for one caption bucket set (length or hashtags). */
export function BucketBarChart({ data, className }: { data: BucketBar[]; className?: string }) {
  const rows: BucketDatum[] = data.map((bucket) => ({
    ...bucket,
    value: bucket.avgEngagement ?? 0,
  }));

  return (
    <div className={className} style={{ width: '100%', height: 220 }}>
      <BarChart
        responsive
        data={rows}
        margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        style={{ width: '100%', height: '100%' }}
      >
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          interval={0}
          tick={{ fontSize: 12, fill: 'var(--foreground)' }}
        />
        <YAxis
          width={40}
          tickLine={false}
          axisLine={false}
          tick={AXIS_TICK}
          tickFormatter={(value: number) => formatCompact(value)}
          allowDecimals={false}
        />
        <Tooltip content={<BucketTooltip />} cursor={{ fill: 'var(--muted)' }} isAnimationActive={false} />
        <Bar dataKey="value" fill="var(--foreground)" radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />
      </BarChart>
    </div>
  );
}

const HEAT_HOURS = Array.from({ length: 24 }, (_, hour) => hour);

/** Monday-first, matching a business week. Indexes are PostgreSQL DOW (0 = Sunday). */
const HEAT_DAYS: { weekday: number; label: string; name: string }[] = [
  { weekday: 1, label: 'Mon', name: 'Monday' },
  { weekday: 2, label: 'Tue', name: 'Tuesday' },
  { weekday: 3, label: 'Wed', name: 'Wednesday' },
  { weekday: 4, label: 'Thu', name: 'Thursday' },
  { weekday: 5, label: 'Fri', name: 'Friday' },
  { weekday: 6, label: 'Sat', name: 'Saturday' },
  { weekday: 0, label: 'Sun', name: 'Sunday' },
];

function clock(hour: number): string {
  const suffix = hour < 12 ? 'AM' : 'PM';
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h} ${suffix}`;
}

function heatBackground(avg: number | null, posts: number, max: number): string {
  if (posts === 0 || avg === null) return 'var(--muted)';
  const t = max <= 0 ? 0 : Math.max(0, Math.min(1, avg / max));
  const mix = Math.round(22 + t * 78);
  return `color-mix(in oklab, var(--foreground) ${mix}%, var(--muted))`;
}

interface ActiveCell {
  id: string;
  left: number;
  top: number;
  above: boolean;
  title: string;
  posts: number;
  avgEngagement: number | null;
}

/**
 * 7 x 24 grid. Empty hours stay gray. Color is relative to the highest
 * average engagement in the current filter.
 */
export function BestTimeHeatmap({ cells, className }: { cells: HeatCell[]; className?: string }) {
  const lookup = new Map(cells.map((cell) => [`${cell.weekday}-${cell.hour}`, cell]));
  const max = cells.reduce((highest, cell) => {
    if (cell.avgEngagement === null) return highest;
    return cell.avgEngagement > highest ? cell.avgEngagement : highest;
  }, 0);
  const [active, setActive] = useState<ActiveCell | null>(null);

  useEffect(() => {
    if (!active) return;
    const hide = () => setActive(null);
    window.addEventListener('scroll', hide, true);
    return () => window.removeEventListener('scroll', hide, true);
  }, [active]);

  function showTip(target: HTMLElement, weekday: number, hour: number) {
    const cell = lookup.get(`${weekday}-${hour}`);
    const day = HEAT_DAYS.find((item) => item.weekday === weekday);
    const rect = target.getBoundingClientRect();
    const left = Math.min(window.innerWidth - 120, Math.max(120, rect.left + rect.width / 2));
    setActive({
      id: `${weekday}-${hour}`,
      left,
      top: rect.top > 88 ? rect.top - 8 : rect.bottom + 8,
      above: rect.top > 88,
      title: `${day?.name ?? 'Day'}, ${clock(hour)}`,
      posts: cell?.posts ?? 0,
      avgEngagement: cell?.avgEngagement ?? null,
    });
  }

  return (
    <div className={className}>
      <div className="overflow-x-auto" onMouseLeave={() => setActive(null)}>
        <div
          role="grid"
          aria-label="Average engagement by weekday and hour"
          className="grid min-w-[40rem] gap-0.5"
          style={{ gridTemplateColumns: '2.5rem repeat(24, minmax(0, 1fr))' }}
        >
          <div />
          {HEAT_HOURS.map((hour) => (
            <div key={`h-${hour}`} className="truncate text-center text-[10px] leading-4 text-muted-foreground">
              {hour % 3 === 0 ? hour : ''}
            </div>
          ))}
          {HEAT_DAYS.map((day) => (
            <div key={day.weekday} className="contents">
              <div className="flex items-center text-[11px] text-muted-foreground">{day.label}</div>
              {HEAT_HOURS.map((hour) => {
                const cell = lookup.get(`${day.weekday}-${hour}`);
                const posts = cell?.posts ?? 0;
                const avg = cell?.avgEngagement ?? null;
                const label =
                  posts === 0
                    ? `${day.name} ${clock(hour)}: no posts`
                    : `${day.name} ${clock(hour)}: ${posts} ${posts === 1 ? 'post' : 'posts'}, average engagement ${formatNumber(avg)}`;
                return (
                  <div
                    key={hour}
                    role="gridcell"
                    aria-label={label}
                    className="aspect-square w-full rounded-[3px]"
                    style={{ background: heatBackground(avg, posts, max) }}
                    onMouseEnter={(event) => showTip(event.currentTarget, day.weekday, hour)}
                    onClick={(event) => showTip(event.currentTarget, day.weekday, hour)}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        <span>Lower</span>
        <span
          className="h-2 w-24 rounded-full"
          style={{ background: 'linear-gradient(to right, var(--muted), var(--foreground))' }}
          aria-hidden
        />
        <span>Higher</span>
        <span className="text-muted-foreground/80">Gray cells have no posts.</span>
      </div>
      {active ? (
        <div
          role="tooltip"
          className="pointer-events-none fixed z-50 rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md"
          style={{
            left: active.left,
            top: active.top,
            transform: active.above ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
          }}
        >
          <p className="mb-1 font-medium">{active.title}</p>
          <p className="tabular-nums text-muted-foreground">
            {active.posts} {active.posts === 1 ? 'post' : 'posts'}
            <span className="px-1.5">·</span>
            avg engagement {formatNumber(active.avgEngagement)}
          </p>
        </div>
      ) : null}
    </div>
  );
}
