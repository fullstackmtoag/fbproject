import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface SectionCardProps {
  children: ReactNode;
  className?: string;
  /** No inner padding, so a table can sit flush against the card edge. */
  flush?: boolean;
}

export function SectionCard({ children, className, flush = false }: SectionCardProps) {
  return (
    <section
      className={cn(
        'min-w-0 rounded-[12px] border border-border bg-card text-card-foreground',
        flush ? 'overflow-hidden p-0' : 'p-3',
        className,
      )}
    >
      {children}
    </section>
  );
}
