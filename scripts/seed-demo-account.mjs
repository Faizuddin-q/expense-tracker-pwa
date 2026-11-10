/**
 * Seed (or re-seed) the demo account: phone 1234567890 / password 1234567890.
 * Profile cycle starts on the 25th. Expenses span Jun – Oct 2026.
 *
 *   node --env-file=.env scripts/seed-demo-account.mjs
 */
import { randomBytes, randomUUID, scrypt } from 'crypto';
import { promisify } from 'util';
import { MongoClient } from 'mongodb';

const scryptAsync = promisify(scrypt);
const USER_ID = '1234567890';
const PASSWORD = '1234567890';
const CYCLE_START_DAY = 25;
const SEED_YEAR = 2026;
/** Enough volume to look lived-in across ~5 months / several cycles. */
const EXPENSE_COUNT = 240;

const hashPassword = async (password) => {
  const salt = randomBytes(16);
  const derived = await scryptAsync(password, salt, 64);
  return `${salt.toString('hex')}:${derived.toString('hex')}`;
};

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const roundAmount = (n) => Math.round(n);

const defaultCategories = [
  { id: 'food', label: 'Food', tone: 'mint', iconName: 'utensils', custom: true },
  { id: 'transport', label: 'Transport', tone: 'sky', iconName: 'car', custom: true },
  { id: 'shopping', label: 'Shopping', tone: 'lavender', iconName: 'shopping', custom: true },
  { id: 'bills', label: 'Bills', tone: 'peach', iconName: 'receipt', custom: true },
  { id: 'health', label: 'Health', tone: 'blush', iconName: 'health', custom: true },
  { id: 'entertainment', label: 'Fun', tone: 'butter', iconName: 'film', custom: true },
  { id: 'other', label: 'Other', tone: 'gray', iconName: 'plus', custom: true },
];

const customCategories = [
  { id: `custom-${randomUUID()}`, label: 'Rent', tone: 'navy', iconName: 'home', custom: true },
  { id: `custom-${randomUUID()}`, label: 'EMI', tone: 'bronze', iconName: 'card', custom: true },
  { id: `custom-${randomUUID()}`, label: 'Gym', tone: 'lime', iconName: 'fitness', custom: true },
  { id: `custom-${randomUUID()}`, label: 'Gifts', tone: 'pink', iconName: 'gift', custom: true },
];

const [rentCat, emiCat, gymCat, giftsCat] = customCategories;

const paymentWeighted = () =>
  pick([
    ...Array(12).fill('upi'),
    ...Array(4).fill('card'),
    ...Array(3).fill('cash'),
    'wallet',
    'netbanking',
    'other',
  ]);

const TEMPLATES = {
  food: [
    { note: 'Lunch', min: 140, max: 420 },
    { note: 'Dinner', min: 220, max: 780 },
    { note: 'Coffee', min: 80, max: 280 },
    { note: 'Chai', min: 20, max: 60 },
    { note: 'Swiggy', min: 180, max: 650 },
    { note: 'Zomato', min: 200, max: 720 },
    { note: 'Breakfast', min: 60, max: 220 },
    { note: 'Groceries', min: 350, max: 1800 },
    { note: 'Biryani', min: 280, max: 520 },
    { note: 'Office snacks', min: 40, max: 180 },
  ],
  transport: [
    { note: 'Uber', min: 90, max: 480 },
    { note: 'Auto', min: 40, max: 180 },
    { note: 'Metro', min: 20, max: 80 },
    { note: 'Petrol', min: 500, max: 2200 },
    { note: 'Rapido', min: 40, max: 160 },
    { note: 'Parking', min: 30, max: 150 },
  ],
  shopping: [
    { note: 'Amazon', min: 299, max: 3499 },
    { note: 'Flipkart', min: 199, max: 2499 },
    { note: 'Clothes', min: 799, max: 4200 },
    { note: 'BigBasket', min: 450, max: 2100 },
    { note: 'Decathlon', min: 499, max: 3200 },
  ],
  bills: [
    { note: 'Electricity', min: 780, max: 2400 },
    { note: 'WiFi', min: 599, max: 1299 },
    { note: 'Mobile recharge', min: 199, max: 719 },
    { note: 'Water bill', min: 250, max: 680 },
  ],
  health: [
    { note: 'Pharmacy', min: 120, max: 890 },
    { note: 'Doctor', min: 500, max: 1500 },
    { note: 'Lab test', min: 400, max: 2200 },
  ],
  entertainment: [
    { note: 'Netflix', min: 199, max: 649 },
    { note: 'Movie', min: 250, max: 780 },
    { note: 'Bowling', min: 600, max: 1400 },
    { note: 'Concert', min: 1200, max: 4500 },
  ],
  other: [
    { note: 'Misc', min: 80, max: 600 },
    { note: 'Stationery', min: 40, max: 280 },
    { note: 'Printing', min: 30, max: 150 },
  ],
};

const customTemplates = {
  [rentCat.id]: [{ note: 'House rent', min: 18500, max: 18500 }],
  [emiCat.id]: [
    { note: 'Phone EMI', min: 2499, max: 2499 },
    { note: 'Laptop EMI', min: 4200, max: 4200 },
  ],
  [gymCat.id]: [
    { note: 'Cult membership', min: 1499, max: 2499 },
    { note: 'Protein', min: 1800, max: 3200 },
  ],
  [giftsCat.id]: [
    { note: 'Birthday gift', min: 499, max: 2500 },
    { note: 'Diwali hamper', min: 799, max: 1800 },
    { note: 'Anniversary', min: 1200, max: 3500 },
  ],
};

