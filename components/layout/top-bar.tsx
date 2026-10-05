import { Suspense } from 'react';
import { Filters, FiltersSkeleton } from './filters';
import { LastSynced, LastSyncedSkeleton } from './last-synced';
import { LogoutButton } from './logout-button';
import { MobileSidebar } from './mobile-sidebar';
import { PageTitle } from './page-title';
import { SyncButton } from './sync-button';
import { TokenBanner } from './token-banner';

/**
 * Two-row header:
 *  1. token warning · menu (mobile) · page title · last synced · sync · log out
 *  2. platform tabs · date range
 */
export function TopBar() {
  return (
    <header className="shrink-0 border-b bg-background">
      <TokenBanner />
      <div className="flex h-14 items-center gap-2 px-4 md:px-6">
        <MobileSidebar />
        <PageTitle />
        <div className="ml-auto flex items-center gap-2">
          <Suspense fallback={<LastSyncedSkeleton className="hidden sm:block" />}>
            <LastSynced className="hidden sm:inline-flex" />
          </Suspense>
          <SyncButton />
          <LogoutButton />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t px-4 py-2 md:px-6">
        <Suspense fallback={<FiltersSkeleton />}>
          <Filters />
        </Suspense>
        <Suspense fallback={<LastSyncedSkeleton className="ml-auto sm:hidden" />}>
          <LastSynced className="ml-auto sm:hidden" />
        </Suspense>
      </div>
    </header>
  );
}
