'use client';

import type { ReactNode } from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/** Small "i" chip that shows an explanatory tooltip on hover or focus. */
export function InfoTip({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        aria-label={label}
        className={cn(
          'inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50',
          className,
        )}
      >
        <Info className="size-[15px]" aria-hidden />
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-56 text-left">
        {children}
      </TooltipContent>
    </Tooltip>
  );
}
