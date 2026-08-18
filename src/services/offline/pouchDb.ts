import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type OfflineEntityDoc<T> = T & {
  _id: string;
  _rev?: string;
  collection: string;
  updatedAt: string;
};

export type OfflineMutationDoc = {
  _id: string;
  _rev?: string;
  kind: "mutation";
  createdAt: string;
  mutationId: string;
  collection: string;
  entityId: string;
  op: "set" | "update" | "delete";
  payload?: unknown;
  status: "pending" | "acked" | "failed";
  lastError?: string;
};

type AnyDoc = OfflineEntityDoc<any> | OfflineMutationDoc;

class MemoryStorageAdapter {
  private store = new Map<string, any>();

  async get(id: string) {
    if (!this.store.has(id)) throw { status: 404, message: "Not found" };
    return this.store.get(id);
  }

  async put(doc: AnyDoc) {
    const revNum = doc._rev ? parseInt(doc._rev.split("-")[0], 10) + 1 : 1;
    doc._rev = `${revNum}-local`;
    this.store.set(doc._id, doc);
    return { ok: true, id: doc._id, rev: doc._rev };
  }

  async allDocs(_opts: { include_docs?: boolean; startkey?: string; endkey?: string }) {
    const rows: { doc: AnyDoc }[] = [];
    for (const [id, doc] of this.store.entries()) {
      rows.push({ doc });
    }
    return { rows };
  }
}

class ReactNativeAsyncStorageAdapter {
  private prefix = "stars_offline_";

  async get(id: string): Promise<AnyDoc> {
    const val = await AsyncStorage.getItem(this.prefix + id);
    if (!val) throw { status: 404, message: "Not found" };
    return JSON.parse(val);
  }

  async put(doc: AnyDoc) {
    const existingVal = await AsyncStorage.getItem(this.prefix + doc._id);
    let revNum = 1;
    if (existingVal) {
      try {
        const parsed = JSON.parse(existingVal);
        if (parsed._rev) {
          revNum = parseInt(parsed._rev.split("-")[0], 10) + 1;
        }
      } catch {}
    }
    doc._rev = `${revNum}-local`;
    await AsyncStorage.setItem(this.prefix + doc._id, JSON.stringify(doc));
    return { ok: true, id: doc._id, rev: doc._rev };
  }

  async allDocs(opts: { include_docs?: boolean; startkey?: string; endkey?: string }) {
    const keys = await AsyncStorage.getAllKeys();
    const targetKeys = keys.filter((k) => k.startsWith(this.prefix));
    const pairs = await AsyncStorage.multiGet(targetKeys);

    let rows: { doc: AnyDoc }[] = [];
    for (const [storageKey, val] of pairs) {
      if (!val) continue;
      try {
        const doc: AnyDoc = JSON.parse(val);
        if (opts.startkey && doc._id < opts.startkey.replace("mutation:", "")) {
          // filtering logic
        }
        rows.push({ doc });
      } catch {}
    }

    if (opts.startkey) {
      const prefixFilter = opts.startkey.replace("\uffff", "");
      rows = rows.filter((r) => r.doc._id.startsWith(prefixFilter));
    }

    return { rows };
  }
}

let _dbInstance: any = null;

export function getOfflineDb() {
  if (_dbInstance) return _dbInstance;

  if (Platform.OS === "web") {
    _dbInstance = new MemoryStorageAdapter();
  } else {
    _dbInstance = new ReactNativeAsyncStorageAdapter();
  }

  return _dbInstance;
}

export function entityDocId(collection: string, entityId: string) {
  return `entity:${collection}:${entityId}`;
}

export function mutationDocId(mutationId: string) {
  return `mutation:${mutationId}`;
}