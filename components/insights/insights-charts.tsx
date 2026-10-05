'use client';

import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Tooltip, XAxis, YAxis } from 'recharts';
import { cn } from '@/lib/utils';
import { formatCompact, formatNumber } from '@/lib/format';
import { CHART_PALETTE } from '@/components/insights/chart-palette';
import { ChartTooltip } from '@/components/insights/chart-tooltip';

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

interface BarDatum {
  label: string;
  posts: number;
  avgEngagement: number | null;
  /** Bar length; NULL averages draw as 0. */
  value: number;
  /** Text at the bar end. */
  display: string;
}

const ROW_HEIGHT = 36;
const ACCENT = 'var(--chart-accent)';
const MUTED = 'var(--chart-muted)';

function toDatum(row: ContentTypeBar | BucketBar): BarDatum {
  return {
    label: row.label,
    posts: row.posts,
    avgEngagement: row.avgEngagement,
    value: row.avgEngagement ?? 0,
    display: formatCompact(row.avgEngagement),
  };
}

function BarTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: BarDatum }>;
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

interface TickProps {
  x?: number | string;
  y?: number | string;
  payload?: { value?: string | number };
}

/** Category label; the winner is bold so the highlight never relies on color alone. */
function CategoryTick({ x, y, payload, highlight }: TickProps & { highlight?: string }) {
  const text = String(payload?.value ?? '');
  const bold = highlight !== undefined && text === highlight;
  return (
    <text
      x={x}
      y={y}
      dy={4}
      textAnchor="end"
      fontSize={12}
      fontWeight={bold ? 600 : 400}
      fill="var(--foreground)"
    >
      {text}
    </text>
  );
}

function HorizontalBars({
  rows,
  highlight,
  labelWidth,
  className,
}: {
  rows: BarDatum[];
  highlight?: string;
  labelWidth: number;
  className?: string;
}) {
  const height = Math.max(120, rows.length * ROW_HEIGHT + 16);

  return (
    <div className={cn(CHART_PALETTE, className)} style={{ width: '100%', height }}>
      <BarChart
        responsive
        layout="vertical"
        data={rows}
        margin={{ top: 4, right: 48, bottom: 4, left: 0 }}
        barCategoryGap={8}
        style={{ width: '100%', height: '100%' }}
      >
        <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="label"
          width={labelWidth}
          tickLine={false}
          axisLine={false}
          interval={0}
          tick={(props: TickProps) => <CategoryTick {...props} highlight={highlight} />}
        />
        <Tooltip content={<BarTooltip />} cursor={{ fill: 'var(--muted)', fillOpacity: 0.6 }} isAnimationActive={false} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={22} isAnimationActive={false}>
          {rows.map((row) => (
            <Cell key={row.label} fill={row.label === highlight ? ACCENT : MUTED} />
          ))}
          <LabelList
            dataKey="display"
            position="right"
            offset={6}
            fontSize={11}
            fontWeight={500}
            fill="var(--foreground)"
            className="tabular-nums"
          />
        </Bar>
      </BarChart>
    </div>
  );
}

/** Horizontal bars: average engagement per content type. `highlight` is the winner's label. */
export function ContentTypeBarChart({
  data,
  highlight,
  className,
}: {
  data: ContentTypeBar[];
  highlight?: string;
  className?: string;
}) {
  return <HorizontalBars rows={data.map(toDatum)} highlight={highlight} labelWidth={76} className={className} />;
}

/** Horizontal bars for one caption bucket set (length or hashtags). `highlight` is the winner's label. */
export function BucketBarChart({
  data,
  highlight,
  className,
}: {
  data: BucketBar[];
  highlight?: string;
  className?: string;
}) {
  return <HorizontalBars rows={data.map(toDatum)} highlight={highlight} labelWidth={64} className={className} />;
}

// ---------------------------------------------------------------------------
// Heatmap
// ---------------------------------------------------------------------------

const HEAT_HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const HOUR_GROUPS = Array.from({ length: 8 }, (_, index) => index * 3);

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

/** Five accent tints, light to strong. Mixed with the card color so they track the theme. */
const HEAT_STEPS = [22, 42, 62, 82, 100];

function clock(hour: number): string {
  const suffix = hour < 12 ? 'AM' : 'PM';
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h} ${suffix}`;
}

function heatStep(percent: number): string {
  return `color-mix(in oklab, ${ACCENT} ${percent}%, var(--card))`;
}

/** 1..5 for cells with data, relative to the highest average in the filter. 0 = empty. */
function heatLevel(avg: number | null, posts: number, max: number): number {
  if (posts === 0 || avg === null) return 0;
  if (max <= 0) return 1;
  const t = Math.max(0, Math.min(1, avg / max));
  return Math.max(1, Math.ceil(t * HEAT_STEPS.length));
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
 * 7 x 24 grid. Empty hours stay muted. Color is relative to the highest
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
    <div className={cn(CHART_PALETTE, className)}>
      <div className="-mx-1 overflow-x-auto px-1 pb-1" onMouseLeave={() => setActive(null)}>
        <div
          role="grid"
          aria-label="Average engagement by weekday and hour"
          className="grid min-w-[40rem] gap-0.5"
          style={{ gridTemplateColumns: '2.5rem repeat(24, minmax(0, 1fr))' }}
        >
          <div />
          {HOUR_GROUPS.map((hour) => (
            <div
              key={`h-${hour}`}
              className="col-span-3 truncate pl-0.5 text-left text-[10px] leading-4 text-muted-foreground"
            >
              {clock(hour)}
            </div>
          ))}
          {HEAT_DAYS.map((day) => (
            <div key={day.weekday} className="contents">
              <div className="flex items-center text-[11px] text-muted-foreground">{day.label}</div>
              {HEAT_HOURS.map((hour) => {
                const cell = lookup.get(`${day.weekday}-${hour}`);
                const posts = cell?.posts ?? 0;
                const avg = cell?.avgEngagement ?? null;
                const level = heatLevel(avg, posts, max);
                const label =
                  posts === 0
                    ? `${day.name} ${clock(hour)}: no posts`
                    : `${day.name} ${clock(hour)}: ${posts} ${posts === 1 ? 'post' : 'posts'}, average engagement ${formatNumber(avg)}`;
                return (
                  <div
                    key={hour}
                    role="gridcell"
                    aria-label={label}
                    className={cn('aspect-square w-full rounded-[4px]', level === 0 && 'bg-muted')}
                    style={level === 0 ? undefined : { background: heatStep(HEAT_STEPS[level - 1]) }}
                    onMouseEnter={(event) => showTip(event.currentTarget, day.weekday, hour)}
                    onClick={(event) => showTip(event.currentTarget, day.weekday, hour)}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span>Lower</span>
          <span className="inline-flex items-center gap-0.5" aria-hidden>
            {HEAT_STEPS.map((percent) => (
              <span key={percent} className="size-3 rounded-[3px]" style={{ background: heatStep(percent) }} />
            ))}
          </span>
          <span>Higher</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-[3px] bg-muted" aria-hidden />
          No posts
        </span>
      </div>
      {active ? (
        <div
          role="tooltip"
          className="pointer-events-none fixed z-50"
          style={{
            left: active.left,
            top: active.top,
            transform: active.above ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
          }}
        >
          <ChartTooltip
            title={active.title}
            rows={[
              { label: 'Posts', value: formatNumber(active.posts) },
              { label: 'Avg engagement', value: formatNumber(active.avgEngagement) },
            ]}
          />
        </div>
      ) : null}
    </div>
  );
}
