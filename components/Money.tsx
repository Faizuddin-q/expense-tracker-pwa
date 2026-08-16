'use client';

import { useProfileStore } from '@/lib/profile-store';
import { money, moneyExact } from '@/lib/utils';

/**
 * Renders a rupee amount, or bullets when Hide amounts is on.
 * `precise` forces two decimals so columns of figures align.
 */
export const Money = ({
  value,
  className,
  precise = false,
}: {
  value: number;
  className?: string;
  precise?: boolean;
}) => {
  // Zustand needs no Provider, so this is `false` by default in the admin
  // dashboard too (which never mounts AppInit) — same fallback as before.
  const hideAmounts = useProfileStore((s) => s.hideAmounts);
  const format = precise ? moneyExact : money;
  return <span className={className}>{format(value, hideAmounts)}</span>;
};
