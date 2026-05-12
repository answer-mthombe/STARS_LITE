import { Platform } from "react-native";

// Some PouchDB deps expect setImmediate during module evaluation (web doesn't always provide it).
if (typeof (globalThis as any).setImmediate !== "function") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).setImmediate = (fn: (...args: any[]) => void, ...args: any[]) => setTimeout(fn, 0, ...args);
}

let _pluginsInstalled = false;
let _PouchDBCore: any | null = null;

function ensurePluginsInstalled() {
  if (_pluginsInstalled) return;

  // Lazy-require so the polyfill above is in place first.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Core = require("pouchdb-core");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Find = require("pouchdb-find");
  _PouchDBCore = Core?.default ?? Core;

  _PouchDBCore.plugin(Find?.default ?? Find);

  // Avoid importing native-only adapters into the web bundle (and vice versa).
  if (Platform.OS === "web") {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const IndexedDbAdapter = require("pouchdb-adapter-indexeddb");
    _PouchDBCore.plugin(IndexedDbAdapter?.default ?? IndexedDbAdapter);
  } else {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const AsyncStorageAdapter = require("pouchdb-adapter-asyncstorage");
    _PouchDBCore.plugin(AsyncStorageAdapter?.default ?? AsyncStorageAdapter);
  }

  _pluginsInstalled = true;
}

export type OfflineEntityDoc<T> = T & {
  _id: string;
  /** Incremented by PouchDB on each update */
  _rev?: string;
  /** Logical collection name for querying */
  collection: string;
  /** ISO timestamp when the doc was last updated locally */
  updatedAt: string;
};

export type OfflineMutationDoc = {
  _id: string;
  _rev?: string;
  kind: "mutation";
  createdAt: string;
  /** Dedup key so we can safely retry */
  mutationId: string;
  collection: string;
  entityId: string;
  op: "set" | "update" | "delete";
  payload?: unknown;
  /** sync status */
  status: "pending" | "acked" | "failed";
  lastError?: string;
};

type AnyDoc = OfflineEntityDoc<any> | OfflineMutationDoc;

let _db: PouchDB.Database<AnyDoc> | null = null;

export function getOfflineDb(): PouchDB.Database<AnyDoc> {
  if (_db) return _db;

  ensurePluginsInstalled();
  if (!_PouchDBCore) throw new Error("Offline DB not initialized.");

  const name = "stars-offline";
  const adapter = Platform.OS === "web" ? ("indexeddb" as const) : ("asyncstorage" as const);

  _db = new _PouchDBCore(name, { adapter }) as PouchDB.Database<AnyDoc>;
  return _db;
}

export function entityDocId(collection: string, entityId: string) {
  return `entity:${collection}:${entityId}`;
}

export function mutationDocId(mutationId: string) {
  return `mutation:${mutationId}`;
}

