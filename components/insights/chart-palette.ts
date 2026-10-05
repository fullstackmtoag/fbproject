/**
 * Insights chart palette, derived only from the shared `--chart-*` variables.
 *
 * `--chart-accent` is the highest-contrast chart color (dark bars in light mode,
 * light bars in dark mode) and marks the winner. `--chart-muted` is the quiet
 * slate used for everything else. Apply this class on any wrapper whose
 * descendants read `var(--chart-accent)` / `var(--chart-muted)`.
 */
export const CHART_PALETTE =
  '[--chart-accent:var(--chart-5)] dark:[--chart-accent:var(--chart-1)] [--chart-muted:var(--chart-2)] dark:[--chart-muted:var(--chart-3)]';
