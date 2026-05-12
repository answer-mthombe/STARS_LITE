import { entityDocId, getOfflineDb, type OfflineEntityDoc } from "@/services/offline/pouchDb";

export async function upsertEntity<T extends object>(args: {
  collection: string;
  entityId: string;
  entity: T;
  updatedAtIso?: string;
}) {
  const db = getOfflineDb();
  const _id = entityDocId(args.collection, args.entityId);
  const now = args.updatedAtIso ?? new Date().toISOString();

  try {
    const existing = await db.get<OfflineEntityDoc<T>>(_id);
    const next: OfflineEntityDoc<T> = {
      ...existing,
      ...(args.entity as any),
      _id,
      _rev: existing._rev,
      collection: args.collection,
      updatedAt: now,
    };
    await db.put(next as any);
  } catch (e: any) {
    if (e?.status !== 404) throw e;
    const first: OfflineEntityDoc<T> = {
      ...(args.entity as any),
      _id,
      collection: args.collection,
      updatedAt: now,
    };
    await db.put(first as any);
  }
}

export async function getEntityById<T>(collection: string, entityId: string): Promise<OfflineEntityDoc<T> | null> {
  const db = getOfflineDb();
  const _id = entityDocId(collection, entityId);
  try {
    return (await db.get(_id)) as any;
  } catch (e: any) {
    if (e?.status === 404) return null;
    throw e;
  }
}

export async function listEntities<T>(collection: string): Promise<Array<OfflineEntityDoc<T>>> {
  const db = getOfflineDb();
  try {
    await (db as any).createIndex({
      index: { fields: ["collection", "updatedAt"] },
      name: "idx_entities_collection_updatedAt",
    });
  } catch {
    // ignore
  }
  const res = await db.find({
    selector: { collection },
    sort: ["updatedAt"],
  } as any);
  return res.docs as any;
}

