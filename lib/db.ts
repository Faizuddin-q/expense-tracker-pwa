import { MongoClient } from 'mongodb';
import { ensureUserDataIndexes } from '@/lib/user-data';

declare global {
  var __pockettMongoClient: MongoClient | undefined;
}

/** Shared Mongo connection for every API route — the one "pocket" database the app syncs to. */
export const getDb = async () => {
  if (!process.env.MONGODB_URI)
    throw new Error('MONGODB_URI is not configured');

  // Reuse across hot reloads / serverless invocations in this process.
  const client =
    globalThis.__pockettMongoClient ??
    new MongoClient(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      minPoolSize: 0,
    });
  globalThis.__pockettMongoClient = client;

  await client.connect();
  const db = client.db('pocket');
  void ensureUserDataIndexes(db);
  return db;
};
