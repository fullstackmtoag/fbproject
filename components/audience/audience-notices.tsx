import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PlatformLogo } from '@/components/shared/platform-logo';
import { SectionCard } from '@/components/shared/section-card';

/** Shown when Meta has not exposed any demographic breakdown yet. */
export function DemographicsUnavailable({ className }: { className?: string }) {
  return (
    <SectionCard className={cn('flex min-h-40 flex-col items-center justify-center gap-2 px-6 py-10 text-center', className)}>
      <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Users className="size-5" aria-hidden />
      </span>
      <p className="text-sm font-medium">Audience details are not available yet</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        Age, gender and location breakdowns usually need 100 or more followers. They appear after the next sync once
        that threshold is met.
      </p>
    </SectionCard>
  );
}

/** Shown on the Facebook tab: Pages have no audience breakdown in the API. */
export function PlatformUnavailableNotice({ className }: { className?: string }) {
  return (
    <SectionCard className={cn('flex items-start gap-3', className)}>
      <PlatformLogo platform="facebook" className="mt-0.5" />
      <div className="min-w-0">
        <p className="text-sm font-medium">Audience breakdowns are not available for this platform</p>
        <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-muted-foreground">
          Meta does not expose follower history or demographics for Pages through the API. Switch the platform filter
          to see the audience of the business account.
        </p>
      </div>
    </SectionCard>
  );
}
