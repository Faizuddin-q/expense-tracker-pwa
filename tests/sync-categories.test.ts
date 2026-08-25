import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  mergeCategoriesById,
  shouldSkipCategoryUpdate,
} from '../lib/category-sync-merge.ts';
import { ensureDefaultCategories } from '../lib/ensure-default-categories.ts';
import { mergeSyncOptions } from '../lib/sync-merge-options.ts';

describe('mergeCategoriesById', () => {
  it('preserves cloud rows when client sends a subset', () => {
    const existing = [
      { id: 'food', label: 'Food', tone: 'mint', iconName: 'utensils', custom: true },
      { id: 'custom-a', label: 'Rent', tone: 'gray', iconName: 'plus', custom: true },
    ];
    const incoming = [
      { id: 'custom-a', label: 'Rent updated', tone: 'peach', iconName: 'plus', custom: true },
    ];

    const merged = mergeCategoriesById(existing, incoming);

    assert.equal(merged.length, 2);
    assert.ok(merged.some((c) => c.id === 'food'));
    assert.equal(merged.find((c) => c.id === 'custom-a')?.label, 'Rent updated');
  });

  it('removes ids listed in deletedCategoryIds', () => {
    const existing = [
      { id: 'food', label: 'Food', tone: 'mint', iconName: 'utensils', custom: true },
      { id: 'transport', label: 'Transport', tone: 'sky', iconName: 'car', custom: true },
    ];

    const merged = mergeCategoriesById(existing, [], ['food']);

    assert.equal(merged.length, 1);
    assert.equal(merged[0]?.id, 'transport');
  });
});

describe('shouldSkipCategoryUpdate', () => {
  it('skips empty category payloads without explicit deletes', () => {
    assert.equal(shouldSkipCategoryUpdate([], undefined), true);
    assert.equal(shouldSkipCategoryUpdate([], []), true);
  });

  it('allows empty payload when deletes are explicit', () => {
    assert.equal(shouldSkipCategoryUpdate([], ['food']), false);
  });
});

describe('ensureDefaultCategories', () => {
  it('backfills missing defaults referenced by expenses only', () => {
    const { categories, added } = ensureDefaultCategories(
      [{ id: 'custom-a', label: 'Rent', tone: 'gray', iconName: 'plus', custom: true }],
      ['food', 'custom-a', 'shopping']
    );

    assert.deepEqual(added.sort(), ['food', 'shopping'].sort());
    assert.ok(categories.some((c) => c.id === 'food'));
    assert.ok(categories.some((c) => c.id === 'shopping'));
    assert.ok(categories.some((c) => c.id === 'custom-a'));
    assert.ok(!categories.some((c) => c.id === 'transport'));
  });
});

describe('mergeSyncOptions', () => {
  it('coalesces queued syncs so the latest local expense list wins', () => {
    const first = {
      id: 'user-1',
      local: [{ id: 'a', amount: 10 } as never],
    };
    const second = {
      local: [
        { id: 'a', amount: 10 } as never,
        { id: 'b', amount: 20 } as never,
      ],
    };

    const merged = mergeSyncOptions(first, second);

    assert.equal(merged.local?.length, 2);
    assert.equal(merged.id, 'user-1');
  });
});
