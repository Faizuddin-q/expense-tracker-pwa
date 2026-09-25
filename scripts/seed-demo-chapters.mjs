/**
 * Seed (or re-seed) demo Chapters + chapter expenses for the demo account
 * (phone 1234567890 — see scripts/seed-demo-account.mjs). Idempotent: each
 * chapter/entry is upserted by a stable localId, so re-running just updates
 * the same rows instead of duplicating them.
 *
 *   node --env-file=.env scripts/seed-demo-chapters.mjs
 */
import { MongoClient } from 'mongodb';

const USER_ID = '1234567890';

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI is not set');
  process.exit(1);
}

const client = new MongoClient(uri);
await client.connect();
const db = client.db('pocket');

const now = new Date();
const daysAgo = (n) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

// Every budget below is kept between ₹20,000 and ₹4,00,000.
const chapters = [
  { localId: 'chapter-goa-trip', name: 'Goa Trip', budget: 25000, archived: false, createdAt: daysAgo(20), updatedAt: daysAgo(2) },
  { localId: 'chapter-new-car', name: 'New Car', budget: 350000, archived: false, createdAt: daysAgo(45), updatedAt: daysAgo(5) },
  { localId: 'chapter-diwali', name: 'Diwali Shopping', budget: null, archived: true, createdAt: daysAgo(90), updatedAt: daysAgo(60) },
  { localId: 'chapter-manali-trek', name: 'Manali Trek', budget: 25000, archived: false, createdAt: daysAgo(35), updatedAt: daysAgo(3) },
  { localId: 'chapter-macbook', name: 'MacBook Upgrade', budget: 140000, archived: false, createdAt: daysAgo(15), updatedAt: daysAgo(1) },
  { localId: 'chapter-home-reno', name: 'Home Renovation', budget: 220000, archived: false, createdAt: daysAgo(60), updatedAt: daysAgo(4) },
  { localId: 'chapter-sister-wedding', name: "Sister's Wedding Gift", budget: 20000, archived: false, createdAt: daysAgo(25), updatedAt: daysAgo(6) },
  { localId: 'chapter-bali-honeymoon', name: 'Bali Honeymoon', budget: 180000, archived: false, createdAt: daysAgo(50), updatedAt: daysAgo(2) },
  { localId: 'chapter-gym-year', name: 'Gym Membership (Year)', budget: 25000, archived: false, createdAt: daysAgo(100), updatedAt: daysAgo(10) },
  { localId: 'chapter-laptop-repair', name: 'Old Laptop Repair', budget: 20000, archived: true, createdAt: daysAgo(200), updatedAt: daysAgo(180) },
  { localId: 'chapter-office-setup', name: 'Home Office Setup', budget: 30000, archived: false, createdAt: daysAgo(12), updatedAt: daysAgo(1) },
  { localId: 'chapter-cordelia-cruise', name: 'Cordelia Cruise', budget: 150000, archived: false, createdAt: daysAgo(40), updatedAt: daysAgo(1) },
];

