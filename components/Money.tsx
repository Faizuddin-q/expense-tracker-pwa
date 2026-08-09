'use client';

import { useApp } from '@/lib/app-context';
import { money } from '@/lib/utils';

/** Renders a rupee amount, or bullets when Hide amounts is on. */
export const Money = ({
  value,
  className,
}: {
  value: number;
  className?: string;
}) => {
  const { hideAmounts } = useApp();
  return <span className={className}>{money(value, hideAmounts)}</span>;
};
