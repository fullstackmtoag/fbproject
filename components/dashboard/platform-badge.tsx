import type { SVGProps } from 'react';
import { cn } from '@/lib/utils';

export type BadgePlatform = 'facebook' | 'instagram';

export interface PlatformBadgeProps {
  platform: BadgePlatform;
  /** `badge` = pill with label (default); `icon` = just the colored mark. */
  variant?: 'badge' | 'icon';
  size?: 'sm' | 'default';
  className?: string;
}

const LABELS: Record<BadgePlatform, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
};

// lucide-react 1.x no longer ships brand icons, so these are minimal inline marks.
function FacebookMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M13.5 21v-7.2h2.4l.4-2.9h-2.8V9.1c0-.8.2-1.4 1.4-1.4h1.5V5.1c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2.1H8v2.9h2.5V21h3Z" />
    </svg>
  );
}

function InstagramMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.75" fill="currentColor" />
    </svg>
  );
}

export function PlatformBadge({
  platform,
  variant = 'badge',
  size = 'default',
  className,
}: PlatformBadgeProps) {
  const Mark = platform === 'facebook' ? FacebookMark : InstagramMark;
  const colors = platform === 'facebook' ? 'bg-facebook text-white' : 'bg-instagram-gradient text-white';
  const label = LABELS[platform];
  const compact = variant === 'icon' || size === 'sm';

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-md',
        compact ? 'size-5' : 'size-6',
        colors,
        className,
      )}
      role="img"
      aria-label={label}
      title={label}
    >
      <Mark className={compact ? 'size-3.5' : 'size-4'} />
    </span>
  );
}
