/**
 * One-off repair: backfill default categories referenced by a user's expenses
 * but missing from profiles.categories. Safe to run multiple times (additive only).
 *
 * Usage:
 *   MONGODB_URI="..." node scripts/repair-missing-default-categories.mjs
 *   MONGODB_URI="..." node scripts/repair-missing-default-categories.mjs 9897794168
 */
import { MongoClient } from 'mongodb';
import { ensureDefaultCategories } from '../lib/ensure-default-categories.ts';

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('Set MONGODB_URI before running this script.');
  process.exit(1);
}

const targetUserId = process.argv[2]?.trim() || null;

const client = new MongoClient(uri);
await client.connect();
const db = client.db('pocket');
const profiles = db.collection('profiles');
const expenses = db.collection('expenses');

const profileFilter = targetUserId ? { userId: targetUserId } : {};
const profileCursor = profiles.find(profileFilter, {
  projection: { userId: 1, categories: 1 },
});

let scanned = 0;
let repaired = 0;

for await (const profile of profileCursor) {
  scanned += 1;
  const userId = profile.userId;
  if (typeof userId !== 'string') continue;

  const expenseDocs = await expenses
    .find({
      userId,
      $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
    })
    .project({ category: 1 })
    .toArray();

  const referenced = expenseDocs
    .map((e) => e.category)
    .filter((id) => typeof id === 'string' && id.length > 0);

  const existing = Array.isArray(profile.categories) ? profile.categories : [];
  const { categories, added } = ensureDefaultCategories(existing, referenced);

  if (added.length === 0) continue;

  await profiles.updateOne(
    { userId },
    { $set: { categories, updatedAt: new Date() } }
  );
  repaired += 1;
  console.log(`[repair] ${userId}: added ${added.join(', ')}`);
}

console.log(`Done. Scanned ${scanned} profile(s), repaired ${repaired}.`);
await client.close();
