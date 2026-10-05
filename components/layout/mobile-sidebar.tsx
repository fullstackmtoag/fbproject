'use client';

import { Suspense, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Brand } from './brand';
import { NavLinks, NavLinksSkeleton } from './nav-links';
import { SidebarFooter } from './sidebar';

/** Hamburger button + slide-in drawer. Only rendered below the `md` breakpoint. */
export function MobileSidebar() {
  const [open, setOpen] = useState(false);

  // Close on Escape and lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const scroller = document.getElementById('app-scroll');
    const prevBody = document.body.style.overflow;
    const prevScroller = scroller?.style.overflow ?? '';
    document.body.style.overflow = 'hidden';
    if (scroller) scroller.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevBody;
      if (scroller) scroller.style.overflow = prevScroller;
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Open navigation"
        aria-expanded={open}
        aria-controls="mobile-nav"
        onClick={() => setOpen(true)}
      >
        <Menu />
      </Button>

      {/* Portaled to <body> so the shell's overflow:hidden cannot clip the sheet. */}
      {open
        ? createPortal(
            <div
              className="fixed inset-0 z-50 flex md:hidden"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation"
            >
              <button
                type="button"
                aria-label="Close navigation"
                className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-in fade-in-0"
                onClick={() => setOpen(false)}
              />
              <div
                id="mobile-nav"
                className="relative flex h-full w-72 max-w-[85vw] flex-col border-r bg-sidebar text-sidebar-foreground shadow-xl animate-in slide-in-from-left duration-200"
              >
                <div className="flex h-14 shrink-0 items-center justify-between border-b px-4">
                  <Brand />
                  <Button variant="ghost" size="icon" aria-label="Close navigation" onClick={() => setOpen(false)}>
                    <X />
                  </Button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto p-3">
                  <Suspense fallback={<NavLinksSkeleton />}>
                    <NavLinks onNavigate={() => setOpen(false)} />
                  </Suspense>
                </div>
                <SidebarFooter collapsed={false} />
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
