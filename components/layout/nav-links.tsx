'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { isNavActive, NAV_ITEMS } from './nav';
import { useSidebarCollapsed } from './sidebar';

interface NavLinksProps {
  /** Called after a link is clicked (used to close the mobile drawer). */
  onNavigate?: () => void;
  className?: string;
  /** Icon-only rail. Labels move into a tooltip on the right. */
  collapsed?: boolean;
}

/**
 * Sidebar navigation with active state. Keeps the current ?platform=&days=
 * filters when moving between pages so the boss never loses context.
 */
export function NavLinks({ onNavigate, className, collapsed }: NavLinksProps) {
  const sidebarCollapsed = useSidebarCollapsed();
  const collapsedState = collapsed ?? sidebarCollapsed;
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();

  return (
    <TooltipProvider>
      <nav aria-label="Main" className={cn('flex flex-col gap-1', collapsedState && 'items-center', className)}>
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isNavActive(href, pathname);
          const itemClass = cn(
            'flex items-center rounded-lg text-[0.9375rem] font-medium tracking-tight whitespace-nowrap transition-colors outline-none',
            'focus-visible:ring-2 focus-visible:ring-ring',
            collapsedState ? 'size-10 justify-center' : 'w-full gap-3 px-3 py-2.5',
            active
              ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm ring-1 ring-foreground/5'
              : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground',
          );
          const icon = (
            <Icon className={cn('size-4 shrink-0', active ? 'text-foreground' : 'text-muted-foreground')} aria-hidden />
          );

          if (!collapsedState) {
            return (
              <Link
                key={href}
                href={search ? `${href}?${search}` : href}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                className={itemClass}
              >
                {icon}
                {label}
              </Link>
            );
          }

          return (
            <Tooltip key={href}>
              <TooltipTrigger
                delay={200}
                render={
                  <Link
                    href={search ? `${href}?${search}` : href}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    aria-label={label}
                    className={itemClass}
                  />
                }
              >
                {icon}
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                {label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </nav>
    </TooltipProvider>
  );
}

export function NavLinksSkeleton({ className, collapsed = false }: { className?: string; collapsed?: boolean }) {
  return (
    <div className={cn('flex flex-col gap-1', collapsed && 'items-center', className)} aria-hidden>
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
        <div
          key={href}
          className={cn(
            'flex items-center rounded-lg text-[0.9375rem] font-medium tracking-tight whitespace-nowrap text-muted-foreground',
            collapsed ? 'size-10 justify-center' : 'w-full gap-3 px-3 py-2.5',
          )}
        >
          <Icon className="size-4 shrink-0" />
          {collapsed ? <span className="sr-only">{label}</span> : label}
        </div>
      ))}
    </div>
  );
}
