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

  // For maximum cross-adapter stability (IndexedDB/AsyncStorage), avoid Mango sort/index requirements.
  // Use allDocs on the outbox prefix and sort in memory (outbox is small).
  const res = await db.allDocs({
    include_docs: true,
    startkey: "mutation:",
    endkey: "mutation:\uffff",
    limit: 200,
  });

  const pending = res.rows
    .map((r) => r.doc)
    .filter((d): d is OfflineMutationDoc => Boolean(d && (d as any).kind === "mutation"))
    .filter((m) => m.status === "pending" || m.status === "failed")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .slice(0, 50);
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

