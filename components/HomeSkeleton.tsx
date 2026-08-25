'use client';

import { Moon, Sun } from 'lucide-react';
import { Brand } from '@/components/Brand';
import { navItems } from '@/lib/constants';
import { useThemeStore } from '@/lib/theme-store';

function Bone({ className }: { className?: string }) {
  return <div className={`skeleton-bone ${className ?? ''}`} />;
}

/** Home-shaped placeholder while session restore or post-login bootstrap runs. */
export const HomeSkeleton = ({ title = 'Add expense' }: { title?: string }) => {
  const theme = useThemeStore((s) => s.theme);

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
            const active = index === 0;
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
            <Bone className="mb-3 h-4 w-28" />
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6">
              <div className="min-w-0">
                <div className="rounded-xl border border-border bg-card">
                  <div className="flex items-baseline gap-2 border-b border-border px-4 py-4">
                    <span className="font-mono-numbers text-2xl font-medium text-faint">
                      ₹
                    </span>
                    <Bone className="h-9 w-20" />
                  </div>
                  <div className="px-4 py-3">
                    <Bone className="h-4 w-44" />
                  </div>
                </div>
                <div className="mt-2 h-5" />

                <div className="mt-6">
                  <div className="mb-2.5 flex items-baseline justify-between">
                    <h2 className="label">Category</h2>
                    <span className="text-[12px] font-medium text-primary/50">
                      Manage
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
                    {Array.from({ length: 8 }, (_, i) => (
                      <div
                        key={i}
                        className="flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-2.5"
                      >
                        <Bone className="size-4 rounded-md" />
                        <Bone className="h-3 w-14" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6">
                  <h2 className="label mb-2.5">Frequent</h2>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from({ length: 3 }, (_, i) => (
                      <div
                        key={i}
                        className="flex h-8 items-center gap-2 rounded-lg border border-border bg-card px-2.5"
                      >
                        <Bone className="size-3.5 rounded" />
                        <Bone className="h-3 w-12" />
                        <Bone className="h-3 w-8" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <aside className="min-w-0">
                <div className="overflow-hidden rounded-xl border border-border bg-card">
                  <div className="flex items-center justify-between border-b border-border px-3 py-2 sm:px-4 sm:py-2.5">
                    <div className="inline-flex rounded-lg border border-border bg-background p-0.5">
                      <span className="h-7 rounded-md bg-primary/12 px-2.5 text-[12px] font-medium leading-7 text-primary">
                        Today
                      </span>
                      <span className="h-7 rounded-md px-2.5 text-[12px] font-medium leading-7 text-muted-foreground">
                        All
                      </span>
                    </div>
                    <Bone className="h-3 w-5" />
                  </div>
                  <div className="divide-y divide-border px-3 sm:px-4">
                    {Array.from({ length: 4 }, (_, i) => (
                      <div
                        key={i}
                        className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 py-2"
                      >
                        <Bone className="size-6 rounded-md" />
                        <Bone className="h-3.5 w-24" />
                        <Bone className="h-3.5 w-12 justify-self-end" />
                      </div>
                    ))}
                  </div>
                </div>
              </aside>
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
            const active = index === 0;
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
