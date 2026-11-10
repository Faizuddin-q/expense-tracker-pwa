import { setDefaultAutoSelectFamilyAttemptTimeout } from 'node:net';
import { after } from 'next/server';
import { MongoClient, type Db } from 'mongodb';
import { ensureUserDataIndexes } from '@/lib/user-data';

// A failed IPv6 attempt otherwise waits 500ms before IPv4 on a new socket.
setDefaultAutoSelectFamilyAttemptTimeout(250);

declare global {
  var __pockettMongoClientPromise: Promise<MongoClient> | undefined;
}

const clientOptions = {
  maxPoolSize: 10,
  minPoolSize: 0,
  // The first screen fires four list reads at once. Open their sockets together.
  maxConnecting: 4,
  // Skip the IPv6 wait on the Atlas handshake. Data is unchanged.
  family: 4 as const,
  autoSelectFamily: false,
  autoSelectFamilyAttemptTimeout: 250,
  // Fail a stuck pool or a dead primary instead of hanging the request.
  serverSelectionTimeoutMS: 8_000,
  waitQueueTimeoutMS: 8_000,
  // zlib ships with Node. Level 1 shrinks the Atlas round trip without much CPU.
  compressors: ['zlib' as const],
  zlibCompressionLevel: 1 as const,
};

let indexesScheduled = false;

/** Index builds open their own sockets. Run them after the response is sent. */
const scheduleIndexes = (db: Db) => {
  if (indexesScheduled) return;
  indexesScheduled = true;
  try {
    after(() => {
      void ensureUserDataIndexes(db);
    });
  } catch (error) {
    indexesScheduled = false;
    console.error('[db] schedule indexes failed', error);
  }
};

/**
 * One Mongo client per process. The promise is cached (not just the client)
 * so parallel cold requests share a single TLS handshake.
 * https://www.mongodb.com/docs/drivers/node-frameworks/next-integration/
 */
export const getDb = async () => {
  if (!process.env.MONGODB_URI)
    throw new Error('MONGODB_URI is not configured');

  if (!globalThis.__pockettMongoClientPromise) {
    const client = new MongoClient(process.env.MONGODB_URI, clientOptions);
    globalThis.__pockettMongoClientPromise = client.connect().then(
      (connected) => connected,
      (error: unknown) => {
        globalThis.__pockettMongoClientPromise = undefined;
        throw error;
      }
    );
  }

  const connected = await globalThis.__pockettMongoClientPromise;
  const db = connected.db('pocket');
  scheduleIndexes(db);
  return db;
};
