import { LucideIcon, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

type Size = 'xs' | 'sm' | 'md';

const sizeMap: Record<
  Size,
  { box: string; icon: string; radius: string }
> = {
  xs: { box: 'size-5', icon: 'size-3', radius: 'rounded' },
  sm: { box: 'size-6', icon: 'size-3.5', radius: 'rounded-md' },
  md: { box: 'size-7', icon: 'size-4', radius: 'rounded-md' },
};

/**
 * Category identity: lucide icon on the category color.
 * Use instead of a bare color dot so categories stay recognizable at a glance.
 */
export const CategoryIcon = ({
  color,
  icon: Icon,
  size = 'sm',
  className,
}: {
  color: string;
  icon?: LucideIcon;
  size?: Size;
  className?: string;
}) => {
  const IconComponent = Icon || Plus;
  const s = sizeMap[size];
  return (
    <span
      aria-hidden
      className={cn(
        'grid shrink-0 place-items-center text-white',
        s.box,
        s.radius,
        className
      )}
      style={{ backgroundColor: color }}
    >
      <IconComponent className={s.icon} strokeWidth={2} />
    </span>
  );
};
