import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DEFAULT_REMINDER,
  isReminderDue,
  localDateKey,
  normalizeReminder,
  snapTimeLocalToStep,
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

describe('snapTimeLocalToStep', () => {
  it('snaps to 15-minute steps', () => {
    assert.equal(snapTimeLocalToStep('22:10'), '22:00');
    assert.equal(snapTimeLocalToStep('22:15'), '22:15');
    assert.equal(snapTimeLocalToStep('22:29'), '22:15');
    assert.equal(snapTimeLocalToStep('22:45'), '22:45');
  });
});

describe('isReminderDue', () => {
  it('matches daily at the preferred 15-minute slot', () => {
    // 22:15 IST = 16:45 UTC
    const due = isReminderDue(
      {
        ...DEFAULT_REMINDER,
        enabled: true,
        frequency: 'daily',
        timeLocal: '22:15',
        timeZone: 'Asia/Kolkata',
      },
      new Date('2026-11-24T16:45:00.000Z')
    );
    assert.equal(due, true);
  });

  it('skips when 15-minute slot does not match (unless matchTime false)', () => {
    // 22:00 IST slot vs 22:15 preference
    const now = new Date('2026-11-24T16:30:00.000Z'); // 22:00 IST
    const wrongSlot = isReminderDue(
      {
        ...DEFAULT_REMINDER,
        enabled: true,
        frequency: 'daily',
        timeLocal: '22:15',
        timeZone: 'Asia/Kolkata',
      },
      now
    );
    const ignored = isReminderDue(
      {
        ...DEFAULT_REMINDER,
        enabled: true,
        frequency: 'daily',
        timeLocal: '22:15',
        timeZone: 'Asia/Kolkata',
      },
      now,
      { matchTime: false }
    );
    assert.equal(wrongSlot, false);
    assert.equal(ignored, true);
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
