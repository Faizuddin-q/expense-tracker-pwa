/**
 * Compare the previous GET /api/expenses + GET /api/profile query
 * against the optimized versions, for the demo account.
 *
 *   node --env-file=.env scripts/bench-api-opt.mjs
 */
import { MongoClient } from 'mongodb';

const USER_ID = '1234567890';
const RUNS = 8;
const WARMUP = 2;

const FILTER = {
  userId: USER_ID,
  $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
};

const PROJECTION = {
  _id: 0,
  localId: 1,
  id: 1,
  amount: 1,
  category: 1,
  note: 1,
  paymentMethod: 1,
  date: 1,
  createdAt: 1,
  updatedAt: 1,
  deletedAt: 1,
};

const toIso = (value) => {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  return undefined;
};

const toClientExpense = (doc) => {
  const localId = typeof doc.localId === 'string' ? doc.localId : undefined;
  const id = typeof doc.id === 'string' ? doc.id : localId;
  return {
    id: id ?? localId ?? '',
    localId,
    amount: Number(doc.amount) || 0,
    category: typeof doc.category === 'string' ? doc.category : '',
    note:
      typeof doc.note === 'string' && doc.note.trim() ? doc.note.trim() : undefined,
    paymentMethod:
      typeof doc.paymentMethod === 'string' ? doc.paymentMethod : undefined,
    date: toIso(doc.date) ?? new Date().toISOString(),
    createdAt: toIso(doc.createdAt),
    updatedAt: toIso(doc.updatedAt),
    deletedAt: doc.deletedAt ? toIso(doc.deletedAt) ?? null : null,
  };
};

const jsonBytes = (value) => Buffer.byteLength(JSON.stringify({ data: value }));

const stats = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
  return {
    min: Math.round(sorted[0] * 10) / 10,
    max: Math.round(sorted.at(-1) * 10) / 10,
    avg: Math.round(avg * 10) / 10,
  };
};

const timed = async (fn) => {
  const t0 = performance.now();
  const result = await fn();
  return { ms: performance.now() - t0, result };
};

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI is not set');
  process.exit(1);
}

const client = new MongoClient(uri);
await client.connect();
const db = client.db('pocket');
const expenses = db.collection('expenses');
const profiles = db.collection('profiles');

const oldExpenses = async () => {
  const records = await expenses
    .find(FILTER)
    .sort({ updatedAt: -1 })
    .limit(10000)
    .toArray();
  return { expenses: records };
};

const newExpenses = async () => {
  const records = await expenses
    .find(FILTER)
    .project(PROJECTION)
    .sort({ updatedAt: -1 })
    .limit(10000)
    .toArray();
  return { expenses: records.map(toClientExpense) };
};

const oldProfile = async () => {
  const profile = await profiles.findOne({ userId: USER_ID });
  return profile;
};

const newProfile = async () => {
  const profile = await profiles.findOne(
    { userId: USER_ID },
    { projection: { _id: 0 } }
  );
  const p = profile ?? {};
  return {
    monthlyIncome: typeof p.monthlyIncome === 'number' ? p.monthlyIncome : null,
    monthlyBudget: typeof p.monthlyBudget === 'number' ? p.monthlyBudget : null,
    hideAmounts: typeof p.hideAmounts === 'boolean' ? p.hideAmounts : null,
    onboardingComplete: p.onboardingComplete === true,
    categories: Array.isArray(p.categories) ? p.categories : [],
    name: typeof p.name === 'string' ? p.name : null,
    theme: p.theme === 'dark' || p.theme === 'light' ? p.theme : null,
    cycleStartDay:
      typeof p.cycleStartDay === 'number' &&
      p.cycleStartDay >= 1 &&
      p.cycleStartDay <= 31
        ? p.cycleStartDay
        : null,
  };
};

for (let i = 0; i < WARMUP; i++) {
  await oldExpenses();
  await newExpenses();
  await oldProfile();
  await newProfile();
}

const oldExpMs = [];
const newExpMs = [];
const oldProfMs = [];
const newProfMs = [];
let oldExpPayload;
let newExpPayload;
let oldProfPayload;
let newProfPayload;
let expenseCount = 0;
let sampleOld;
let sampleNew;

for (let i = 0; i < RUNS; i++) {
  const oldE = await timed(oldExpenses);
  const newE = await timed(newExpenses);
  const oldP = await timed(oldProfile);
  const newP = await timed(newProfile);
  oldExpMs.push(oldE.ms);
  newExpMs.push(newE.ms);
  oldProfMs.push(oldP.ms);
  newProfMs.push(newP.ms);
  if (i === RUNS - 1) {
    oldExpPayload = jsonBytes(oldE.result);
    newExpPayload = jsonBytes(newE.result);
    oldProfPayload = jsonBytes(oldP.result);
    newProfPayload = jsonBytes(newP.result);
    expenseCount = newE.result.expenses.length;
    sampleOld = oldE.result.expenses[0];
    sampleNew = newE.result.expenses[0];
  }
}

const oldExplain = await expenses
  .find(FILTER)
  .sort({ updatedAt: -1 })
  .limit(10000)
  .explain('executionStats');
const newExplain = await expenses
  .find(FILTER)
  .project(PROJECTION)
  .sort({ updatedAt: -1 })
  .limit(10000)
  .explain('executionStats');

const winningPlan = (explain) =>
  explain?.queryPlanner?.winningPlan?.inputStage?.indexName ||
  explain?.queryPlanner?.winningPlan?.stage ||
  JSON.stringify(explain?.queryPlanner?.winningPlan ?? {}).slice(0, 120);

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

const sampleKeys = (doc) =>
  doc && typeof doc === 'object' ? Object.keys(doc).sort() : [];

console.log(
  JSON.stringify(
    {
      account: '+91 12345 67890',
      expenseCount,
      mongoQuery: {
        previous: {
          expensesAvgMs: stats(oldExpMs).avg,
          profileAvgMs: stats(oldProfMs).avg,
          expensesPayload: kb(oldExpPayload),
          profilePayload: kb(oldProfPayload),
          expensesKeys: sampleKeys(sampleOld),
        },
        optimized: {
          expensesAvgMs: stats(newExpMs).avg,
          profileAvgMs: stats(newProfMs).avg,
          expensesPayload: kb(newExpPayload),
          profilePayload: kb(newProfPayload),
          expensesKeys: sampleKeys(sampleNew),
        },
      },
      index: {
        previousWinningPlan: winningPlan(oldExplain),
        optimizedWinningPlan: winningPlan(newExplain),
        docsExaminedOld: oldExplain?.executionStats?.totalDocsExamined,
        docsExaminedNew: newExplain?.executionStats?.totalDocsExamined,
      },
    },
    null,
    2
  )
);

await client.close();
