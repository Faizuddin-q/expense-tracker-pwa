import { cn } from '@/lib/utils';

/**
 * Proportion bar for budget and category breakdowns. Deliberately thin —
 * it encodes a value, it is not a decorative element.
 */
export const Bar = ({
  value,
  color,
  className,
  trackClassName,
}: {
  /** 0–100 */
  value: number;
  color?: string;
  className?: string;
  trackClassName?: string;
}) => {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div
      className={cn(
        'h-1 w-full overflow-hidden rounded-full bg-muted',
        trackClassName,
        className
      )}
    >
      <div
        className="h-full rounded-full transition-[width] duration-500 ease-[var(--ease-out)]"
        style={{ width: `${pct}%`, backgroundColor: color ?? 'var(--primary)' }}
      />
    </div>
  );
};
