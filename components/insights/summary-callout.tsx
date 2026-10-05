import { Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { PlatformLogo } from '@/components/shared/platform-logo';

const shell = 'min-w-0 rounded-[12px] border border-border bg-accent/50 p-3 text-card-foreground';

/** Replaces `{{facebook}}` / `{{instagram}}` placeholders with the platform mark. */
function SummaryText({ text }: { text: string }) {
  const parts = text.split(/(\{\{facebook\}\}|\{\{instagram\}\})/g);
  return parts.map((part, index) => {
    if (part === '{{facebook}}') return <PlatformLogo key={index} platform="facebook" className="mx-0.5 align-[-4px]" />;
    if (part === '{{instagram}}') return <PlatformLogo key={index} platform="instagram" className="mx-0.5 align-[-4px]" />;
    return <span key={index}>{part}</span>;
  });
}

export function SummaryCallout({
  sentences,
  description,
  className,
}: {
  sentences: string[];
  description: string;
  className?: string;
}) {
  return (
    <section aria-labelledby="insights-summary-heading" className={cn(shell, className)}>
      <div className="flex items-start gap-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-card text-foreground ring-1 ring-foreground/10">
          <Lightbulb className="size-[15px]" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="insights-summary-heading" className="font-heading text-base leading-snug font-semibold tracking-tight">
            Summary
          </h2>
          <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-muted-foreground">{description}</p>
          <ul className="mt-3 list-disc space-y-1.5 pl-4 text-sm leading-relaxed marker:text-muted-foreground">
            {sentences.map((sentence, index) => (
              <li key={index} className="pl-0.5">
                <SummaryText text={sentence} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function SummaryCalloutSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn(shell, className)} aria-busy>
      <div className="flex items-start gap-3">
        <Skeleton className="size-7 rounded-lg" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-64 max-w-full" />
          <div className="space-y-2 pt-1">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </div>
    </div>
  );
}
