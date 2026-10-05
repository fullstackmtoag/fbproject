// Pure formatting helpers. Safe to import from both Server and Client Components.
//
// Timezone note: APP_TIMEZONE has no NEXT_PUBLIC_ prefix, so it is only defined
// on the server. In client bundles the date helpers fall back to
// DEFAULT_TIMEZONE. Prefer formatting dates in Server Components (or pass an
// already formatted string down to Client Components).

export const DEFAULT_TIMEZONE = 'Asia/Kolkata';

export function appTimezone(): string {
  return process.env.APP_TIMEZONE || DEFAULT_TIMEZONE;
}

/** Placeholder shown for missing (NULL) values. */
export const EMPTY_VALUE = '\u2014'; // em dash

type Numberish = number | string | null | undefined;

function toNumber(value: Numberish): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

// ---------------------------------------------------------------------------
// Numbers
// ---------------------------------------------------------------------------

const compactFormatter = new Intl.NumberFormat('en', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

const fullFormatter = new Intl.NumberFormat('en', { maximumFractionDigits: 1 });

/** 1234 -> "1.2K", 1_500_000 -> "1.5M", null -> "—". */
export function formatCompact(value: Numberish): string {
  const n = toNumber(value);
  if (n === null) return EMPTY_VALUE;
  return compactFormatter.format(n);
}

/** 1234567.8 -> "1,234,567.8", null -> "—". */
export function formatNumber(value: Numberish): string {
  const n = toNumber(value);
  if (n === null) return EMPTY_VALUE;
  return fullFormatter.format(n);
}

/** 12.345 -> "+12.3%", -3 -> "-3%", 0 -> "0%", null -> "—". */
export function formatPercentChange(change: Numberish): string {
  const n = toNumber(change);
  if (n === null) return EMPTY_VALUE;
  const rounded = Math.round(n * 10) / 10;
  const sign = rounded > 0 ? '+' : '';
  return `${sign}${fullFormatter.format(rounded)}%`;
}

/** 0.4567 -> "45.7%" (for shares of a whole, e.g. audience splits). */
export function formatPercent(ratio: Numberish, digits = 1): string {
  const n = toNumber(ratio);
  if (n === null) return EMPTY_VALUE;
  return `${(n * 100).toFixed(digits)}%`;
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

type DateInput = string | number | Date | null | undefined;

function toDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export interface DateFormatOptions {
  timeZone?: string;
}

/** "Oct 1, 2026" in APP_TIMEZONE. */
export function formatDate(value: DateInput, opts: DateFormatOptions = {}): string {
  const d = toDate(value);
  if (!d) return EMPTY_VALUE;
  return new Intl.DateTimeFormat('en-US', {
    timeZone: opts.timeZone ?? appTimezone(),
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d);
}

/** "Oct 1, 2026, 4:49 PM" in APP_TIMEZONE. */
export function formatDateTime(value: DateInput, opts: DateFormatOptions = {}): string {
  const d = toDate(value);
  if (!d) return EMPTY_VALUE;
  return new Intl.DateTimeFormat('en-US', {
    timeZone: opts.timeZone ?? appTimezone(),
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d);
}

/** "Oct 1" (no year) in APP_TIMEZONE; handy for chart axes. */
export function formatShortDate(value: DateInput, opts: DateFormatOptions = {}): string {
  const d = toDate(value);
  if (!d) return EMPTY_VALUE;
  return new Intl.DateTimeFormat('en-US', {
    timeZone: opts.timeZone ?? appTimezone(),
    month: 'short',
    day: 'numeric',
  }).format(d);
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Compact relative time: "just now", "5 min ago", "3 h ago", "2 d ago".
 * Falls back to an absolute date after 7 days. Future dates read "in 5 min".
 */
export function formatRelativeTime(
  value: DateInput,
  now: DateInput = new Date(),
  opts: DateFormatOptions = {},
): string {
  const d = toDate(value);
  const ref = toDate(now);
  if (!d || !ref) return EMPTY_VALUE;

  const diff = ref.getTime() - d.getTime();
  const abs = Math.abs(diff);
  const suffix = (text: string) => (diff >= 0 ? `${text} ago` : `in ${text}`);

  if (abs < 45_000) return 'just now';
  if (abs < HOUR) return suffix(`${Math.max(1, Math.round(abs / MINUTE))} min`);
  if (abs < DAY) return suffix(`${Math.round(abs / HOUR)} h`);
  if (abs < 7 * DAY) return suffix(`${Math.round(abs / DAY)} d`);
  return formatDate(d, opts);
}
