import { Download, Eye, EyeOff, LogOut, Moon, Sun } from 'lucide-react';
// Hand — used by deprecated double-tap shortcut section
// import { Download, Eye, EyeOff, Hand, LogOut, Moon, Sun } from 'lucide-react';
import { Category, Expense } from '@/types/expense';
import {
  downloadCsv,
  formatIndianMobileDisplay,
  formatIndianNumber,
} from '@/lib/utils';
import { toast } from '@/components/ToastHost';

interface SettingsProps {
  incomeDraft: string;
  setIncomeDraft: (v: string) => void;
  onSaveIncome: () => void;
  budgetDraft: string;
  setBudgetDraft: (v: string) => void;
  onSaveBudget: () => void;
  expenses: Expense[];
  userId: string;
  sync: () => void;
  onChangeIdentity: () => void;
  onLogout: () => void;
  categories?: Category[];
  theme: 'dark' | 'light';
  setTheme: (t: 'dark' | 'light') => void;
  hideAmounts: boolean;
  setHideAmounts: (v: boolean) => void;
  // Deprecated for now — double-tap / Back Tap shortcut
  // backTapEnabled: boolean;
  // setBackTapEnabled: (on: boolean) => void;
  // onOpenBackTapGuide?: () => void;
}

/** A labelled settings row: description on the left, control on the right. */
const Row = ({
  title,
  description,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div className="flex flex-col gap-2.5 px-3 py-3 transition-colors hover:bg-primary/[0.035] sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-4 sm:py-3.5">
    <div className="min-w-0">
      <p className="text-[13px] font-medium text-foreground">{title}</p>
      {description && (
        <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
    </div>
    <div className="shrink-0 sm:min-w-[220px]">{children}</div>
  </div>
);

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <section className="mt-5 first:mt-0">
    <h2 className="label mb-2 px-1">{title}</h2>
    <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
      {children}
    </div>
  </section>
);

/** Segmented control — active state uses primary like Expenses filters */
const Segment = ({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: React.ReactNode }[];
  value: string;
  onChange: (v: string) => void;
}) => (
  <div className="inline-flex w-full rounded-lg border border-border bg-card p-0.5 sm:w-auto">
    {options.map((opt) => {
      const active = value === opt.value;
      return (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex h-7 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 text-[12px] font-medium transition-colors sm:flex-none ${
            active
              ? 'bg-primary/12 text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {opt.label}
        </button>
      );
    })}
  </div>
);

const GhostButton = ({
  onClick,
  children,
  className = '',
}: {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex h-8 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 text-[12px] font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-primary/[0.06] hover:text-primary sm:w-auto ${className}`}
  >
    {children}
  </button>
);

const AmountField = ({
  label,
  value,
  onChange,
  onSave,
  placeholder,
  readOnly,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  placeholder: string;
  readOnly: boolean;
}) => (
  <div className="flex gap-1.5">
    <div className="field-shell flex h-8 flex-1 items-center rounded-lg border border-border bg-background px-2.5">
      <span className="font-mono-numbers text-[13px] text-faint">₹</span>
      <input
        aria-label={label}
        inputMode="decimal"
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange(formatIndianNumber(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSave();
        }}
        placeholder={placeholder}
        className="font-mono-numbers w-full min-w-0 bg-transparent px-1.5 text-[13px] text-foreground outline-none placeholder:text-faint"
      />
    </div>
    <button
      type="button"
      onClick={onSave}
      className="h-8 shrink-0 cursor-pointer rounded-lg bg-primary px-3 text-[12px] font-medium text-primary-foreground transition-opacity hover:opacity-90 active:opacity-80"
    >
      Save
    </button>
  </div>
);

export const Settings = ({
  incomeDraft,
  setIncomeDraft,
  onSaveIncome,
  budgetDraft,
  setBudgetDraft,
  onSaveBudget,
  expenses,
  userId,
  sync,
  onChangeIdentity,
  onLogout,
  categories = [],
  theme,
  setTheme,
  hideAmounts,
  setHideAmounts,
  // Deprecated for now — double-tap / Back Tap shortcut
  // backTapEnabled,
  // setBackTapEnabled,
  // onOpenBackTapGuide,
}: SettingsProps) => {
  return (
    <div className="mx-auto max-w-6xl">
      <div className="mx-auto max-w-2xl">
        <Section title="Account">
          <Row title="Mobile number" description="Identifies your expense data.">
            <p className="font-mono-numbers text-[13px] text-primary sm:text-right">
              {formatIndianMobileDisplay(userId)}
            </p>
          </Row>
          <Row
            title="Sync"
            description="Push local changes to the cloud and pull the latest."
          >
            <div className="flex gap-1.5">
              <GhostButton onClick={() => sync()}>Sync now</GhostButton>
              <GhostButton onClick={onChangeIdentity}>Change number</GhostButton>
            </div>
          </Row>
        </Section>

        <Section title="Targets">
          <Row
            title="Monthly income"
            description="Used as the fallback target when no budget is set."
          >
            <AmountField
              label="Monthly income"
              value={
                hideAmounts ? '••••••' : formatIndianNumber(incomeDraft || '')
              }
              onChange={setIncomeDraft}
              onSave={onSaveIncome}
              placeholder="50,000"
              readOnly={hideAmounts}
            />
          </Row>
          <Row
            title="Monthly budget"
            description="Analytics target only — you can still log past it."
          >
            <AmountField
              label="Monthly spend budget"
              value={
                hideAmounts ? '••••••' : formatIndianNumber(budgetDraft || '')
              }
              onChange={setBudgetDraft}
              onSave={onSaveBudget}
              placeholder="30,000"
              readOnly={hideAmounts}
            />
          </Row>
        </Section>

        <Section title="Appearance">
          <Row title="Theme" description="Applies on this device.">
            <Segment
              value={theme}
              onChange={(v) => setTheme(v as 'dark' | 'light')}
              options={[
                {
                  value: 'dark',
                  label: (
                    <>
                      <Moon className="size-3.5" strokeWidth={1.9} /> Dark
                    </>
                  ),
                },
                {
                  value: 'light',
                  label: (
                    <>
                      <Sun className="size-3.5" strokeWidth={1.9} /> Light
                    </>
                  ),
                },
              ]}
            />
          </Row>
        </Section>

        <Section title="Privacy">
          <Row
            title="Hide amounts"
            description="Masks every figure with bullets. App switcher previews are covered automatically."
          >
            <div className="flex items-center gap-2 sm:justify-end">
              {hideAmounts ? (
                <EyeOff
                  className="size-3.5 shrink-0 text-primary"
                  strokeWidth={1.9}
                />
              ) : (
                <Eye
                  className="size-3.5 shrink-0 text-muted-foreground"
                  strokeWidth={1.9}
                />
              )}
              <Segment
                value={hideAmounts ? 'on' : 'off'}
                onChange={(v) => setHideAmounts(v === 'on')}
                options={[
                  { value: 'off', label: 'Off' },
                  { value: 'on', label: 'On' },
                ]}
              />
            </div>
          </Row>
        </Section>

        {/* Deprecated for now — double-tap / Back Tap shortcut
        <Section title="Shortcuts">
          <Row
            title="Open with double tap"
            description="Double-tap the back of your phone to open Pocket. Controlled by your phone's system settings."
          >
            <div className="flex items-center gap-2 sm:justify-end">
              <Hand
                className={`size-3.5 shrink-0 ${
                  backTapEnabled ? 'text-primary' : 'text-muted-foreground'
                }`}
                strokeWidth={1.9}
              />
              <Segment
                value={backTapEnabled ? 'on' : 'off'}
                onChange={(v) => setBackTapEnabled(v === 'on')}
                options={[
                  { value: 'off', label: 'Off' },
                  { value: 'on', label: 'On' },
                ]}
              />
            </div>
          </Row>
          {onOpenBackTapGuide && (
            <Row
              title="Setup guide"
              description="Step-by-step for iPhone, Android, and Motorola."
            >
              <GhostButton onClick={onOpenBackTapGuide}>View guide</GhostButton>
            </Row>
          )}
        </Section>
        */}

        <Section title="Data">
          <Row
            title="Export"
            description={
              <>
                Download all{' '}
                <span className="font-mono-numbers text-primary">
                  {expenses.length}
                </span>{' '}
                expenses as a CSV file.
              </>
            }
          >
            <GhostButton
              onClick={() => {
                downloadCsv(expenses, categories);
                toast.success(
                  'CSV downloaded',
                  `${expenses.length} expenses exported`
                );
              }}
            >
              <Download className="size-3.5" strokeWidth={1.9} /> Export CSV
            </GhostButton>
          </Row>
          <Row
            title="Log out"
            description="Sign out on this device. Synced data stays in the cloud."
          >
            <button
              type="button"
              onClick={onLogout}
              className="flex h-8 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-destructive/30 px-3 text-[12px] font-medium text-destructive transition-colors hover:bg-destructive/10 sm:w-auto"
            >
              <LogOut className="size-3.5" strokeWidth={1.9} /> Log out
            </button>
          </Row>
        </Section>
      </div>
    </div>
  );
};
