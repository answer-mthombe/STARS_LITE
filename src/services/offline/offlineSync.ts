import { getFirebaseDb } from "@/firebase/app";
import { COLLECTIONS } from "@/firebase/collections";
import { doc, setDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";

import { getOfflineDb, mutationDocId, type OfflineMutationDoc } from "@/services/offline/pouchDb";

/**
 * Offline sync engine.
 *
 * Best practice: keep this file generic (no screen logic). Screens call services, services write mutations,
 * sync pushes mutations to the live backend in the background.
 */

export async function enqueueMutation(args: Omit<OfflineMutationDoc, "_id" | "kind" | "status" | "createdAt">) {
  const db = getOfflineDb();
  const _id = mutationDocId(args.mutationId);
  const docToSave: OfflineMutationDoc = {
    _id,
    kind: "mutation",
    createdAt: new Date().toISOString(),
    status: "pending",
    ...args,
  };

  try {
    const existing = await db.get<OfflineMutationDoc>(_id);
    // Already queued → keep status if pending/failed; update payload to latest intent.
    await db.put({ ...existing, ...docToSave, _rev: existing._rev });
  } catch (e: any) {
    if (e?.status !== 404) throw e;
    await db.put(docToSave as any);
  }
}

export async function processOutboxOnce() {
  const db = getOfflineDb();

  // PouchDB requires an index for sort fields. Create it once (safe to call repeatedly).
  try {
    await (db as any).createIndex({
      index: { fields: ["kind", "status", "createdAt"] },
      name: "idx_outbox_kind_status_createdAt",
    });
  } catch {
    // ignore index errors (older adapters / race conditions)
  }

  const res = await db.find({
    selector: { kind: "mutation", status: { $in: ["pending", "failed"] } },
    sort: ["createdAt"],
    limit: 50,
  } as any);

  const pending = res.docs as OfflineMutationDoc[];
  if (pending.length === 0) return { pushed: 0 };

  // Minimal Firestore push implementation.
  // NOTE: PouchDB doesn't sync to Firestore natively; we push mutations through this adapter.
  const liveDb = getFirebaseDb();

  let pushed = 0;
  for (const m of pending) {
    try {
      const col = (COLLECTIONS as any)[m.collection] ?? m.collection;
      const ref = doc(liveDb, col, m.entityId);

      if (m.op === "delete") {
        await deleteDoc(ref);
      } else if (m.op === "set") {
        await setDoc(ref, { ...(m.payload as any), updatedAt: serverTimestamp() }, { merge: true });
      } else {
        await updateDoc(ref, { ...(m.payload as any), updatedAt: serverTimestamp() } as any);
      }

      const existing = await db.get<OfflineMutationDoc>(m._id);
      await db.put({ ...existing, status: "acked", lastError: undefined, _rev: existing._rev } as any);
      pushed += 1;
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : "Sync failed";
      try {
        const existing = await db.get<OfflineMutationDoc>(m._id);
        await db.put({ ...existing, status: "failed", lastError: msg, _rev: existing._rev } as any);
      } catch {
        // ignore secondary errors
      }
    }
  }

  return { pushed };
}

