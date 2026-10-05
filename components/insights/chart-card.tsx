import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { SectionCard } from '@/components/shared/section-card';

export interface ChartCardProps {
  title: ReactNode;
  description?: string;
  /** Optional element rendered top-right (badge, link...). */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

/** Shared SectionCard with a compact title/description header, for Insights blocks. */
export function ChartCard({ title, description, action, children, className, contentClassName }: ChartCardProps) {
  return (
    <SectionCard className={cn('flex flex-col gap-3', className)}>
      <header className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-heading text-base leading-snug font-semibold tracking-tight">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>
      <div className={cn('min-w-0', contentClassName)}>{children}</div>
    </SectionCard>
  );
}
