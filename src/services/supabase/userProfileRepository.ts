import { getRowById } from "@/supabase/queries";
import { TABLES } from "@/supabase/tables";
import type { SupabaseUserProfileDoc } from "@/types/supabaseUserProfile";

export async function getUserProfileByUid(uid: string): Promise<SupabaseUserProfileDoc | null> {
  return getRowById<SupabaseUserProfileDoc>(TABLES.userProfiles, uid);
}
