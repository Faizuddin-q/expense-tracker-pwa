import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DEFAULT_REMINDER,
  isReminderDue,
  localDateKey,
  normalizeReminder,
  zonedParts,
} from '../lib/reminder.ts';

describe('normalizeReminder', () => {
  it('returns defaults for empty input', () => {
    const r = normalizeReminder(null);
    assert.equal(r.enabled, false);
    assert.equal(r.frequency, 'daily');
    assert.equal(r.timeLocal, '21:00');
    assert.equal(r.timeZone, 'Asia/Kolkata');
  });

  it('clamps invalid weekday and monthDay', () => {
    const r = normalizeReminder({
      enabled: true,
      frequency: 'weekly',
      timeLocal: '09:30',
      weekday: 99,
      monthDay: 40,
      timeZone: 'Asia/Kolkata',
    });
    assert.equal(r.weekday, DEFAULT_REMINDER.weekday);
    assert.equal(r.monthDay, DEFAULT_REMINDER.monthDay);
    assert.equal(r.timeLocal, '09:30');
    assert.equal(r.enabled, true);
  });
});

describe('isReminderDue', () => {
  it('matches daily without hour check (Hobby daily cron)', () => {
    // Midday IST - still due when matchHour is off
    const now = new Date('2026-11-24T06:00:00.000Z');
    const due = isReminderDue(
      {
        ...DEFAULT_REMINDER,
        enabled: true,
        frequency: 'daily',
        timeLocal: '21:00',
        timeZone: 'Asia/Kolkata',
      },
      now
    );
    assert.equal(due, true);
  });

  it('respects preferred hour when matchHour is on', () => {
    const now = new Date('2026-11-24T06:00:00.000Z'); // 11:30 IST
    const wrongHour = isReminderDue(
      {
        ...DEFAULT_REMINDER,
        enabled: true,
        frequency: 'daily',
        timeLocal: '21:00',
        timeZone: 'Asia/Kolkata',
      },
      now,
      { matchHour: true }
    );
    const rightHour = isReminderDue(
      {
        ...DEFAULT_REMINDER,
        enabled: true,
        frequency: 'daily',
        timeLocal: '21:00',
        timeZone: 'Asia/Kolkata',
      },
      new Date('2026-11-24T15:30:00.000Z'),
      { matchHour: true }
    );
    assert.equal(wrongHour, false);
    assert.equal(rightHour, true);
  });

  it('skips daily if already sent the same local day', () => {
    const now = new Date('2026-11-24T15:30:00.000Z');
    const due = isReminderDue(
      {
        ...DEFAULT_REMINDER,
        enabled: true,
        frequency: 'daily',
        timeLocal: '21:00',
        timeZone: 'Asia/Kolkata',
        lastSentAt: '2026-11-24T15:05:00.000Z',
      },
      now
    );
    assert.equal(due, false);
  });

  it('requires weekly weekday match', () => {
    // 2026-11-24 is Tuesday (weekday 2)
    const now = new Date('2026-11-24T15:30:00.000Z');
    const monday = isReminderDue(
      {
        ...DEFAULT_REMINDER,
        enabled: true,
        frequency: 'weekly',
        timeLocal: '21:00',
        weekday: 1,
        timeZone: 'Asia/Kolkata',
      },
      now
    );
    const tuesday = isReminderDue(
      {
        ...DEFAULT_REMINDER,
        enabled: true,
        frequency: 'weekly',
        timeLocal: '21:00',
        weekday: 2,
        timeZone: 'Asia/Kolkata',
      },
      now
    );
    assert.equal(monday, false);
    assert.equal(tuesday, true);
  });
});

describe('zonedParts / localDateKey', () => {
  it('computes Kolkata calendar day across UTC midnight', () => {
    const lateUtc = new Date('2026-11-23T20:00:00.000Z'); // 01:30 IST next day
    const parts = zonedParts(lateUtc, 'Asia/Kolkata');
    assert.equal(parts.day, 24);
    assert.equal(localDateKey(lateUtc, 'Asia/Kolkata'), '2026-11-24');
  });
});
