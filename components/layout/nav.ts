import type { LucideIcon } from 'lucide-react';
import { FileText, LayoutDashboard, Lightbulb, Users } from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/posts', label: 'Posts', icon: FileText },
  { href: '/insights', label: 'Insights', icon: Lightbulb },
  { href: '/audience', label: 'Audience', icon: Users },
];

export function isNavActive(href: string, pathname: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function pageTitleFor(pathname: string): string {
  return NAV_ITEMS.find((item) => isNavActive(item.href, pathname))?.label ?? 'Dashboard';
}
