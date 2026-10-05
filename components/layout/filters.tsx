'use client';

import { useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

// Mirrors PLATFORMS / DAYS_OPTIONS / DEFAULT_FILTERS in lib/queries.ts
// (that module is server-only, so the values are repeated here for the client).
const PLATFORM_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
] as const;

const RANGE_OPTIONS = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '365', label: 'Last year' },
  { value: '0', label: 'All time' },
] as const;

const DEFAULT_PLATFORM = 'all';
const DEFAULT_DAYS = '30';

type PlatformValue = (typeof PLATFORM_OPTIONS)[number]['value'];
type RangeValue = (typeof RANGE_OPTIONS)[number]['value'];

function readPlatform(raw: string | null): PlatformValue {
  return PLATFORM_OPTIONS.find((o) => o.value === raw)?.value ?? DEFAULT_PLATFORM;
}

function readDays(raw: string | null): RangeValue {
  return RANGE_OPTIONS.find((o) => o.value === raw)?.value ?? DEFAULT_DAYS;
}

function PlatformDot({ value }: { value: PlatformValue }) {
  if (value === 'all') return null;
  return (
    <span
      aria-hidden
      className={cn(
        'size-2 shrink-0 rounded-full',
        value === 'facebook' ? 'bg-facebook' : 'bg-instagram-gradient',
      )}
    />
  );
}

/**
 * Platform tabs + date range select. State lives in the URL (?platform=&days=)
 * so pages (Server Components) can read it from `searchParams`.
 */
export function Filters({ className }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const platform = readPlatform(searchParams.get('platform'));
  const days = readDays(searchParams.get('days'));

  function update(key: 'platform' | 'days', value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  return (
    <div
      className={cn('flex flex-wrap items-center gap-2 transition-opacity', isPending && 'opacity-70', className)}
      data-pending={isPending || undefined}
    >
      <Tabs value={platform} onValueChange={(value) => update('platform', String(value))}>
        <TabsList aria-label="Platform">
          {PLATFORM_OPTIONS.map((option) => (
            <TabsTrigger key={option.value} value={option.value} className="px-2.5">
              <PlatformDot value={option.value} />
              {option.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Select
        items={RANGE_OPTIONS}
        value={days}
        onValueChange={(value) => {
          if (value) update('days', String(value));
        }}
      >
        <SelectTrigger size="sm" aria-label="Date range" className="w-37 bg-background">
          <CalendarDays className="text-muted-foreground" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          {RANGE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function FiltersSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)} aria-hidden>
      <Skeleton className="h-8 w-56 rounded-lg" />
      <Skeleton className="h-7 w-37 rounded-lg" />
    </div>
  );
}
