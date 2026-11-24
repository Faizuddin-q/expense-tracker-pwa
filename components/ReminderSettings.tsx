'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { fetchJson } from '@/lib/api-client';
import {
  DEFAULT_REMINDER,
  WEEKDAY_OPTIONS,
  type ReminderFrequency,
  type ReminderPrefs,
} from '@/lib/reminder';
import {
  ensurePushSubscription,
  getNotificationSupport,
  removePushSubscription,
} from '@/lib/push-client';
import { useProfileStore } from '@/lib/profile-store';
import { toast } from '@/components/ToastHost';

const Segment = ({
  options,
  value,
  onChange,
  disabled,
}: {
  options: { value: string; label: React.ReactNode }[];
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) => (
  <div className="inline-flex w-full rounded-lg border border-border bg-card p-0.5 sm:w-auto">
    {options.map((opt) => {
      const active = value === opt.value;
      return (
        <button
          key={opt.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(opt.value)}
          className={`press flex h-7 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 text-[12px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none ${
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

const FieldShell = ({ children }: { children: React.ReactNode }) => (
  <div className="field-shell flex h-8 w-full items-center rounded-lg border border-border bg-background px-2.5 sm:w-auto">
    {children}
  </div>
);

const permissionLabel = (
  permission: ReturnType<typeof getNotificationSupport>['permission']
) => {
  if (permission === 'unsupported') return 'Not supported on this device';
  if (permission === 'granted') return 'Allowed';
  if (permission === 'denied') return 'Blocked in system settings';
  return 'Not enabled yet';
};

export const ReminderSettings = () => {
  const reminderFromStore = useProfileStore((s) => s.reminder);
  const setReminderState = useProfileStore((s) => s.setReminderState);

  const [draft, setDraft] = useState<ReminderPrefs>(reminderFromStore);
  const [saving, setSaving] = useState(false);
  const [support, setSupport] = useState(getNotificationSupport);

  useEffect(() => {
    setDraft(reminderFromStore);
  }, [reminderFromStore]);

  useEffect(() => {
    setSupport(getNotificationSupport());
  }, []);

  const savePrefs = async (next: ReminderPrefs) => {
    setSaving(true);
    const result = await fetchJson<{ reminder: ReminderPrefs }>('/api/reminders', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        enabled: next.enabled,
        frequency: next.frequency,
        timeLocal: next.timeLocal,
        weekday: next.weekday,
        monthDay: next.monthDay,
        timeZone: next.timeZone || DEFAULT_REMINDER.timeZone,
      }),
    });
    setSaving(false);
    if (!result.ok) {
      toast.error('Could not save reminder', result.message);
      return false;
    }
    setReminderState(result.data.reminder);
    setDraft(result.data.reminder);
    return true;
  };

  const handleEnable = async (on: boolean) => {
    if (on) {
      if (!support.supported) {
        toast.error(
          'Notifications unavailable',
          'This browser cannot receive push reminders'
        );
        return;
      }
      const sub = await ensurePushSubscription();
      setSupport(getNotificationSupport());
      if (!sub.ok) {
        toast.error('Could not enable reminders', sub.message);
        return;
      }
      const timeZone =
        Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_REMINDER.timeZone;
      const next = { ...draft, enabled: true, timeZone };
      const ok = await savePrefs(next);
      if (ok) {
        toast.success('Reminders on', `You’ll get a ${next.frequency} nudge`);
      }
      return;
    }

    await removePushSubscription();
    setSupport(getNotificationSupport());
    const ok = await savePrefs({ ...draft, enabled: false });
    if (ok) toast.success('Reminders off', 'No more expense nudges');
  };

  const updateField = async (patch: Partial<ReminderPrefs>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    // Persist cadence even while disabled so enabling later keeps their choices.
    await savePrefs(next);
  };

  return (
    <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex flex-col gap-2.5 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-4 sm:py-3.5">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-foreground">Expense reminders</p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
            Push a nudge on phone, tablet, or desktop even when Pockett is closed.
            Permission:{' '}
            <span className="text-foreground">{permissionLabel(support.permission)}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 sm:justify-end">
          {draft.enabled ? (
            <Bell className="size-3.5 shrink-0 text-primary" strokeWidth={1.9} />
          ) : (
            <BellOff
              className="size-3.5 shrink-0 text-muted-foreground"
              strokeWidth={1.9}
            />
          )}
          <Segment
            value={draft.enabled ? 'on' : 'off'}
            onChange={(v) => void handleEnable(v === 'on')}
            disabled={saving}
            options={[
              { value: 'off', label: 'Off' },
              { value: 'on', label: 'On' },
            ]}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2.5 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-4 sm:py-3.5">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-foreground">Frequency</p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
            How often to remind you to log expenses.
          </p>
        </div>
        <Segment
          value={draft.frequency}
          disabled={saving}
          onChange={(v) =>
            void updateField({ frequency: v as ReminderFrequency })
          }
          options={[
            { value: 'daily', label: 'Daily' },
            { value: 'weekly', label: 'Weekly' },
            { value: 'monthly', label: 'Monthly' },
          ]}
        />
      </div>

      <div className="flex flex-col gap-2.5 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-4 sm:py-3.5">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-foreground">Time</p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
            Local time of day. Delivery lands in that hour (Hobby may be up to
            ~59 minutes late within the hour).
          </p>
        </div>
        <FieldShell>
          <input
            aria-label="Reminder time"
            type="time"
            value={draft.timeLocal}
            disabled={saving}
            onChange={(e) => {
              const value = e.target.value;
              if (!value) return;
              void updateField({ timeLocal: value.slice(0, 5) });
            }}
            className="w-full min-w-0 cursor-pointer appearance-none bg-transparent px-1.5 text-[13px] text-foreground outline-none disabled:opacity-50 sm:w-auto"
          />
        </FieldShell>
      </div>

      {draft.frequency === 'weekly' && (
        <div className="flex flex-col gap-2.5 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-4 sm:py-3.5">
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-foreground">Weekday</p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
              Day of the week for the weekly nudge.
            </p>
          </div>
          <FieldShell>
            <select
              aria-label="Reminder weekday"
              value={draft.weekday}
              disabled={saving}
              onChange={(e) =>
                void updateField({ weekday: Number(e.target.value) })
              }
              className="w-full min-w-0 cursor-pointer appearance-none bg-transparent px-1.5 text-[13px] text-foreground outline-none disabled:opacity-50 sm:w-auto"
            >
              {WEEKDAY_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </FieldShell>
        </div>
      )}

      {draft.frequency === 'monthly' && (
        <div className="flex flex-col gap-2.5 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-4 sm:py-3.5">
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-foreground">Day of month</p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
              1–28 so every month has that day.
            </p>
          </div>
          <FieldShell>
            <select
              aria-label="Reminder day of month"
              value={draft.monthDay}
              disabled={saving}
              onChange={(e) =>
                void updateField({ monthDay: Number(e.target.value) })
              }
              className="w-full min-w-0 cursor-pointer appearance-none bg-transparent px-1.5 text-[13px] text-foreground outline-none disabled:opacity-50 sm:w-auto"
            >
              {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                <option key={day} value={day}>
                  Day {day}
                </option>
              ))}
            </select>
          </FieldShell>
        </div>
      )}
    </div>
  );
};
