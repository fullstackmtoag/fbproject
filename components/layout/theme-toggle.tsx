'use client';

import type { ComponentProps } from 'react';
import { useLayoutEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Theme = 'light' | 'dark';
type ButtonProps = ComponentProps<typeof Button>;

function readTheme(): Theme {
  try {
    const stored = localStorage.getItem('theme');
    if (stored === 'dark' || stored === 'light') return stored;
  } catch {
    // localStorage unavailable (private mode, etc.)
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

/**
 * Light / dark switch. The initial theme is applied by an inline script in
 * app/layout.tsx before first paint; this component only toggles and persists it.
 * Both icons are rendered and swapped with CSS, so no client state is needed
 * and there is nothing to mismatch during hydration.
 */
export function ThemeToggle({ onClick, title = 'Toggle dark mode', ...props }: ButtonProps) {
  // React Strict Mode (dev only) remounts once and resets <html className>,
  // which drops the class the inline script added. Re-apply before paint.
  useLayoutEffect(() => {
    applyTheme(readTheme());
  }, []);

  function toggle(event: Parameters<NonNullable<ButtonProps['onClick']>>[0]) {
    onClick?.(event);
    const next: Theme = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
    applyTheme(next);
    try {
      localStorage.setItem('theme', next);
    } catch {
      // Ignore; the choice simply won't persist.
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle dark mode"
      title={title || undefined}
      {...props}
      onClick={toggle}
    >
      <Sun className="dark:hidden" aria-hidden />
      <Moon className="hidden dark:block" aria-hidden />
    </Button>
  );
}
