import type { SVGProps } from 'react';
import { cn } from '@/lib/utils';

export type LogoPlatform = 'facebook' | 'instagram';

const LABELS: Record<LogoPlatform, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
};

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

/** Colored platform mark with no text label. */
export function PlatformLogo({ platform, className }: { platform: LogoPlatform; className?: string }) {
  const Mark = platform === 'facebook' ? FacebookMark : InstagramMark;
  const label = LABELS[platform];

  return (
    <span
      className={cn(
        'inline-flex size-5 shrink-0 items-center justify-center rounded-md text-white',
        platform === 'facebook' ? 'bg-facebook' : 'bg-instagram-gradient',
        className,
      )}
      role="img"
      aria-label={label}
      title={label}
    >
      <Mark className="size-3" />
    </span>
  );
}
