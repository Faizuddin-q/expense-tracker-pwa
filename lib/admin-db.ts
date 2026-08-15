import { MongoClient } from 'mongodb';

let client: MongoClient | null = null;

/** Shared Mongo connection for every /api/admin route — same "pocket" database the app syncs to. */
export const adminDb = async () => {
  if (!process.env.MONGODB_URI)
    throw new Error('MONGODB_URI is not configured');
  client ??= new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  return client.db('pocket');
};
