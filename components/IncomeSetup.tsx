import { ArrowRight } from 'lucide-react';
import { Brand } from '@/components/Brand';
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
      <section className="w-full max-w-[380px]">
        <Brand />

        <h1 className="mt-8 text-[22px] leading-tight font-semibold tracking-tight text-foreground">
          Monthly income
        </h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
          Sets the baseline your spending is measured against. You can change it
          later in Settings, and you won&apos;t be asked again on another
          device.
        </p>

        <div className="mt-7 rounded-xl border border-border bg-card p-4">
          <label htmlFor="income" className="label mb-1.5 block">
            Amount
          </label>
          <div className="field-shell flex h-9 items-center rounded-lg border border-border bg-background px-2.5">
            <span className="font-mono-numbers text-[13px] text-faint">₹</span>
            <input
              id="income"
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
              placeholder="50,000"
              className="font-mono-numbers w-full min-w-0 bg-transparent px-1.5 text-[13px] text-foreground outline-none placeholder:text-faint"
            />
          </div>

          {error && (
            <p className="mt-2 text-[12px] text-destructive">{error}</p>
          )}

          <button
            onClick={onSave}
            className="mt-3 flex h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-primary text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90 active:opacity-80"
          >
            Continue
            <ArrowRight className="size-3.5" strokeWidth={2.2} />
          </button>
        </div>
      </section>
    </main>
  );
};
