import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getFrequentRelogItems } from '../lib/frequent-expenses.ts';
import type { Expense } from '../types/expense.ts';

const expense = (
  partial: Partial<Expense> &
    Pick<Expense, 'id' | 'amount' | 'category' | 'date'>
): Expense => ({
  createdAt: partial.date,
  ...partial,
});

describe('getFrequentRelogItems', () => {
  const now = new Date(2026, 8, 15); // 15 Sep 2026

  it('returns top recurring patterns in the current cycle', () => {
    const expenses = [
      expense({
        id: '1',
        amount: 150,
        category: 'food',
        note: 'Coffee',
        date: '2026-09-02',
      }),
      expense({
        id: '2',
        amount: 150,
        category: 'food',
        note: 'Coffee',
        date: '2026-09-05',
      }),
      expense({
        id: '3',
        amount: 150,
        category: 'food',
        note: 'Coffee',
        date: '2026-09-10',
      }),
      expense({
        id: '4',
        amount: 180,
        category: 'transport',
        note: 'Metro',
        date: '2026-09-03',
      }),
      expense({
        id: '5',
        amount: 180,
        category: 'transport',
        note: 'Metro',
        date: '2026-09-08',
      }),
      expense({
        id: '6',
        amount: 420,
        category: 'food',
        note: 'Lunch',
        date: '2026-09-04',
      }),
      expense({
        id: '7',
        amount: 420,
        category: 'food',
        note: 'Lunch',
        date: '2026-09-11',
      }),
      expense({
        id: '8',
        amount: 99,
        category: 'other',
        note: 'Once',
        date: '2026-09-12',
      }),
    ];

    const items = getFrequentRelogItems(expenses, 1, { now, limit: 4 });
    assert.equal(items.length, 3);
    assert.deepEqual(
      items.map((i) => ({ label: i.label, amount: i.amount, count: i.count })),
      [
        { label: 'Coffee', amount: 150, count: 3 },
        { label: 'Lunch', amount: 420, count: 2 },
        { label: 'Metro', amount: 180, count: 2 },
      ]
    );
  });

  it('respects a mid-month cycle start day', () => {
    const expenses = [
      // Previous cycle (5 Aug – 4 Sep)
      expense({
        id: 'old-1',
        amount: 150,
        category: 'food',
        note: 'Coffee',
        date: '2026-08-20',
      }),
      expense({
        id: 'old-2',
        amount: 150,
        category: 'food',
        note: 'Coffee',
        date: '2026-09-01',
      }),
      // Current cycle (5 Sep – 4 Oct)
      expense({
        id: 'new-1',
        amount: 200,
        category: 'transport',
        note: 'Auto',
        date: '2026-09-06',
      }),
      expense({
        id: 'new-2',
        amount: 200,
        category: 'transport',
        note: 'Auto',
        date: '2026-09-12',
      }),
    ];

    const items = getFrequentRelogItems(expenses, 5, { now, limit: 4 });
    assert.equal(items.length, 1);
    assert.equal(items[0].label, 'Auto');
    assert.equal(items[0].count, 2);
  });

  it('treats notes case-insensitively and skips soft-deleted expenses', () => {
    const expenses = [
      expense({
        id: '1',
        amount: 50,
        category: 'food',
        note: 'Tea',
        date: '2026-09-02',
      }),
      expense({
        id: '2',
        amount: 50,
        category: 'food',
        note: 'tea',
        date: '2026-09-03',
      }),
      expense({
        id: '3',
        amount: 50,
        category: 'food',
        note: 'Tea',
        date: '2026-09-04',
        deletedAt: '2026-09-05',
      }),
    ];

    const items = getFrequentRelogItems(expenses, 1, { now, limit: 4 });
    assert.equal(items.length, 1);
    assert.equal(items[0].count, 2);
    assert.equal(items[0].label, 'tea');
  });

  it('returns an empty list when nothing repeats', () => {
    const expenses = [
      expense({
        id: '1',
        amount: 10,
        category: 'food',
        note: 'A',
        date: '2026-09-02',
      }),
      expense({
        id: '2',
        amount: 20,
        category: 'food',
        note: 'B',
        date: '2026-09-03',
      }),
    ];
    assert.deepEqual(getFrequentRelogItems(expenses, 1, { now }), []);
  });
});
