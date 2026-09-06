import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildCycleCalendarWeeks,
  getCycleDateKeys,
  groupExpensesByDateKey,
  sumByAmount,
  toLocalDateKey,
} from '../lib/cycle-calendar.ts';

describe('toLocalDateKey', () => {
  it('formats local calendar date as YYYY-MM-DD', () => {
    const d = new Date(2026, 6, 5); // 5 Jul 2026 local
    assert.equal(toLocalDateKey(d), '2026-07-05');
  });
});

describe('buildCycleCalendarWeeks', () => {
  it('covers a full calendar month when cycleStartDay is 1', () => {
    const weeks = buildCycleCalendarWeeks('2026-07-01', 1);
    const inCycle = weeks.flat().filter((d) => d.inCycle);
    assert.equal(inCycle.length, 31);
    assert.equal(inCycle[0].dateKey, '2026-07-01');
    assert.equal(inCycle[30].dateKey, '2026-07-31');
    // Each row is a full week
    for (const week of weeks) {
      assert.equal(week.length, 7);
    }
  });

  it('spans a mid-month cycle across two calendar months', () => {
    const weeks = buildCycleCalendarWeeks('2026-07-05', 5);
    const inCycle = weeks.flat().filter((d) => d.inCycle);
    assert.equal(inCycle[0].dateKey, '2026-07-05');
    assert.equal(inCycle[inCycle.length - 1].dateKey, '2026-08-04');
    assert.equal(inCycle.length, 31);
  });

  it('pads with out-of-cycle days to complete weeks', () => {
    const weeks = buildCycleCalendarWeeks('2026-07-05', 5);
    const all = weeks.flat();
    assert.equal(all.length % 7, 0);
    assert.ok(all.some((d) => !d.inCycle));
    assert.ok(all.some((d) => d.inCycle));
  });

  it('handles February when cycleStartDay is 31 (clamped)', () => {
    const weeks = buildCycleCalendarWeeks('2026-02-28', 31);
    const inCycle = weeks.flat().filter((d) => d.inCycle);
    assert.equal(inCycle[0].dateKey, '2026-02-28');
    assert.equal(inCycle[inCycle.length - 1].dateKey, '2026-03-30');
  });
});

describe('getCycleDateKeys', () => {
  it('lists every day in the cycle', () => {
    const keys = getCycleDateKeys('2026-07-05', 5);
    assert.equal(keys.length, 31);
    assert.deepEqual(keys[0], '2026-07-05');
    assert.deepEqual(keys[keys.length - 1], '2026-08-04');
  });
});

describe('groupExpensesByDateKey', () => {
  it('groups items by local date', () => {
    const items = [
      { id: 'a', date: '2026-07-10T12:00:00.000Z', amount: 100 },
      { id: 'b', date: '2026-07-10T18:00:00.000Z', amount: 50 },
      { id: 'c', date: '2026-07-11T12:00:00.000Z', amount: 25 },
    ];
    const groups = groupExpensesByDateKey(items, (i) => new Date(i.date));
    // Keys depend on local TZ; use the key each item maps to
    const keyA = toLocalDateKey(new Date(items[0].date));
    const keyC = toLocalDateKey(new Date(items[2].date));
    assert.equal(groups.get(keyA)?.length, 2);
    assert.equal(groups.get(keyC)?.length, 1);
  });
});

describe('sumByAmount', () => {
  it('sums expense amounts', () => {
    assert.equal(
      sumByAmount([{ amount: 100 }, { amount: 50 }, { amount: 25 }]),
      175
    );
  });
});
