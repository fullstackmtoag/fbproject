import type { CSSProperties, ReactNode } from 'react';
import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { ScrollToTop } from '@/components/layout/ScrollToTop';
import { NavLinks, NavLinksSkeleton } from '@/components/layout/nav-links';
import { Sidebar } from '@/components/layout/sidebar';
import { TopBar } from '@/components/layout/top-bar';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const collapsed = (await cookies()).get('sidebar_collapsed')?.value === '1';

  return (
    <div
      id="app-shell"
      className="h-dvh overflow-hidden bg-background text-foreground"
      style={{ '--sidebar-w': collapsed ? '4rem' : '16rem' } as CSSProperties}
    >
      <Sidebar initialCollapsed={collapsed}>
        <Suspense fallback={<NavLinksSkeleton collapsed={collapsed} />}>
          <NavLinks />
        </Suspense>
      </Sidebar>
      <div className="flex h-dvh min-w-0 flex-col pl-0 transition-[padding] duration-200 md:pl-[var(--sidebar-w)]">
        <TopBar />
        <main
          id="app-scroll"
          className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain bg-background"
        >
          <ScrollToTop />
          <div className="mx-auto w-full max-w-7xl space-y-6 px-4 pt-4 pb-10 md:px-6 md:pt-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
