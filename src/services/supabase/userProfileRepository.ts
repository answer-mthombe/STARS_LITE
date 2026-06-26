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