import { ArrowRight } from 'lucide-react';
import { Brand } from '@/components/Brand';
import { formatIndianNumber, parseRawNumber } from '@/lib/utils';

interface IncomeSetupProps {
  income: string;
  setIncome: (v: string) => void;
  budget: string;
  setBudget: (v: string) => void;
  onContinue: () => void;
  onSkip: () => void;
  error: string;
}

/** First-run onboarding for brand-new accounts — income + optional budget. */
export const IncomeSetup = ({
  income,
  setIncome,
  budget,
  setBudget,
  onContinue,
  onSkip,
  error,
}: IncomeSetupProps) => {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-5 py-10">
      <section className="w-full max-w-[380px]">
        <Brand />

        <h1 className="mt-8 text-[22px] leading-tight font-semibold tracking-tight text-foreground">
          Set your targets
        </h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
          Income is the baseline Overview measures against. Budget is optional —
          you can change either anytime in Settings.
        </p>

        <div className="mt-7 space-y-3 rounded-xl border border-border bg-card p-4">
          <div>
            <label htmlFor="onboarding-income" className="label mb-1.5 block">
              Monthly income
            </label>
            <div className="field-shell flex h-9 items-center rounded-lg border border-border bg-background px-2.5">
              <span className="font-mono-numbers text-[13px] text-faint">₹</span>
              <input
                id="onboarding-income"
                inputMode="decimal"
                value={formatIndianNumber(income)}
                onChange={(e) =>
                  setIncome(formatIndianNumber(parseRawNumber(e.target.value)))
                }
                onKeyDown={(e) => {
                  if (
                    e.key === 'Enter' &&
                    !e.nativeEvent.isComposing &&
                    e.keyCode !== 229
                  )
                    onContinue();
                }}
                placeholder="50,000"
                className="font-mono-numbers w-full min-w-0 bg-transparent px-1.5 text-[13px] text-foreground outline-none placeholder:text-faint"
              />
            </div>
          </div>

          <div>
            <label htmlFor="onboarding-budget" className="label mb-1.5 block">
              Monthly budget{' '}
              <span className="font-normal text-faint">(optional)</span>
            </label>
            <div className="field-shell flex h-9 items-center rounded-lg border border-border bg-background px-2.5">
              <span className="font-mono-numbers text-[13px] text-faint">₹</span>
              <input
                id="onboarding-budget"
                inputMode="decimal"
                value={formatIndianNumber(budget)}
                onChange={(e) =>
                  setBudget(formatIndianNumber(parseRawNumber(e.target.value)))
                }
                onKeyDown={(e) => {
                  if (
                    e.key === 'Enter' &&
                    !e.nativeEvent.isComposing &&
                    e.keyCode !== 229
                  )
                    onContinue();
                }}
                placeholder="30,000"
                className="font-mono-numbers w-full min-w-0 bg-transparent px-1.5 text-[13px] text-foreground outline-none placeholder:text-faint"
              />
            </div>
          </div>

          {error && (
            <p className="text-[12px] text-destructive">{error}</p>
          )}

          <button
            type="button"
            onClick={onContinue}
            className="flex h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-primary text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90 active:opacity-80"
          >
            Continue
            <ArrowRight className="size-3.5" strokeWidth={2.2} />
          </button>

          <button
            type="button"
            onClick={onSkip}
            className="flex h-9 w-full cursor-pointer items-center justify-center rounded-lg text-[13px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            Skip for now
          </button>
        </div>
      </section>
    </main>
  );
};
