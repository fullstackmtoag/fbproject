import { cn } from '@/lib/utils';

export interface ChartTooltipRow {
  label: string;
  value: string;
}

/** Popover-styled tooltip body shared by every Insights chart and the heatmap. */
export function ChartTooltip({
  title,
  rows,
  className,
}: {
  title: string;
  rows: ChartTooltipRow[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md',
        className,
      )}
    >
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
