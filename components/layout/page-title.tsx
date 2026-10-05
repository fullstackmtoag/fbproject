'use client';

import { usePathname } from 'next/navigation';
import { pageTitleFor } from './nav';

export function PageTitle() {
  const pathname = usePathname();
  return (
    <h1 className="truncate font-heading text-lg font-semibold tracking-tight md:text-xl">
      {pageTitleFor(pathname)}
    </h1>
  );
}
