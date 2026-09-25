'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { secondaryNavItems } from '@/lib/constants';

export const More = () => {
  return (
    <section className="mx-auto max-w-6xl">
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="divide-y divide-border">
          {secondaryNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                href={item.href}
                className="press flex h-12 items-center gap-3 px-4 transition-colors hover:bg-secondary/60"
              >
                <Icon className="size-4 shrink-0 text-faint" strokeWidth={1.9} />
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
                  {item.label}
                </span>
                <ChevronRight className="size-4 shrink-0 text-faint" strokeWidth={1.9} />
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};
