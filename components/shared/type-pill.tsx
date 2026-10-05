import { cn } from '@/lib/utils';

function typeLabel(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export function TypePill({ type, className }: { type: string | null; className?: string }) {
  if (!type) return <span className="text-muted-foreground">—</span>;

  return (
    <span
      className={cn(
        'inline-flex h-5 max-w-full items-center truncate rounded-full border border-border bg-muted px-1.5 text-[10px] font-medium text-foreground capitalize',
        className,
      )}
    >
      {typeLabel(type)}
    </span>
  );
}
