'use client';

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/format';

interface LastSyncedBadgeProps {
  /** ISO timestamp of the last sync run (finished_at, or started_at if still running). */
  at: string;
  status: string | null;
  /** Absolute time already formatted in APP_TIMEZONE on the server (used for the tooltip). */
  absolute: string;
  className?: string;
}

const STATUS_DOT: Record<string, string> = {
  ok: 'bg-success',
  partial: 'bg-warning',
  failed: 'bg-destructive',
  running: 'bg-facebook animate-pulse',
};

/** "Last synced 5 min ago" pill that re-renders every minute so it never goes stale. */
export function LastSyncedBadge({ at, status, absolute, className }: LastSyncedBadgeProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const running = status === 'running';
  const label = running ? 'Sync in progress' : `Last synced ${formatRelativeTime(at, now)}`;
  const statusText = status ? `Status: ${status}` : '';

  return (
    <span
      title={`${absolute}${statusText ? ` · ${statusText}` : ''}`}
      className={cn(
        'inline-flex h-7 items-center gap-1.5 rounded-full border bg-background px-2.5 text-xs text-muted-foreground',
        className,
      )}
    >
      <span className={cn('size-1.5 rounded-full', STATUS_DOT[status ?? ''] ?? 'bg-muted-foreground')} aria-hidden />
      <Clock className="size-3.5" aria-hidden />
      {/* Server and client clocks differ by a few ms; the text is corrected on the next tick. */}
      <span suppressHydrationWarning>{label}</span>
    </span>
  );
}
