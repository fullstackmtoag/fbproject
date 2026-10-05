import { cn } from '@/lib/utils';
import { CHART_PALETTE } from '@/components/insights/chart-palette';
import { formatCompact, formatNumber } from '@/lib/format';

export interface ContentTypeRow {
  key: string;
  label: string;
  posts: number;
  avgLikes: number | null;
  avgComments: number | null;
}

function Metric({ value }: { value: number | null }) {
  return (
    <span className="tabular-nums" title={formatNumber(value)}>
      {formatCompact(value)}
    </span>
  );
}

/** Compact table in the shared posts-table style. `highlight` is the winner's key. */
export function ContentTypeTable({
  rows,
  highlight,
  className,
}: {
  rows: ContentTypeRow[];
  highlight?: string;
  className?: string;
}) {
  return (
    <div className={cn(CHART_PALETTE, 'overflow-x-auto rounded-[8px] border border-border', className)}>
      <table className="w-full min-w-[18rem] border-separate border-spacing-0 text-sm">
        <caption className="sr-only">Posts, average likes and average comments per content type</caption>
        <thead>
          <tr>
            <th scope="col" className="border-b border-border bg-muted px-3 py-2 text-left text-xs font-medium text-muted-foreground">
              Type
            </th>
            <th scope="col" className="border-b border-border bg-muted px-3 py-2 text-right text-xs font-medium text-muted-foreground">
              Posts
            </th>
            <th scope="col" className="border-b border-border bg-muted px-3 py-2 text-right text-xs font-medium text-muted-foreground">
              Avg likes
            </th>
            <th scope="col" className="border-b border-border bg-muted px-3 py-2 text-right text-xs font-medium text-muted-foreground">
              Avg comments
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isWinner = highlight !== undefined && row.key === highlight;
            return (
              <tr key={row.key} className="h-10 transition-colors hover:bg-muted">
                <td className="border-b border-border px-3 align-middle [tr:last-child>&]:border-b-0">
                  <span className={cn('inline-flex items-center gap-1.5', isWinner && 'font-semibold')}>
                    {isWinner ? (
                      <span className="size-1.5 shrink-0 rounded-full bg-[var(--chart-accent)]" aria-hidden />
                    ) : null}
                    {row.label}
                    {isWinner ? <span className="sr-only"> (highest average engagement)</span> : null}
                  </span>
                </td>
                <td className="border-b border-border px-3 text-right align-middle text-xs tabular-nums [tr:last-child>&]:border-b-0">
                  {formatNumber(row.posts)}
                </td>
                <td className="border-b border-border px-3 text-right align-middle text-xs [tr:last-child>&]:border-b-0">
                  <Metric value={row.avgLikes} />
                </td>
                <td className="border-b border-border px-3 text-right align-middle text-xs [tr:last-child>&]:border-b-0">
                  <Metric value={row.avgComments} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