const entries = [
  // Goa Trip
  { chapterId: 'chapter-goa-trip', localId: 'ge-1', amount: 8200, category: 'transport', note: 'Flights', paymentMethod: 'card', date: daysAgo(19) },
  { chapterId: 'chapter-goa-trip', localId: 'ge-2', amount: 6500, category: 'bills', note: 'Hotel (3 nights)', paymentMethod: 'card', date: daysAgo(18) },
  { chapterId: 'chapter-goa-trip', localId: 'ge-3', amount: 3200, category: 'food', note: 'Beach shack dinners', paymentMethod: 'upi', date: daysAgo(17) },
  { chapterId: 'chapter-goa-trip', localId: 'ge-4', amount: 1800, category: 'entertainment', note: 'Water sports', paymentMethod: 'cash', date: daysAgo(17) },
  { chapterId: 'chapter-goa-trip', localId: 'ge-5', amount: 1400, category: 'transport', note: 'Scooter rental', paymentMethod: 'cash', date: daysAgo(16) },
  { chapterId: 'chapter-goa-trip', localId: 'ge-6', amount: 950, category: 'shopping', note: 'Souvenirs', paymentMethod: 'upi', date: daysAgo(15) },

  // New Car
  { chapterId: 'chapter-new-car', localId: 'nc-1', amount: 300000, category: 'other', note: 'Down payment', paymentMethod: 'netbanking', date: daysAgo(44) },
  { chapterId: 'chapter-new-car', localId: 'nc-2', amount: 18500, category: 'bills', note: 'Insurance (1 yr)', paymentMethod: 'card', date: daysAgo(30) },
  { chapterId: 'chapter-new-car', localId: 'nc-3', amount: 9200, category: 'shopping', note: 'Seat covers + accessories', paymentMethod: 'card', date: daysAgo(10) },
  { chapterId: 'chapter-new-car', localId: 'nc-4', amount: 4500, category: 'other', note: 'Registration fees', paymentMethod: 'upi', date: daysAgo(8) },

  // Diwali Shopping (archived, no budget)
  { chapterId: 'chapter-diwali', localId: 'ds-1', amount: 4200, category: 'shopping', note: 'New clothes', paymentMethod: 'card', date: daysAgo(75) },
  { chapterId: 'chapter-diwali', localId: 'ds-2', amount: 1600, category: 'food', note: 'Sweets & snacks', paymentMethod: 'cash', date: daysAgo(72) },
  { chapterId: 'chapter-diwali', localId: 'ds-3', amount: 2500, category: 'other', note: 'Gifts', paymentMethod: 'upi', date: daysAgo(70) },

  // Manali Trek — budget 25000, spend ~10100
  { chapterId: 'chapter-manali-trek', localId: 'mt-1', amount: 3500, category: 'transport', note: 'Volvo bus tickets', paymentMethod: 'upi', date: daysAgo(34) },
  { chapterId: 'chapter-manali-trek', localId: 'mt-2', amount: 2800, category: 'bills', note: 'Homestay (2 nights)', paymentMethod: 'cash', date: daysAgo(33) },
  { chapterId: 'chapter-manali-trek', localId: 'mt-3', amount: 1600, category: 'food', note: 'Local food', paymentMethod: 'cash', date: daysAgo(32) },
  { chapterId: 'chapter-manali-trek', localId: 'mt-4', amount: 2200, category: 'other', note: 'Trekking gear rental', paymentMethod: 'card', date: daysAgo(32) },

  // MacBook Upgrade — budget 140000, spend ~133100
  { chapterId: 'chapter-macbook', localId: 'mb-1', amount: 129900, category: 'other', note: 'MacBook Air M4', paymentMethod: 'card', date: daysAgo(14) },
  { chapterId: 'chapter-macbook', localId: 'mb-2', amount: 3200, category: 'shopping', note: 'Sleeve + adapter', paymentMethod: 'upi', date: daysAgo(13) },

  // Home Renovation — budget 220000, spend ~216000 (near budget)
  { chapterId: 'chapter-home-reno', localId: 'hr-1', amount: 85000, category: 'other', note: 'Kitchen cabinets', paymentMethod: 'netbanking', date: daysAgo(58) },
  { chapterId: 'chapter-home-reno', localId: 'hr-2', amount: 62000, category: 'other', note: 'Painting & labor', paymentMethod: 'netbanking', date: daysAgo(45) },
  { chapterId: 'chapter-home-reno', localId: 'hr-3', amount: 48000, category: 'shopping', note: 'Fixtures & fittings', paymentMethod: 'card', date: daysAgo(20) },
  { chapterId: 'chapter-home-reno', localId: 'hr-4', amount: 21000, category: 'other', note: 'Electrician', paymentMethod: 'cash', date: daysAgo(6) },

  // Sister's Wedding Gift — budget 20000, spend ~14500
  { chapterId: 'chapter-sister-wedding', localId: 'sw-1', amount: 8000, category: 'shopping', note: 'Gold coin gift', paymentMethod: 'card', date: daysAgo(24) },
  { chapterId: 'chapter-sister-wedding', localId: 'sw-2', amount: 4500, category: 'shopping', note: 'Outfit for the wedding', paymentMethod: 'upi', date: daysAgo(20) },
  { chapterId: 'chapter-sister-wedding', localId: 'sw-3', amount: 2000, category: 'transport', note: 'Travel to hometown', paymentMethod: 'cash', date: daysAgo(7) },

  // Bali Honeymoon — budget 180000, spend ~119000
  { chapterId: 'chapter-bali-honeymoon', localId: 'bh-1', amount: 62000, category: 'transport', note: 'Return flights', paymentMethod: 'card', date: daysAgo(48) },
  { chapterId: 'chapter-bali-honeymoon', localId: 'bh-2', amount: 45000, category: 'bills', note: 'Resort (5 nights)', paymentMethod: 'card', date: daysAgo(40) },
  { chapterId: 'chapter-bali-honeymoon', localId: 'bh-3', amount: 12000, category: 'entertainment', note: 'Excursions booked', paymentMethod: 'upi', date: daysAgo(15) },

  // Gym Membership (Year) — budget 25000, spend ~22300 (near budget)
  { chapterId: 'chapter-gym-year', localId: 'gy-1', amount: 18000, category: 'health', note: 'Annual membership', paymentMethod: 'card', date: daysAgo(99) },
  { chapterId: 'chapter-gym-year', localId: 'gy-2', amount: 2500, category: 'shopping', note: 'Gym gear', paymentMethod: 'upi', date: daysAgo(90) },
  { chapterId: 'chapter-gym-year', localId: 'gy-3', amount: 1800, category: 'health', note: 'Personal training session', paymentMethod: 'cash', date: daysAgo(20) },

  // Old Laptop Repair — archived, budget 20000, spend ~5600
  { chapterId: 'chapter-laptop-repair', localId: 'lr-1', amount: 3200, category: 'other', note: 'Screen replacement', paymentMethod: 'cash', date: daysAgo(199) },
  { chapterId: 'chapter-laptop-repair', localId: 'lr-2', amount: 2400, category: 'other', note: 'Battery replacement', paymentMethod: 'cash', date: daysAgo(185) },

  // Home Office Setup — budget 30000, spend ~23700
  { chapterId: 'chapter-office-setup', localId: 'os-1', amount: 14000, category: 'other', note: 'Standing desk', paymentMethod: 'card', date: daysAgo(11) },
  { chapterId: 'chapter-office-setup', localId: 'os-2', amount: 6500, category: 'other', note: 'Ergonomic chair', paymentMethod: 'card', date: daysAgo(10) },
  { chapterId: 'chapter-office-setup', localId: 'os-3', amount: 3200, category: 'shopping', note: 'Monitor arm + lighting', paymentMethod: 'upi', date: daysAgo(2) },
];

