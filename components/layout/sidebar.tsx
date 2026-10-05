'use client';

import { createContext, useContext, useLayoutEffect, useState, type ReactElement, type ReactNode } from 'react';
import Image from 'next/image';
import { LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { PlatformBadge } from '@/components/dashboard/platform-badge';
import { buttonVariants } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Brand } from './brand';
import { ThemeToggle } from './theme-toggle';

const CollapsedContext = createContext(false);

export function useSidebarCollapsed() {
  return useContext(CollapsedContext);
}

const EXPANDED_WIDTH = '16rem';
const COLLAPSED_WIDTH = '4rem';

function writeCollapsedCookie(collapsed: boolean) {
  document.cookie = `sidebar_collapsed=${collapsed ? '1' : '0'}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

function RailTip({ label, children }: { label: string; children: ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger delay={200} render={children} />
      <TooltipContent side="right" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function CompanyBlock({ collapsed }: { collapsed: boolean }) {
  const block = (
    <div
      className={cn(
        'flex items-center gap-2.5 rounded-lg',
        collapsed ? 'size-10 justify-center' : 'px-2 py-1.5',
      )}
    >
      <Image
        src="/Mtoag_logo.png"
        alt=""
        width={32}
        height={32}
        className="size-8 shrink-0 rounded-full object-cover"
      />
      {collapsed ? (
        <span className="sr-only">Mtoag</span>
      ) : (
        <span className="min-w-0 truncate text-sm font-medium tracking-tight">Mtoag</span>
      )}
    </div>
  );

  if (!collapsed) return block;
  return <RailTip label="Mtoag">{block}</RailTip>;
}

function LogoutButton({ collapsed }: { collapsed: boolean }) {
  const button = (
    <button
      type="button"
      aria-label="Log out"
      className={cn(
        'flex items-center rounded-lg text-[0.9375rem] font-medium tracking-tight whitespace-nowrap text-muted-foreground outline-none transition-colors',
        'hover:bg-sidebar-accent/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
        collapsed ? 'size-10 justify-center' : 'w-full gap-3 px-3 py-2.5',
      )}
    >
      <LogOut className="size-4 shrink-0" aria-hidden />
      {collapsed ? <span className="sr-only">Log out</span> : 'Log out'}
    </button>
  );

  if (!collapsed) return button;
  return <RailTip label="Log out">{button}</RailTip>;
}

/** Pinned bottom of the desktop rail and the mobile sheet. */
export function SidebarFooter({ collapsed }: { collapsed: boolean }) {
  return (
    <div className={cn('mt-auto flex shrink-0 flex-col gap-1 border-t p-2', collapsed && 'items-center')}>
      <div className={cn('flex items-center gap-2', collapsed ? 'justify-center py-1' : 'px-2 py-1')}>
        <PlatformBadge platform="facebook" size="sm" />
        <PlatformBadge platform="instagram" size="sm" />
      </div>
      <CompanyBlock collapsed={collapsed} />
      {collapsed ? (
        <ThemeToggle title="Toggle dark mode" />
      ) : (
        <div className="flex items-center gap-2 px-1">
          <ThemeToggle title="Toggle dark mode" />
          <span className="text-sm font-medium text-muted-foreground">Theme</span>
        </div>
      )}
      <LogoutButton collapsed={collapsed} />
    </div>
  );
}

/** Desktop sidebar. Hidden on mobile, where `MobileSidebar` takes over. */
export function Sidebar({ initialCollapsed, children }: { initialCollapsed: boolean; children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  useLayoutEffect(() => {
    document.getElementById('app-shell')?.style.setProperty('--sidebar-w', collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH);
  }, [collapsed]);

  function toggle() {
    const next = !collapsed;
    writeCollapsedCookie(next);
    setCollapsed(next);
  }

  const toggleButton = (
    <button
      type="button"
      aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      aria-expanded={!collapsed}
      aria-controls="sidebar-nav"
      onClick={toggle}
      title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      className={buttonVariants({ variant: 'ghost', size: 'icon' })}
    >
      {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
    </button>
  );

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden h-dvh w-[var(--sidebar-w)] flex-col overflow-hidden border-r bg-sidebar text-sidebar-foreground transition-[width] duration-200 md:flex">
      <TooltipProvider>
        <CollapsedContext.Provider value={collapsed}>
        <div className="flex h-full flex-col">
          <div className="flex shrink-0 flex-col border-b">
            <div className={cn('flex h-14 items-center', collapsed ? 'justify-center px-2' : 'gap-2 px-3')}>
              {!collapsed && <Brand className="min-w-0 flex-1" />}
              {toggleButton}
            </div>
            {collapsed && (
              <div className="flex justify-center px-2 pb-3">
                <RailTip label="Mtoag Insights">
                  <Brand collapsed />
                </RailTip>
              </div>
            )}
          </div>

          <div id="sidebar-nav" className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-3">
            {children}
          </div>

          <SidebarFooter collapsed={collapsed} />
        </div>
        </CollapsedContext.Provider>
      </TooltipProvider>
    </aside>
  );
}
