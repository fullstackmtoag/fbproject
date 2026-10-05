'use client';

import { useLayoutEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Scrolls the dashboard content pane to the top when the path changes.
 * Search-param updates (platform tab, date range) do not change the pathname,
 * so they keep the current scroll position.
 */
export function ScrollToTop() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    document.getElementById('app-scroll')?.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
