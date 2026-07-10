import { requireSupabaseClient } from "@/supabase/client";
import { fromRow } from "@/supabase/mappers";
import { TABLES } from "@/supabase/tables";
import type { ModuleModel } from "@/models/Module";

/**
 * Fetches a single module by its ID using standard Supabase syntax.
 */
export async function getModuleById(id: string): Promise<ModuleModel | null> {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase
    .from(TABLES.modules)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error(`Error fetching module by ID ${id}:`, error);
    throw error;
  }

  return data ? fromRow<ModuleModel>(data) : null;
}

/**
 * JOB-012: Fetch modules where the student is enrolled.
 * Uses PostgREST array containment to match the studentId in enrolled_students.
 */
export async function listModulesForStudent(
  studentId: string,
): Promise<ModuleModel[]> {
  const supabase = requireSupabaseClient();

  const { data, error } = await supabase
    .from(TABLES.modules)
    .select("*")
    .contains("enrolled_students", JSON.stringify([studentId]));

  if (error) {
    console.error("[JOB-012] Error fetching student modules:", error);
    throw error;
  }

  return (data ?? [])
    .map((row) => fromRow<ModuleModel>(row))
    .filter((module): module is ModuleModel => module !== null);

}


//just got added for M4 ........................................................................................
export async function setActiveSession(
  moduleId: string,
  sessionId: string
): Promise<void> {
  const supabase = requireSupabaseClient();

  const { error } = await supabase
    .from(TABLES.modules)
    .update({
      active_session_id: sessionId,
    })
    .eq("id", moduleId);

  if (error) {
    console.error("[JOB-020] Failed to set active session:", error);
    throw error;
  }
}

export async function clearActiveSession(
  moduleId: string
): Promise<void> {
  const supabase = requireSupabaseClient();

  const { error } = await supabase
    .from(TABLES.modules)
    .update({
      active_session_id: null,
    })
    .eq("id", moduleId);

  if (error) {
    console.error("[JOB-020] Failed to clear active session:", error);
    throw error;
  }
}