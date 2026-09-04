import { useState } from 'react';
import { Download, Eye, EyeOff, LogOut, Moon, Sun } from 'lucide-react';
import { Category, Expense } from '@/types/expense';
import {
  downloadCsv,
  formatIndianMobileDisplay,
  formatIndianNumber,
} from '@/lib/utils';
import { toast } from '@/components/ToastHost';
import { formatFetchMs } from '@/lib/api-client';

interface SettingsProps {
  nameDraft: string;
  setNameDraft: (v: string) => void;
  onSaveName: () => void;
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
  onChangePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<boolean>;
  categories?: Category[];
  theme: 'dark' | 'light';
  setTheme: (t: 'dark' | 'light') => void;
  hideAmounts: boolean;
  setHideAmounts: (v: boolean) => void;
  cycleStartDay: number;
  setCycleStartDay: (v: number) => void;
  lastFetchTimings?: { method: string; path: string; ms: number; serverMs: number | null }[];
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
          className={`press flex h-7 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 text-[12px] font-medium transition-colors sm:flex-none ${
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

// Fixed days 1-28 (identical every month) plus one "Last day of month"
// option — stored as 31, which always clamps down to that month's actual
// last day (see lib/cycle.ts effectiveStartDay). Days 29/30 aren't offered
// as their own options: picking one of those would make the cycle boundary
// silently slide between e.g. the 28th/29th/30th depending on the month,
// which reads as a bug rather than an intentional choice.
const CYCLE_START_DAY_OPTIONS = [...Array.from({ length: 28 }, (_, i) => i + 1), 31];

const cycleStartDayLabel = (day: number) => {
  if (day === 1) return 'Day 1 (calendar month)';
  if (day === 31) return 'Last day of month';
  return `Day ${day}`;
};

/** Native select for the cycle-start-day picker — 31 options don't fit a
 *  Segment control, and a native select gives keyboard/a11y support for free. */
const CycleStartDaySelect = ({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) => (
  <div className="field-shell flex h-8 w-full items-center rounded-lg border border-border bg-background px-2.5 sm:w-auto">
    <select
      aria-label="Monthly cycle start day"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full min-w-0 cursor-pointer appearance-none bg-transparent px-1.5 text-[13px] text-foreground outline-none sm:w-auto"
    >
      {CYCLE_START_DAY_OPTIONS.map((day) => (
        <option key={day} value={day}>
          {cycleStartDayLabel(day)}
        </option>
      ))}
    </select>
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
    className={`press flex h-8 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 text-[12px] font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-primary/[0.06] hover:text-primary sm:w-auto ${className}`}
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
      className="h-8 shrink-0 cursor-pointer rounded-lg bg-primary px-3 text-[12px] font-medium text-primary-foreground press transition-opacity hover:opacity-90 active:opacity-80"
    >
      Save
    </button>
  </div>
);

const TextField = ({
  label,
  value,
  onChange,
  onSave,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  placeholder: string;
}) => (
  <div className="flex gap-1.5">
    <div className="field-shell flex h-8 flex-1 items-center rounded-lg border border-border bg-background px-2.5">
      <input
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSave();
        }}
        placeholder={placeholder}
        className="w-full min-w-0 bg-transparent px-1.5 text-[13px] text-foreground outline-none placeholder:text-faint"
      />
    </div>
    <button
      type="button"
      onClick={onSave}
      className="h-8 shrink-0 cursor-pointer rounded-lg bg-primary px-3 text-[12px] font-medium text-primary-foreground press transition-opacity hover:opacity-90 active:opacity-80"
    >
      Save
    </button>
  </div>
);

const PasswordInput = ({
  label,
  value,
  onChange,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
}) => {
  const [visible, setVisible] = useState(false);
  return (
    <div className="field-shell flex h-8 rounded-lg border border-border bg-background">
      <input
        aria-label={label}
        type={visible ? 'text' : 'password'}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={label}
        className="h-full w-full min-w-0 rounded-l-[inherit] bg-transparent px-2.5 text-[13px] text-foreground outline-none placeholder:text-faint"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        className="flex shrink-0 cursor-pointer items-center rounded-r-[inherit] border-l border-border px-2 text-muted-foreground transition-colors hover:text-foreground"
      >
        {visible ? (
          <EyeOff className="size-3.5" strokeWidth={1.9} />
        ) : (
          <Eye className="size-3.5" strokeWidth={1.9} />
        )}
      </button>
    </div>
  );
};

const ChangePasswordForm = ({
  onChangePassword,
}: {
  onChangePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<boolean>;
}) => {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!current || !next) {
      toast.error('Could not update password', 'Fill in every field');
      return;
    }
    if (next.length < 6) {
      toast.error(
        'Could not update password',
        'New password must be at least 6 characters'
      );
      return;
    }
    if (next !== confirm) {
      toast.error('Could not update password', 'New passwords don’t match');
      return;
    }
    setSubmitting(true);
    const ok = await onChangePassword(current, next);
    setSubmitting(false);
    if (ok) {
      setCurrent('');
      setNext('');
      setConfirm('');
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <PasswordInput
        label="Current password"
        value={current}
        onChange={setCurrent}
        autoComplete="current-password"
      />
      <PasswordInput
        label="New password"
        value={next}
        onChange={setNext}
        autoComplete="new-password"
      />
      <PasswordInput
        label="Confirm new password"
        value={confirm}
        onChange={setConfirm}
        autoComplete="new-password"
      />
      <button
        type="button"
        disabled={submitting}
        onClick={handleSubmit}
        className="h-8 shrink-0 cursor-pointer rounded-lg bg-primary px-3 text-[12px] font-medium text-primary-foreground press transition-opacity hover:opacity-90 active:opacity-80 disabled:opacity-60"
      >
        {submitting ? 'Updating…' : 'Update password'}
      </button>
    </div>
  );
};

export const Settings = ({
  nameDraft,
  setNameDraft,
  onSaveName,
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
  onChangePassword,
  categories = [],
  theme,
  setTheme,
  hideAmounts,
  setHideAmounts,
  cycleStartDay,
  setCycleStartDay,
  lastFetchTimings = [],
}: SettingsProps) => {
  return (
    <div className="mx-auto max-w-6xl">
      <div className="mx-auto max-w-2xl">
        <Section title="Account">
          <Row title="Name" description="Used to greet you around the app.">
            <TextField
              label="Name"
              value={nameDraft}
              onChange={setNameDraft}
              onSave={onSaveName}
              placeholder="Your name"
            />
          </Row>
          <Row title="Mobile number" description="Identifies your expense data.">
            <p className="font-mono-numbers text-[13px] text-primary sm:text-right">
              {formatIndianMobileDisplay(userId)}
            </p>
          </Row>
          <Row
            title="Sync"
            description={
              lastFetchTimings.length > 0 ? (
                <>
                  Client time includes network. Last calls:{' '}
                  {lastFetchTimings
                    .slice(-3)
                    .map((timing) => {
                      const server =
                        timing.serverMs != null
                          ? ` / server ${formatFetchMs(timing.serverMs)}`
                          : '';
                      return `${timing.method} ${timing.path} ${formatFetchMs(timing.ms)}${server}`;
                    })
                    .join(' · ')}
                </>
              ) : (
                'Push local changes to the cloud and pull the latest.'
              )
            }
          >
            <div className="flex gap-1.5">
              <GhostButton onClick={() => sync()}>Sync now</GhostButton>
              <GhostButton onClick={onChangeIdentity}>Change number</GhostButton>
            </div>
          </Row>
          <Row
            title="Change password"
            description="Existing accounts created before passwords were required were defaulted to their phone number — set a real one here."
          >
            <ChangePasswordForm onChangePassword={onChangePassword} />
          </Row>
        </Section>

        <Section title="Targets">
          <Row
            title="Monthly cycle start day"
            description="Your month runs from this day to the day before it next month — e.g. day 5 means 5 Jul–4 Aug counts as one month. Changes how past expenses are grouped everywhere."
          >
            <CycleStartDaySelect value={cycleStartDay} onChange={setCycleStartDay} />
          </Row>
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
          <Row title="Theme" description="Synced to your account — follows you to every device.">
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

        <p className="mt-5 text-center text-[11px] text-faint">
          Pockett version: v{process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0'}
        </p>
      </div>
    </div>
  );
};
