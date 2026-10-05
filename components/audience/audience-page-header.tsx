import { PlatformLogo } from '@/components/shared/platform-logo';

export function AudiencePageHeader() {
  return (
    <header className="min-w-0">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">Audience</h1>
      <p className="mt-1 flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
        <PlatformLogo platform="instagram" className="size-4 [&>svg]:size-2.5" />
        <span className="min-w-0">Who follows the account: growth, demographics and daily reach.</span>
      </p>
    </header>
  );
}
