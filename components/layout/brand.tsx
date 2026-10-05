import type { ComponentProps } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export function Brand({
  className,
  collapsed = false,
  ...props
}: { className?: string; collapsed?: boolean } & Omit<ComponentProps<typeof Link>, 'href' | 'className'>) {
  return (
    <Link
      href="/"
      {...props}
      className={cn(
        'flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring',
        collapsed && 'justify-center',
        className,
      )}
    >
      <Image
        src="/Mtoag_logo.png"
        alt=""
        width={32}
        height={32}
        priority
        className="size-8 shrink-0 rounded-md"
      />
      {collapsed ? (
        <span className="sr-only">Mtoag Insights</span>
      ) : (
        <span className="truncate font-heading text-lg font-semibold tracking-tight">Mtoag Insights</span>
      )}
    </Link>
  );
}