const atLocal = (year, month0, day, hour = 12, minute = 0) =>
  new Date(year, month0, day, hour, minute, randInt(0, 59), 0);

const randomDateInRange = (start, end) => {
  const span = Math.max(0, end.getTime() - start.getTime());
  const t = start.getTime() + Math.random() ** 0.55 * span;
  const d = new Date(t);
  d.setHours(randInt(8, 22), randInt(0, 59), randInt(0, 59), 0);
  return d;
};

const makeExpense = (category, template, when) => {
  const localId = randomUUID();
  const amount = roundAmount(
    template.min === template.max
      ? template.min
      : randInt(template.min, template.max)
  );
  const createdAt = new Date(when.getTime() + randInt(0, 3 * 60 * 60 * 1000));
  return {
    userId: USER_ID,
    localId,
    amount,
    category,
    note: template.note,
    paymentMethod: paymentWeighted(),
    date: when.toISOString(),
    createdAt,
    updatedAt: createdAt,
  };
};

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI is not set');
  process.exit(1);
}

const client = new MongoClient(uri);
await client.connect();
const db = client.db('pocket');
const users = db.collection('users');
const profiles = db.collection('profiles');
const expenses = db.collection('expenses');

const now = new Date();
// Inclusive window: 1 Jun → 31 Oct 2026.
const rangeStart = atLocal(SEED_YEAR, 5, 1, 8, 0);
const rangeEnd = atLocal(SEED_YEAR, 9, 31, 21, 30);

const monthlyFixed = [];
// Rent + EMI on each cycle start day from Jun–Oct.
for (const month0 of [5, 6, 7, 8, 9]) {
  const rentDay = atLocal(SEED_YEAR, month0, CYCLE_START_DAY, 10, 12);
  if (rentDay < rangeStart || rentDay > rangeEnd) continue;
  monthlyFixed.push(
    makeExpense(rentCat.id, customTemplates[rentCat.id][0], rentDay)
  );
  monthlyFixed.push(
    makeExpense(
      emiCat.id,
      pick(customTemplates[emiCat.id]),
      new Date(rentDay.getTime() + 86400000)
    )
  );
}

const remaining = EXPENSE_COUNT - monthlyFixed.length;
if (remaining < 0) {
  throw new Error(
    `Fixed expenses (${monthlyFixed.length}) exceed EXPENSE_COUNT (${EXPENSE_COUNT})`
  );
}

const weightedCats = [
  ...Array(38).fill('food'),
  ...Array(22).fill('transport'),
  ...Array(14).fill('shopping'),
  ...Array(10).fill('bills'),
  ...Array(8).fill('entertainment'),
  ...Array(6).fill('health'),
  ...Array(4).fill('other'),
  ...Array(8).fill(gymCat.id),
  ...Array(10).fill(giftsCat.id),
];

const rest = [];
for (let i = 0; i < remaining; i++) {
  const cat = pick(weightedCats);
  const templates = TEMPLATES[cat] ?? customTemplates[cat];
  // Slight bias toward recent months so Overview/Home feel current.
  const when = randomDateInRange(rangeStart, rangeEnd);
  rest.push(makeExpense(cat, pick(templates), when));
}

const allExpenses = [...monthlyFixed, ...rest];
if (allExpenses.length !== EXPENSE_COUNT) {
  throw new Error(`Expected ${EXPENSE_COUNT} expenses, got ${allExpenses.length}`);
}

const passwordHash = await hashPassword(PASSWORD);
const categories = [...customCategories, ...defaultCategories];

await expenses.deleteMany({ userId: USER_ID });
await users.updateOne(
  { userId: USER_ID },
  {
    $set: {
      userId: USER_ID,
      passwordHash,
      passwordIsDefault: false,
      createdAt: new Date(rangeStart.getTime() - 30 * 86400000),
      updatedAt: now,
    },
  },
  { upsert: true }
);
await profiles.updateOne(
  { userId: USER_ID },
  {
    $set: {
      userId: USER_ID,
      name: 'Aarav Shah',
      monthlyIncome: 92000,
      monthlyBudget: 48000,
      hideAmounts: false,
      onboardingComplete: true,
      theme: 'light',
      cycleStartDay: CYCLE_START_DAY,
      categories,
      updatedAt: now,
    },
    $unset: { categoryOverrides: '', categoryIconOverrides: '' },
  },
  { upsert: true }
);
await expenses.insertMany(allExpenses);

const byCat = {};
let total = 0;
let minDate = null;
let maxDate = null;
for (const e of allExpenses) {
  byCat[e.category] = (byCat[e.category] ?? 0) + 1;
  total += e.amount;
  const d = new Date(e.date);
  if (!minDate || d < minDate) minDate = d;
  if (!maxDate || d > maxDate) maxDate = d;
}

console.log(
  JSON.stringify(
    {
      userId: USER_ID,
      password: PASSWORD,
      name: 'Aarav Shah',
      monthlyIncome: 92000,
      monthlyBudget: 48000,
      cycleStartDay: CYCLE_START_DAY,
      range: {
        start: `${SEED_YEAR}-06-01`,
        end: `${SEED_YEAR}-10-31`,
      },
      actualDateSpan: {
        min: minDate?.toISOString().slice(0, 10),
        max: maxDate?.toISOString().slice(0, 10),
      },
      categoryCount: categories.length,
      customCategories: customCategories.map((c) => c.label),
      expenseCount: allExpenses.length,
      totalSpend: total,
      counts: byCat,
    },
    null,
    2
  )
);

await client.close();
