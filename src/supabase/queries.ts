import { requireSupabaseClient } from "@/supabase/client";
import { fromRow } from "@/supabase/mappers";
import { resolveTableName } from "@/supabase/tables";

export async function getRowById<T extends { id: string }>(
  tableKey: string,
  id: string
): Promise<T | null> {
  const supabase = requireSupabaseClient();
  const table = resolveTableName(tableKey);
  const { data, error } = await supabase.from(table).select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return fromRow<T>(data as Record<string, unknown> | null);
}