// Cordelia Cruise — budget 150000, 30 expenses totaling 210000 (over budget).
const cordeliaItems = [
  ['transport', 'Round-trip flights to Mumbai', 18500],
  ['other', 'Cruise cabin booking (balcony)', 74500],
  ['food', 'Onboard specialty dining', 4200],
  ['food', 'Onboard specialty dining (night 2)', 3800],
  ['entertainment', 'Casino night', 5000],
  ['entertainment', 'Live show tickets', 2500],
  ['shopping', 'Duty-free shopping', 7200],
  ['other', 'Port excursion — Lakshadweep', 9500],
  ['other', 'Port excursion — snorkeling', 6800],
  ['bills', 'Travel insurance', 3200],
  ['transport', 'Airport cabs', 1800],
  ['food', 'Buffet upgrade package', 2600],
  ['shopping', 'Onboard spa treatment', 4500],
  ['entertainment', 'Deck party package', 1900],
  ['other', 'Photography package', 3000],
  ['shopping', 'Souvenirs', 2200],
  ['food', 'Room service tips', 1500],
  ['bills', 'Wi-Fi package onboard', 2800],
  ['other', 'Excess baggage fee', 1200],
  ['transport', 'Local transport at port', 900],
  ['entertainment', 'Kids club activities', 1600],
  ['food', 'Coffee & snacks bar', 1100],
  ['shopping', 'Cruise-branded merchandise', 1700],
  ['other', 'Cabin upgrade fee', 30000],
  ['health', 'Onboard gym day pass', 800],
  ['other', 'Gratuities / service charge', 6000],
  ['bills', 'SIM/roaming pack', 1400],
  ['food', 'Pre-cruise hotel stay dinner', 2600],
  ['other', 'Pre-cruise hotel stay (1 night)', 5800],
  ['shopping', 'Last-minute travel essentials', 1400],
];

const cordeliaSum = cordeliaItems.reduce((s, [, , amt]) => s + amt, 0);
if (cordeliaSum !== 210000) {
  throw new Error(`Cordelia Cruise items sum to ${cordeliaSum}, expected 210000`);
}

for (const [i, [category, note, amount]] of cordeliaItems.entries()) {
  const date = daysAgo(39 - Math.floor(i / 2));
  entries.push({
    chapterId: 'chapter-cordelia-cruise',
    localId: `cc-${i + 1}`,
    amount,
    category,
    note,
    paymentMethod: ['upi', 'card', 'cash', 'netbanking'][i % 4],
    date,
  });
}

const chapterOps = chapters.map((c) => ({
  updateOne: {
    filter: { userId: USER_ID, localId: c.localId },
    update: {
      $set: {
        userId: USER_ID,
        localId: c.localId,
        name: c.name,
        budget: c.budget,
        archived: c.archived,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      },
      $unset: { deletedAt: '' },
    },
    upsert: true,
  },
}));
await db.collection('chapters').bulkWrite(chapterOps);

const entryOps = entries.map((e) => ({
  updateOne: {
    filter: { userId: USER_ID, localId: e.localId },
    update: {
      $set: {
        userId: USER_ID,
        localId: e.localId,
        chapterId: e.chapterId,
        amount: e.amount,
        category: e.category,
        note: e.note,
        paymentMethod: e.paymentMethod,
        date: e.date,
        createdAt: e.date,
        updatedAt: e.date,
      },
      $unset: { deletedAt: '' },
    },
    upsert: true,
  },
}));
await db.collection('chapterEntries').bulkWrite(entryOps);

console.log(
  `Seeded ${chapters.length} chapters and ${entries.length} chapter expenses for ${USER_ID}`
);

await client.close();
