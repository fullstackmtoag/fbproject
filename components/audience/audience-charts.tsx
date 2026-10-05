'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { cn } from '@/lib/utils';
import { formatCompact, formatNumber, formatPercent } from '@/lib/format';
import { CHART_PALETTE } from '@/components/insights/chart-palette';
import { ChartTooltip } from '@/components/insights/chart-tooltip';
import type { AudienceSlice } from '@/lib/queries';

const ACCENT = 'var(--chart-accent)';
const MUTED = 'var(--chart-muted)';
const SOFT = 'var(--chart-soft)';

/** Insights palette plus a third, lighter tone for the donut. */
const PALETTE = cn(CHART_PALETTE, '[--chart-soft:var(--chart-1)] dark:[--chart-soft:var(--chart-4)]');

const AXIS_TICK = { fontSize: 11, fill: 'var(--muted-foreground)' };

// ---------------------------------------------------------------------------
// Tooltips
// ---------------------------------------------------------------------------

interface SeriesTooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: ReadonlyArray<{ name?: string | number; value?: number | string | ReadonlyArray<number | string> }>;
}

function SeriesTooltip({ active, label, payload }: SeriesTooltipProps) {
  if (!active || !payload?.length) return null;
  const rows = payload
    .filter((entry) => typeof entry.value === 'number')
    .map((entry) => ({ label: String(entry.name ?? ''), value: formatNumber(entry.value as number) }));
  if (rows.length === 0) return null;
  return <ChartTooltip title={String(label ?? '')} rows={rows} />;
}

interface SliceDatum {
  label: string;
  value: number;
  pct: number;
}

function SliceTooltip({ active, payload }: { active?: boolean; payload?: ReadonlyArray<{ payload?: SliceDatum }> }) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  return (
    <ChartTooltip
      title={row.label}
      rows={[
        { label: 'Followers', value: formatNumber(row.value) },
        { label: 'Share', value: formatPercent(row.pct) },
      ]}
    />
  );
}

function toSlices(data: AudienceSlice[], limit?: number): SliceDatum[] {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const rows = limit === undefined ? data : data.slice(0, limit);
  return rows.map((d) => ({ label: d.label, value: d.value, pct: total > 0 ? d.value / total : 0 }));
}

function tickInterval(points: number): number {
  return Math.max(0, Math.ceil(points / 8) - 1);
}

// ---------------------------------------------------------------------------
// Followers growth: soft area line
// ---------------------------------------------------------------------------

export interface FollowersDatum {
  date: string;
  label: string;
  followers: number | null;
}

