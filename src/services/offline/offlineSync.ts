import { tryGetSupabaseClient } from "@/supabase/client";
import { toRow } from "@/supabase/mappers";
import { resolveTableName } from "@/supabase/tables";

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
  const supabase = tryGetSupabaseClient();
  if (!supabase) return { pushed: 0 };

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

  let pushed = 0;
  for (const m of pending) {
    try {
      const table = resolveTableName(m.collection);
      const updatedAt = new Date().toISOString();

      if (m.op === "delete") {
        const { error } = await supabase.from(table).delete().eq("id", m.entityId);
        if (error) throw error;
      } else if (m.op === "set") {
        const row = toRow({
          id: m.entityId,
          ...(m.payload as Record<string, unknown>),
          updatedAt,
        } as { id: string });
        const { error } = await supabase.from(table).upsert(row, { onConflict: "id" });
        if (error) throw error;
      } else {
        const row = toRow({
          ...(m.payload as Record<string, unknown>),
          updatedAt,
          id: m.entityId,
        } as { id: string });
        const { id: _id, ...patch } = row;
        const { error } = await supabase.from(table).update(patch).eq("id", m.entityId);
        if (error) throw error;
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
