import { getDb } from '@/lib/db';

/** Shared Mongo connection for every /api/admin route — same "pocket" database the app syncs to. */
export const adminDb = getDb;
