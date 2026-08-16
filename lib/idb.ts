import { createStore, get, set, del } from 'idb-keyval';

/** Dedicated IndexedDB database for this app, instead of idb-keyval's generic default. */
const pockettStore = createStore('pockett-db', 'keyval');

export const idbGet = <T = unknown>(key: IDBValidKey): Promise<T | undefined> =>
  get<T>(key, pockettStore);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const idbSet = (key: IDBValidKey, value: any): Promise<void> =>
  set(key, value, pockettStore);

export const idbDel = (key: IDBValidKey): Promise<void> => del(key, pockettStore);
