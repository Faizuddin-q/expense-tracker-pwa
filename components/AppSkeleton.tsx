'use client';

import { Moon, Sun } from 'lucide-react';
import { Brand } from '@/components/Brand';
import { navItems } from '@/lib/constants';
import { useThemeStore } from '@/lib/theme-store';

function Bone({ className }: { className?: string }) {
  return <div className={`skeleton-bone ${className ?? ''}`} />;
}

/** Generic page-shaped placeholder while session restore or post-login bootstrap runs, for any route other than Home. */
export const AppSkeleton = ({
  title = 'Pockett',
  pathname = '',
}: {
  title?: string;
  pathname?: string;
}) => {
  const theme = useThemeStore((s) => s.theme);
  const activeIndex = navItems.findIndex((item) => item.href === pathname);

  return (
    <div
      className="min-h-screen bg-background text-foreground"
      aria-busy="true"
    >
      <span className="sr-only">Loading your account</span>

      <aside className="fixed inset-y-0 left-0 hidden w-56 flex-col border-r border-border bg-card lg:flex">
        <div className="flex h-12 items-center border-b border-border px-4">
          <Brand />
        </div>
        <nav className="flex flex-col gap-0.5 px-2 py-3" aria-hidden="true">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const active = index === activeIndex;
            return (
              <div
                key={item.id}
                className={`flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13px] font-medium ${
                  active ? 'bg-secondary text-foreground' : 'text-muted-foreground'
                }`}
              >
                <Icon
                  className={`size-4 shrink-0 ${active ? 'text-primary' : 'text-faint'}`}
                  strokeWidth={1.9}
                />
                <span className="truncate">{item.label}</span>
              </div>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="size-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
            <span className="text-[11px] font-medium text-muted-foreground">
              Syncing
            </span>
          </div>
          <Bone className="mt-1.5 h-3 w-24" />
        </div>
      </aside>

      <main className="pb-[calc(4.75rem+env(safe-area-inset-bottom))] lg:ml-56 lg:pb-10">
        <header className="sticky top-0 z-30 flex h-12 items-center justify-between bg-background/85 px-4 backdrop-blur-md sm:px-6 lg:px-8 relative after:pointer-events-none after:absolute after:inset-x-0 after:top-full after:h-3 after:bg-gradient-to-b after:from-border/60 after:to-transparent">
          <h1 className="text-[14px] font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          <div className="grid size-7 place-items-center rounded-md text-muted-foreground">
            {theme === 'dark' ? (
              <Sun className="size-4" strokeWidth={1.9} />
            ) : (
              <Moon className="size-4" strokeWidth={1.9} />
            )}
          </div>
        </header>

        <div className="px-4 py-5 sm:px-6 lg:px-8">
          <section className="mx-auto max-w-6xl" aria-hidden="true">
            <div className="rounded-xl border border-border bg-card p-4">
              <Bone className="h-4 w-32" />
              <Bone className="mt-3 h-3 w-full" />
              <Bone className="mt-2 h-3 w-5/6" />
              <Bone className="mt-2 h-3 w-2/3" />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-border bg-card p-4"
                >
                  <Bone className="h-3.5 w-20" />
                  <Bone className="mt-3 h-6 w-16" />
                </div>
              ))}
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
              <div className="divide-y divide-border px-4">
                {Array.from({ length: 5 }, (_, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 py-3"
                  >
                    <Bone className="size-6 rounded-md" />
                    <Bone className="h-3.5 w-32" />
                    <Bone className="h-3.5 w-12 justify-self-end" />
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>

      <nav
        aria-hidden="true"
        className="fixed inset-x-0 bottom-0 z-50 px-3 pt-2 pb-[max(0.6rem,env(safe-area-inset-bottom))] lg:hidden"
      >
        <div className="mx-auto flex h-14 max-w-md items-stretch rounded-xl border border-border bg-card/95 px-1 shadow-lg shadow-black/5 backdrop-blur-xl dark:shadow-black/30">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const active = index === activeIndex;
            return (
              <div
                key={item.id}
                className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg py-1.5 ${
                  active ? 'text-primary' : 'text-faint'
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
                  {item.shortLabel}
                </span>
              </div>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
