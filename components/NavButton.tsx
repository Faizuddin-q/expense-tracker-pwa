'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LucideIcon } from 'lucide-react';

interface NavButtonProps {
  id: string;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
  href: string;
  mobile?: boolean;
}

export const NavButton = ({
  label,
  shortLabel,
  icon: Icon,
  href,
  mobile,
}: NavButtonProps) => {
  const pathname = usePathname();
  const active = pathname === href;
  const displayLabel = mobile ? (shortLabel ?? label) : label;

  if (mobile) {
    return (
      <Link
        href={href}
        aria-current={active ? 'page' : undefined}
        className={`relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-1.5 transition-colors duration-150 active:scale-[0.96] ${
          active
            ? 'text-primary'
            : 'text-muted-foreground active:text-foreground'
        }`}
      >
        <span
          className={`grid size-8 place-items-center rounded-xl transition-colors duration-150 ${
            active ? 'bg-primary/15' : 'bg-transparent'
          }`}
        >
          <Icon
            className={`size-5 transition-transform duration-150 ${
              active ? 'scale-105' : ''
            }`}
            strokeWidth={active ? 2.25 : 1.75}
          />
        </span>
        <span className="max-w-full truncate px-0.5 text-[10px] font-semibold leading-none tracking-wide">
          {displayLabel}
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`group relative flex w-full cursor-pointer items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-semibold transition duration-200 active:scale-[0.96] ${
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
      }`}
    >
      <Icon
        className={`size-4.5 shrink-0 transition-transform duration-200 ${
          active ? 'scale-105' : 'group-hover:scale-110'
        }`}
      />
      <span>{displayLabel}</span>
    </Link>
  );
};
