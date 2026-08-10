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
        className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg py-1.5 transition-colors ${
          active
            ? 'text-primary'
            : 'text-faint active:text-muted-foreground'
        }`}
      >
        <span
          className={`grid size-7 place-items-center rounded-lg ${
            active ? 'bg-primary/12' : ''
          }`}
        >
          <Icon className="size-[18px]" strokeWidth={active ? 2.2 : 1.8} />
        </span>
        <span className="max-w-full truncate text-[10px] leading-none font-medium">
          {displayLabel}
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`group flex h-8 w-full items-center gap-2.5 rounded-md px-2.5 text-[13px] font-medium transition-colors ${
        active
          ? 'bg-secondary text-foreground'
          : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
      }`}
    >
      <Icon
        className={`size-4 shrink-0 ${active ? 'text-primary' : 'text-faint group-hover:text-muted-foreground'}`}
        strokeWidth={1.9}
      />
      <span className="truncate">{displayLabel}</span>
    </Link>
  );
};
