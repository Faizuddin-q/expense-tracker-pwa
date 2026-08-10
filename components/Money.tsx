'use client';

import { useApp } from '@/lib/app-context';
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
  const { hideAmounts } = useApp();
  const format = precise ? moneyExact : money;
  return <span className={className}>{format(value, hideAmounts)}</span>;
};
