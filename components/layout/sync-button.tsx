'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, CircleAlert, LoaderCircle, RefreshCw, TriangleAlert, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PlatformBadge } from '@/components/dashboard/platform-badge';
import { Button } from '@/components/ui/button';

// Shape returned by POST /api/sync (see lib/sync.ts SyncAllResult). Kept loose
// on purpose: the UI must survive a malformed or partial response.
type PlatformOutcome = { error: string } | { warnings?: string[] } | undefined;

interface SyncResponse {
  status?: 'ok' | 'partial' | 'failed';
  facebook?: PlatformOutcome;
  instagram?: PlatformOutcome;
  durationMs?: number;
  error?: string;
}

interface SyncOutcome {
  status: 'ok' | 'partial' | 'failed';
  title: string;
  lines: string[];
}

const AUTO_DISMISS_MS = 6_000;

function SyncLine({ text }: { text: string }) {
  const parts = text.split(/(\{\{facebook\}\}|\{\{instagram\}\})/g);
  return parts.map((part, index) => {
    if (part === '{{facebook}}') return <PlatformBadge key={index} platform="facebook" size="sm" className="mx-0.5 align-[-3px]" />;
    if (part === '{{instagram}}') return <PlatformBadge key={index} platform="instagram" size="sm" className="mx-0.5 align-[-3px]" />;
    return <span key={index}>{part}</span>;
  });
}

function summarize(body: SyncResponse | null, httpOk: boolean): SyncOutcome {
  const status = body?.status ?? (httpOk ? 'ok' : 'failed');
  const lines: string[] = [];

  for (const [name, outcome] of [
    ['{{facebook}}', body?.facebook],
    ['{{instagram}}', body?.instagram],
  ] as const) {
    if (!outcome) continue;
    if ('error' in outcome && outcome.error) {
      lines.push(`${name} failed: ${outcome.error}`);
    } else if ('warnings' in outcome && outcome.warnings?.length) {
      for (const w of outcome.warnings) lines.push(`${name}: ${w}`);
    }
  }
  if (body?.error) lines.push(body.error);

  if (status === 'failed') {
    return { status, title: 'Sync failed', lines: lines.length ? lines : ['Nothing was updated.'] };
  }
  if (status === 'partial') {
    return { status, title: 'Partial sync', lines };
  }
  const seconds = body?.durationMs ? ` in ${(body.durationMs / 1000).toFixed(1)}s` : '';
  return {
    status: 'ok',
    title: lines.length ? `Synced${seconds} with ${lines.length} warning${lines.length === 1 ? '' : 's'}` : `Synced${seconds}`,
    lines,
  };
}

const TONE: Record<SyncOutcome['status'], { box: string; icon: typeof Check }> = {
  ok: { box: 'border-success/40 bg-success/10 text-foreground', icon: Check },
  partial: { box: 'border-warning/50 bg-warning/15 text-foreground', icon: TriangleAlert },
  failed: { box: 'border-destructive/40 bg-destructive/10 text-foreground', icon: CircleAlert },
};

/** Triggers POST /api/sync, shows an inline result, then refreshes server data. */
export function SyncButton({ className }: { className?: string }) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [outcome, setOutcome] = useState<SyncOutcome | null>(null);

  // Successful, warning-free syncs dismiss themselves; anything else stays until closed.
  useEffect(() => {
    if (!outcome || outcome.status !== 'ok' || outcome.lines.length > 0) return;
    const id = setTimeout(() => setOutcome(null), AUTO_DISMISS_MS);
    return () => clearTimeout(id);
  }, [outcome]);

  async function runSync() {
    if (running) return;
    setRunning(true);
    setOutcome(null);
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      const body = (await res.json().catch(() => null)) as SyncResponse | null;
      setOutcome(summarize(body, res.ok));
    } catch {
      setOutcome({ status: 'failed', title: 'Sync failed', lines: ['Could not reach the server.'] });
    } finally {
      setRunning(false);
      // Re-render Server Components (last-synced badge, page data) with fresh DB state.
      router.refresh();
    }
  }

  const Icon = outcome ? TONE[outcome.status].icon : null;

  return (
    <div className={cn('relative', className)}>
      <Button size="sm" onClick={runSync} disabled={running} aria-busy={running} aria-live="polite">
        {running ? <LoaderCircle className="animate-spin" aria-hidden /> : <RefreshCw aria-hidden />}
        <span className="hidden sm:inline">{running ? 'Syncing…' : 'Sync now'}</span>
        <span className="sr-only sm:hidden">{running ? 'Syncing' : 'Sync now'}</span>
      </Button>

      {outcome && Icon ? (
        <div
          role="status"
          className={cn(
            'absolute right-0 top-full z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-lg border p-3 text-sm shadow-lg animate-in fade-in-0 slide-in-from-top-1',
            TONE[outcome.status].box,
          )}
        >
          <div className="flex items-start gap-2">
            <Icon
              className={cn(
                'mt-0.5 size-4 shrink-0',
                outcome.status === 'ok' && 'text-success',
                outcome.status === 'partial' && 'text-amber-700 dark:text-amber-300',
                outcome.status === 'failed' && 'text-destructive',
              )}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="font-medium">{outcome.title}</p>
              {outcome.lines.length > 0 ? (
                <ul className="mt-1 max-h-40 space-y-1 overflow-y-auto text-xs text-muted-foreground">
                  {outcome.lines.map((line, i) => (
                    <li key={i} className="break-words">
                      <SyncLine text={line} />
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Dismiss"
              className="-mr-1 -mt-1 shrink-0"
              onClick={() => setOutcome(null)}
            >
              <X />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
