'use client';

import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCompact, formatNumber, formatPercent } from '@/lib/format';
import type { AudienceSlice } from '@/lib/queries';

// ---------------------------------------------------------------------------
// Shared tooltip
// ---------------------------------------------------------------------------

interface TooltipEntry {
  dataKey?: string | number;
  value?: number | string | Array<number | string>;
  color?: string;
  name?: string;
}

function ChartTooltip({
  active,
  payload,
  label,
  valueFormatter = (v: number) => formatNumber(v),
}: {
  active?: boolean;
  payload?: ReadonlyArray<TooltipEntry>;
  label?: string | number;
  valueFormatter?: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      {label ? <p className="mb-1.5 font-medium">{label}</p> : null}
      <ul className="space-y-1">
        {payload.map((entry, i) => {
          const value = typeof entry.value === 'number' ? entry.value : null;
          return (
            <li key={i} className="flex items-center justify-between gap-4">
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <span className="size-2 rounded-full" style={{ background: entry.color }} aria-hidden />
                {String(entry.name ?? entry.dataKey ?? '')}
              </span>
              <span className="font-medium tabular-nums">{valueFormatter(value ?? 0)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Followers over time — line chart
// ---------------------------------------------------------------------------

export interface FollowersDatum {
  date: string;
  label: string;
  followers: number | null;
}

export function FollowersLineChart({ data }: { data: FollowersDatum[] }) {
  const tickInterval = Math.max(0, Math.ceil(data.length / 12) - 1);

  return (
    <div style={{ width: '100%', height: 280 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
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
            width={52}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
            tickFormatter={(v: number) => formatCompact(v)}
            allowDecimals={false}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ stroke: 'var(--border)' }}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="followers"
            name="Followers"
            stroke="var(--instagram)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            connectNulls
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Age bar chart — horizontal bars with % label
// ---------------------------------------------------------------------------

export function AgeBarChart({ data }: { data: AudienceSlice[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const chartData = data.map((d) => ({
    label: d.label,
    value: d.value,
    pct: total > 0 ? d.value / total : 0,
  }));

  return (
    <div style={{ width: '100%', height: Math.max(180, chartData.length * 42) }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          layout="vertical"
          data={chartData}
          margin={{ top: 4, right: 64, bottom: 4, left: 0 }}
        >
          <CartesianGrid horizontal={false} stroke="var(--border)" />
          <XAxis
            type="number"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
            tickFormatter={(v: number) => formatCompact(v)}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={56}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
          />
          <Tooltip
            content={
              <ChartTooltip
                valueFormatter={(v) =>
                  `${formatNumber(v)} (${formatPercent(total > 0 ? v / total : 0)})`
                }
              />
            }
            cursor={{ fill: 'var(--muted)', fillOpacity: 0.3 }}
            isAnimationActive={false}
          />
          <Bar
            dataKey="value"
            name="Followers"
            fill="var(--instagram)"
            fillOpacity={0.85}
            radius={[0, 4, 4, 0]}
            maxBarSize={28}
            isAnimationActive={false}
            label={{
              position: 'right',
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter: (v: any) => formatPercent(total > 0 ? (v as number) / total : 0),
              fontSize: 11,
              fill: 'var(--muted-foreground)',
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Gender donut chart
// ---------------------------------------------------------------------------

const GENDER_COLORS: Record<string, string> = {
  F: 'var(--instagram)',
  M: '#3a84d0',
  U: 'var(--muted-foreground)',
  female: 'var(--instagram)',
  male: '#3a84d0',
  unknown: 'var(--muted-foreground)',
};

const GENDER_LABEL: Record<string, string> = {
  F: 'Female',
  M: 'Male',
  U: 'Unknown',
  female: 'Female',
  male: 'Male',
  unknown: 'Unknown',
};

interface DonutPayload {
  name?: string;
  value?: number;
  payload?: { pct: number };
}

function DonutTooltip({ active, payload }: { active?: boolean; payload?: DonutPayload[] }) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  const label = entry.name ? (GENDER_LABEL[entry.name] ?? entry.name) : '—';
  const value = entry.value ?? 0;
  const pct = entry.payload?.pct ?? 0;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      <p className="mb-1 font-medium">{label}</p>
      <p className="tabular-nums text-muted-foreground">
        {formatNumber(value)}{' '}
        <span className="font-medium text-foreground">({formatPercent(pct)})</span>
      </p>
    </div>
  );
}

export function GenderDonutChart({ data }: { data: AudienceSlice[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const chartData = data.map((d) => ({
    name: d.label,
    value: d.value,
    pct: total > 0 ? d.value / total : 0,
  }));

  return (
    <div className="flex flex-col items-center gap-3">
      <div style={{ width: '100%', height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="52%"
              outerRadius="78%"
              paddingAngle={2}
              isAnimationActive={false}
            >
              {chartData.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={GENDER_COLORS[entry.name] ?? 'var(--chart-2)'}
                />
              ))}
            </Pie>
            <Tooltip content={<DonutTooltip />} isAnimationActive={false} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1.5">
        {chartData.map((entry) => (
          <li key={entry.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ background: GENDER_COLORS[entry.name] ?? 'var(--chart-2)' }}
              aria-hidden
            />
            <span>{GENDER_LABEL[entry.name] ?? entry.name}</span>
            <span className="font-medium tabular-nums text-foreground">
              {formatPercent(entry.pct)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Horizontal bar chart — top cities / countries
// ---------------------------------------------------------------------------

export function HorizontalBarChart({
  data,
  limit = 10,
  color = 'var(--instagram)',
}: {
  data: AudienceSlice[];
  limit?: number;
  color?: string;
}) {
  const topN = data.slice(0, limit);
  const total = data.reduce((s, d) => s + d.value, 0);
  const chartData = topN.map((d) => ({
    label: d.label,
    value: d.value,
    pct: total > 0 ? d.value / total : 0,
  }));

  return (
    <div style={{ width: '100%', height: Math.max(200, chartData.length * 40) }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          layout="vertical"
          data={chartData}
          margin={{ top: 4, right: 64, bottom: 4, left: 4 }}
        >
          <CartesianGrid horizontal={false} stroke="var(--border)" />
          <XAxis
            type="number"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
            tickFormatter={(v: number) => formatCompact(v)}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={96}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
          />
          <Tooltip
            content={
              <ChartTooltip
                valueFormatter={(v) =>
                  `${formatNumber(v)} (${formatPercent(total > 0 ? v / total : 0)})`
                }
              />
            }
            cursor={{ fill: 'var(--muted)', fillOpacity: 0.3 }}
            isAnimationActive={false}
          />
          <Bar
            dataKey="value"
            name="Followers"
            fill={color}
            fillOpacity={0.85}
            radius={[0, 4, 4, 0]}
            maxBarSize={26}
            isAnimationActive={false}
            label={{
              position: 'right',
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter: (v: any) => formatPercent(total > 0 ? (v as number) / total : 0),
              fontSize: 11,
              fill: 'var(--muted-foreground)',
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reach + Views over time — line chart
// ---------------------------------------------------------------------------

export interface ReachViewsDatum {
  date: string;
  label: string;
  reach: number | null;
  views: number | null;
}

export function ReachViewsLineChart({ data }: { data: ReachViewsDatum[] }) {
  const tickInterval = Math.max(0, Math.ceil(data.length / 12) - 1);
  const hasReach = data.some((d) => d.reach !== null);
  const hasViews = data.some((d) => d.views !== null);

  return (
    <div style={{ width: '100%', height: 280 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
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
            width={52}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
            tickFormatter={(v: number) => formatCompact(v)}
            allowDecimals={false}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ stroke: 'var(--border)' }}
            isAnimationActive={false}
          />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, paddingBottom: 8 }}
          />
          {hasReach && (
            <Line
              type="monotone"
              dataKey="reach"
              name="Reach"
              stroke="var(--instagram)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls
              isAnimationActive={false}
            />
          )}
          {hasViews && (
            <Line
              type="monotone"
              dataKey="views"
              name="Views"
              stroke="#3a84d0"
              strokeWidth={2}
              dot={false}
              strokeDasharray="4 2"
              activeDot={{ r: 4 }}
              connectNulls
              isAnimationActive={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
