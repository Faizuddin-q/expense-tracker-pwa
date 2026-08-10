import { Check, IndianRupee } from 'lucide-react';
import { formatIndianNumber, parseRawNumber } from '@/lib/utils';

interface IncomeSetupProps {
  value: string;
  setValue: (v: string) => void;
  onSave: () => void;
  error: string;
}

export const IncomeSetup = ({
  value,
  setValue,
  onSave,
  error,
}: IncomeSetupProps) => {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-5 py-10">
      <section className="w-full max-w-md rounded-3xl bg-card p-8 shadow-sm ring-1 ring-border sm:p-10">
        <div className="grid size-11 place-items-center rounded-2xl bg-primary text-primary-foreground">
          <IndianRupee className="size-5" />
        </div>
        <div className="mt-8">
          <p className="text-xs font-semibold tracking-wider text-primary uppercase">
            One-time setup
          </p>
          <h1 className="mt-2.5 text-3xl font-bold tracking-tight text-balance text-foreground">
            What is your monthly income?
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            We&apos;ll use this to make your spending picture useful. You
            won&apos;t be asked again on another device.
          </p>
          <label className="mt-8 flex flex-col gap-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Monthly income
            <div className="flex h-12 items-center rounded-xl border border-input bg-background px-4 focus-within:ring-2 focus-within:ring-ring">
              <span className="text-sm font-semibold text-muted-foreground">
                ₹
              </span>
              <input
                autoFocus
                inputMode="decimal"
                value={formatIndianNumber(value)}
                onChange={(e) =>
                  setValue(formatIndianNumber(parseRawNumber(e.target.value)))
                }
                onKeyDown={(e) => {
                  if (
                    e.key === 'Enter' &&
                    !e.nativeEvent.isComposing &&
                    e.keyCode !== 229
                  )
                    onSave();
                }}
                className="font-mono-numbers w-full bg-transparent px-2 text-sm font-semibold text-foreground outline-none"
              />
            </div>
          </label>
          {error && (
            <p className="mt-3 text-xs font-medium text-destructive">{error}</p>
          )}
          <button
            onClick={onSave}
            className="mt-6 flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]"
          >
            Save income <Check className="size-4" />
          </button>
        </div>
      </section>
    </main>
  );
};
