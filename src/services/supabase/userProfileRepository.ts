import { fromRow, toRow } from "@/supabase/mappers";
import { getRowById } from "@/supabase/queries";
import { requireSupabaseClient } from "@/supabase/client";
import { TABLES } from "@/supabase/tables";
import type { SupabaseUserProfileDoc } from "@/types/supabaseUserProfile";

export async function getUserProfileByUid(
  uid: string,
): Promise<SupabaseUserProfileDoc | null> {
  return getRowById<SupabaseUserProfileDoc>(TABLES.userProfiles, uid);
}

export async function createUserProfile(
  profile: SupabaseUserProfileDoc,
): Promise<SupabaseUserProfileDoc> {
  const supabase = requireSupabaseClient();

  const { data, error } = await supabase
    .from(TABLES.userProfiles)
    .insert(toRow(profile))
    .select()
    .single();

  if (error) throw error;

  return fromRow<SupabaseUserProfileDoc>(
    data as Record<string, unknown>
  ) as SupabaseUserProfileDoc;
}

export async function updateUserProfile(
  uid: string,
  updates: Partial<SupabaseUserProfileDoc>,
): Promise<SupabaseUserProfileDoc> {
  const supabase = requireSupabaseClient();

  const { data, error } = await supabase
    .from(TABLES.userProfiles)
    .update(toRow({ id: uid, ...updates } as SupabaseUserProfileDoc))
    .eq("id", uid)
    .select()
    .single();

  if (error) throw error;

  return fromRow<SupabaseUserProfileDoc>(
    data as Record<string, unknown>
  ) as SupabaseUserProfileDoc;
}

export async function upsertUserProfile(
  profile: SupabaseUserProfileDoc,
): Promise<SupabaseUserProfileDoc> {
  const supabase = requireSupabaseClient();

  const { data, error } = await supabase
    .from(TABLES.userProfiles)
    .upsert(toRow(profile))
    .select()
    .single();

  if (error) throw error;

  return fromRow<SupabaseUserProfileDoc>(
    data as Record<string, unknown>
  ) as SupabaseUserProfileDoc;
}

// ---------------------------------------------------------------------------
// JOB-026 — Delegation & proxy writes: keep delegated_module_ids /
// active_proxy_ids on user_profiles in sync (derived from the source tables,
// rather than incrementally patched, so a missed revoke can't leave stale ids).
// ---------------------------------------------------------------------------

/** Tutor/registrar profiles are linked via `linked_student_id`. */
export async function getUserProfileByLinkedStudentId(
  studentId: string,
): Promise<SupabaseUserProfileDoc | null> {
  const supabase = requireSupabaseClient();

  const { data, error } = await supabase
    .from(TABLES.userProfiles)
    .select("*")
    .eq("linked_student_id", studentId)
    .maybeSingle();

  if (error) throw error;

  return fromRow<SupabaseUserProfileDoc>(data as Record<string, unknown> | null);
}

/** Dean/HOD/lecturer proxy grantees are linked via `linked_person_id` (falls back to profile id). */
export async function getUserProfileByLinkedPersonId(
  personId: string,
): Promise<SupabaseUserProfileDoc | null> {
  const supabase = requireSupabaseClient();

  // NOTE: previously also tried `.or(\`linked_person_id.eq.${personId},id.eq.${personId}\`)`
  // as a fallback — but user_profiles.id is a real Supabase-generated UUID,
  // while personId here (e.g. "lec_mkhize") never is. Postgres tries to cast
  // the whole OR expression, so a non-UUID personId broke the ENTIRE query,
  // not just that branch. Dropped the fallback — it was never valid for this
  // schema's person ids anyway.
  const { data, error } = await supabase
    .from(TABLES.userProfiles)
    .select("*")
    .eq("linked_person_id", personId)
    .maybeSingle();

  if (error) throw error;

  return fromRow<SupabaseUserProfileDoc>(data as Record<string, unknown> | null);
}

/** Recompute and persist `delegated_module_ids` for the profile linked to this student. */
export async function syncDelegatedModuleIds(
  studentId: string,
  moduleIds: string[],
): Promise<void> {
  const profile = await getUserProfileByLinkedStudentId(studentId);
  if (!profile) return; // no auth profile yet for this student — nothing to sync

  await updateUserProfile(profile.id, {
    delegatedModuleIds: [...new Set(moduleIds)],
  });
}

/** Recompute and persist `active_proxy_ids` for the profile linked to this person. */
export async function syncActiveProxyIds(
  personId: string,
  proxyIds: string[],
): Promise<void> {
  const profile = await getUserProfileByLinkedPersonId(personId);
  if (!profile) return; // grantee has no auth profile yet — nothing to sync

  await updateUserProfile(profile.id, {
    activeProxyIds: [...new Set(proxyIds)],
  });
}