export function FollowersAreaChart({ data, className }: { data: FollowersDatum[]; className?: string }) {
  return (
    <div className={cn(PALETTE, className)} style={{ width: '100%', height: 260 }}>
      <AreaChart
        responsive
        data={data}
        margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        style={{ width: '100%', height: '100%' }}
      >
        <defs>
          <linearGradient id="audience-followers-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ACCENT} stopOpacity={0.22} />
            <stop offset="100%" stopColor={ACCENT} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="label"
          interval={tickInterval(data.length)}
          tickLine={false}
          axisLine={false}
          tick={AXIS_TICK}
          tickMargin={8}
        />
        <YAxis
          width={44}
          domain={['auto', 'auto']}
          tickLine={false}
          axisLine={false}
          tick={AXIS_TICK}
          tickFormatter={(v: number) => formatCompact(v)}
          allowDecimals={false}
        />
        <Tooltip content={<SeriesTooltip />} cursor={{ stroke: 'var(--border)' }} isAnimationActive={false} />
        <Area
          type="monotone"
          dataKey="followers"
          name="Followers"
          stroke={ACCENT}
          strokeWidth={2}
          fill="url(#audience-followers-fill)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
          connectNulls
          isAnimationActive={false}
        />
      </AreaChart>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Age: vertical bars, winner in accent
// ---------------------------------------------------------------------------

export function AgeBarChart({ data, className }: { data: AudienceSlice[]; className?: string }) {
  const rows = toSlices(data);
  const winner = rows.reduce<SliceDatum | null>((best, row) => (best === null || row.value > best.value ? row : best), null);

  return (
    <div className={cn(PALETTE, className)} style={{ width: '100%', height: 220 }}>
      <BarChart
        responsive
        data={rows}
        margin={{ top: 20, right: 4, bottom: 0, left: 4 }}
        barCategoryGap="22%"
        style={{ width: '100%', height: '100%' }}
      >
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="label" interval={0} tickLine={false} axisLine={false} tick={AXIS_TICK} tickMargin={8} />
        <YAxis hide allowDecimals={false} />
        <Tooltip content={<SliceTooltip />} cursor={{ fill: 'var(--muted)', fillOpacity: 0.6 }} isAnimationActive={false} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={44} isAnimationActive={false}>
          {rows.map((row) => (
            <Cell key={row.label} fill={row.label === winner?.label ? ACCENT : MUTED} />
          ))}
          <LabelList
            dataKey="pct"
            position="top"
            offset={6}
            fontSize={11}
            fontWeight={500}
            fill="var(--foreground)"
            className="tabular-nums"
            formatter={(value: unknown) => formatPercent(typeof value === 'number' ? value : 0, 0)}
          />
        </Bar>
      </BarChart>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Gender: donut with total in the center and a legend with percentages
// ---------------------------------------------------------------------------

const GENDER_LABEL: Record<string, string> = {
  F: 'Female',
  M: 'Male',
  U: 'Unknown',
  female: 'Female',
  male: 'Male',
  unknown: 'Unknown',
};

const DONUT_TONES = [ACCENT, MUTED, SOFT];

export function GenderDonutChart({ data, className }: { data: AudienceSlice[]; className?: string }) {
  const rows = toSlices(data).map((row) => ({ ...row, label: GENDER_LABEL[row.label] ?? row.label }));
  const total = rows.reduce((sum, row) => sum + row.value, 0);

  return (
    <div className={cn(PALETTE, 'flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-8', className)}>
      <div className="relative shrink-0" style={{ width: 180, height: 180 }}>
        <PieChart responsive style={{ width: '100%', height: '100%' }}>
          <Pie
            data={rows}
            dataKey="value"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius="68%"
            outerRadius="100%"
            paddingAngle={rows.length > 1 ? 2 : 0}
            stroke="none"
            isAnimationActive={false}
          >
            {rows.map((row, index) => (
              <Cell key={row.label} fill={DONUT_TONES[index % DONUT_TONES.length]} />
            ))}
          </Pie>
          <Tooltip content={<SliceTooltip />} isAnimationActive={false} />
        </PieChart>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-heading text-2xl font-semibold leading-none tracking-tight tabular-nums" title={formatNumber(total)}>
            {formatCompact(total)}
          </span>
          <span className="mt-1 text-[11px] leading-4 text-muted-foreground">followers</span>
        </div>
      </div>
      <ul className="flex flex-wrap justify-center gap-x-4 gap-y-2 sm:flex-col sm:gap-y-2.5" aria-label="Gender split">
        {rows.map((row, index) => (
          <li key={row.label} className="flex items-center gap-2 text-sm">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ background: DONUT_TONES[index % DONUT_TONES.length] }}
              aria-hidden
            />
            <span className="text-muted-foreground">{row.label}</span>
            <span className="font-medium tabular-nums" title={formatNumber(row.value)}>
              {formatPercent(row.pct)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Top cities / countries: horizontal bars with value labels
// ---------------------------------------------------------------------------

const ROW_HEIGHT = 34;
const LABEL_MAX = 18;

interface TickProps {
  x?: number | string;
  y?: number | string;
  payload?: { value?: string | number };
}

function CategoryTick({ x, y, payload }: TickProps) {
  const text = String(payload?.value ?? '');
  const short = text.length > LABEL_MAX ? `${text.slice(0, LABEL_MAX - 1).trimEnd()}…` : text;
  return (
    <text x={x} y={y} dy={4} textAnchor="end" fontSize={12} fill="var(--foreground)">
      {short.length !== text.length ? <title>{text}</title> : null}
      {short}
    </text>
  );
}

export function LocationBarChart({
  data,
  limit = 10,
  className,
}: {
  data: AudienceSlice[];
  limit?: number;
  className?: string;
}) {
  const rows = toSlices(data, limit);
  const height = Math.max(120, rows.length * ROW_HEIGHT + 8);

  return (
    <div className={cn(PALETTE, className)} style={{ width: '100%', height }}>
      <BarChart
        responsive
        layout="vertical"
        data={rows}
        margin={{ top: 4, right: 44, bottom: 4, left: 0 }}
        barCategoryGap={8}
        style={{ width: '100%', height: '100%' }}
      >
        <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="label"
          width={128}
          interval={0}
          tickLine={false}
          axisLine={false}
          tick={(props: TickProps) => <CategoryTick {...props} />}
        />
        <Tooltip content={<SliceTooltip />} cursor={{ fill: 'var(--muted)', fillOpacity: 0.6 }} isAnimationActive={false} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={20} isAnimationActive={false}>
          {rows.map((row, index) => (
            <Cell key={row.label} fill={index === 0 ? ACCENT : MUTED} />
          ))}
          <LabelList
            dataKey="value"
            position="right"
            offset={6}
            fontSize={11}
            fontWeight={500}
            fill="var(--foreground)"
            className="tabular-nums"
            formatter={(value: unknown) => formatCompact(typeof value === 'number' ? value : null)}
          />
        </Bar>
      </BarChart>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reach and views over time: two lines (solid + dashed)
// ---------------------------------------------------------------------------

export interface ReachViewsDatum {
  date: string;
  label: string;
  reach: number | null;
  views: number | null;
}

export function ReachViewsLineChart({ data, className }: { data: ReachViewsDatum[]; className?: string }) {
  const hasReach = data.some((d) => d.reach !== null);
  const hasViews = data.some((d) => d.views !== null);

  return (
    <div className={cn(PALETTE, className)}>
      <div style={{ width: '100%', height: 260 }}>
        <LineChart
          responsive
          data={data}
          margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
          style={{ width: '100%', height: '100%' }}
        >
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="label"
            interval={tickInterval(data.length)}
            tickLine={false}
            axisLine={false}
            tick={AXIS_TICK}
            tickMargin={8}
          />
          <YAxis
            width={44}
            tickLine={false}
            axisLine={false}
            tick={AXIS_TICK}
            tickFormatter={(v: number) => formatCompact(v)}
            allowDecimals={false}
          />
          <Tooltip content={<SeriesTooltip />} cursor={{ stroke: 'var(--border)' }} isAnimationActive={false} />
          {hasReach ? (
            <Line
              type="monotone"
              dataKey="reach"
              name="Reach"
              stroke={ACCENT}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              connectNulls
              isAnimationActive={false}
            />
          ) : null}
          {hasViews ? (
            <Line
              type="monotone"
              dataKey="views"
              name="Views"
              stroke={MUTED}
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              connectNulls
              isAnimationActive={false}
            />
          ) : null}
        </LineChart>
      </div>
      <ul className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground" aria-label="Legend">
        {hasReach ? (
          <li className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded-full" style={{ background: ACCENT }} aria-hidden />
            Reach
          </li>
        ) : null}
        {hasViews ? (
          <li className="inline-flex items-center gap-1.5">
            <span
              className="h-0 w-4 border-t-2 border-dashed"
              style={{ borderColor: MUTED }}
              aria-hidden
            />
            Views
          </li>
        ) : null}
      </ul>
    </div>
  );
}
