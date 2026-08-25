/**
 * Revert expenses copied from one user onto another (logout → login cross-contamination).
 *
 * Usage:
 *   node --env-file=.env scripts/revert-cross-account-merge.mjs <victimUserId> <sourceUserId>
 *
 * Example (remove 9897794168's expenses from 9084687755):
 *   node --env-file=.env scripts/revert-cross-account-merge.mjs 9084687755 9897794168
 */
import { MongoClient } from 'mongodb';

const victimUserId = process.argv[2]?.trim();
const sourceUserId = process.argv[3]?.trim();
const uri = process.env.MONGODB_URI;

if (!uri || !victimUserId || !sourceUserId) {
  console.error(
    'Usage: node --env-file=.env scripts/revert-cross-account-merge.mjs <victimUserId> <sourceUserId>'
  );
  process.exit(1);
}

const client = new MongoClient(uri);
await client.connect();
const db = client.db('pocket');
const expenses = db.collection('expenses');

const activeFilter = {
  $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
};

const sourceRows = await expenses
  .find({ userId: sourceUserId, ...activeFilter })
  .project({ localId: 1 })
  .toArray();
const sourceLocalIds = sourceRows
  .map((e) => e.localId)
  .filter((id) => typeof id === 'string' && id.length > 0);

const before = await expenses.countDocuments({
  userId: victimUserId,
  ...activeFilter,
});

const now = new Date();
const result = await expenses.updateMany(
  {
    userId: victimUserId,
    localId: { $in: sourceLocalIds },
    ...activeFilter,
  },
  { $set: { deletedAt: now, updatedAt: now } }
);

const after = await expenses.countDocuments({
  userId: victimUserId,
  ...activeFilter,
});

console.log(`Victim ${victimUserId}: ${before} active → ${after} active`);
console.log(`Soft-deleted ${result.modifiedCount} copied row(s) from ${sourceUserId}`);

const sourceAfter = await expenses.countDocuments({
  userId: sourceUserId,
  ...activeFilter,
});
console.log(`Source ${sourceUserId}: ${sourceAfter} active (unchanged expected)`);

await client.close();
