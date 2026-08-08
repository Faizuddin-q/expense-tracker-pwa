import { Check, CircleDollarSign } from 'lucide-react';
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
      <section className="w-full max-w-md rounded-3xl bg-card p-7 shadow-sm ring-1 ring-border sm:p-10">
        <div className="grid size-11 place-items-center rounded-2xl bg-primary text-primary-foreground">
          <CircleDollarSign className="size-5" />
        </div>
        <div className="mt-10">
          <p className="text-sm font-medium text-primary">One-time setup</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance">
            What is your monthly income?
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            We&apos;ll use this to make your spending picture useful. You
            won&apos;t be asked again on another device.
          </p>
          <label className="mt-8 flex flex-col gap-2 text-sm font-medium">
            Monthly income
            <div className="flex items-center rounded-xl border border-input bg-background px-4">
              <span className="text-muted-foreground">₹</span>
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
                className="w-full bg-transparent p-3 outline-none"
              />
            </div>
          </label>
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
          <button
            onClick={onSave}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90"
          >
            Save income <Check className="size-4" />
          </button>
        </div>
      </section>
    </main>
  );
};
