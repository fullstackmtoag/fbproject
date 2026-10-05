import { cache } from 'react';
import { connection } from 'next/server';
import { CircleAlert, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { getLastSync } from '@/lib/queries';
import { formatDateTime } from '@/lib/format';
import { LastSyncedBadge } from './last-synced-badge';

// The badge is rendered twice (desktop + mobile slot); dedupe to one query per request.
const getLastSyncOnce = cache(getLastSync);

const pillClass =
  'inline-flex h-7 items-center gap-1.5 rounded-full border bg-background px-2.5 text-xs text-muted-foreground';

/**
 * Server Component: reads the latest sync_runs row and renders the badge.
 * Wrap in <Suspense fallback={<LastSyncedSkeleton />}> so the shell never blocks on the DB.
 */
export async function LastSynced({ className }: { className?: string }) {
  // The dashboard is always rendered per request (never prerendered at build).
  await connection();

  let run: Awaited<ReturnType<typeof getLastSync>> = null;
  let failed = false;
  try {
    run = await getLastSyncOnce();
  } catch {
    failed = true;
  }

  if (failed) {
    return (
      <span className={cn(pillClass, 'border-destructive/30 text-destructive', className)} role="status">
        <CircleAlert className="size-3.5" aria-hidden />
        Sync status unavailable
      </span>
    );
  }

  if (!run) {
    return (
      <span className={cn(pillClass, className)} role="status" title="No sync has run yet">
        <Clock className="size-3.5" aria-hidden />
        Never synced
      </span>
    );
  }

  const at = run.finishedAt ?? run.startedAt;
  return <LastSyncedBadge at={at} status={run.status} absolute={formatDateTime(at)} className={className} />;
}

export function LastSyncedSkeleton({ className }: { className?: string }) {
  return <Skeleton className={cn('h-7 w-36 rounded-full', className)} aria-hidden />;
}
