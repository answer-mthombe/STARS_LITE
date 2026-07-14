import { getRowById } from "@/supabase/queries";
import { TABLES } from "@/supabase/tables";
import type { ModuleModel } from "@/models/Module";
// Fixed Import: Pulling the explicit client getter function from your client file

import { requireSupabaseClient } from "@/supabase/client";
import { fromRow } from "@/supabase/mappers/idBasedMapper";



export async function getModuleById(id: string): Promise<ModuleModel | null> {
  return getRowById<ModuleModel>(TABLES.modules, id);
}


export async function listModulesForStudent(studentId: string): Promise<ModuleModel[]> {
const client = requireSupabaseClient();
  const { data, error } = await client
    .from(TABLES.modules)
    .select("*")
    .contains("enrolled_students", JSON.stringify([studentId])); // Assumes enrolled_students is a JSONB array

  if (error) {
    console.error("Error in listModulesForStudent:", error);
    throw error;
  }
  return (data || []).map((row) => fromRow(row) as ModuleModel);
}

export async function listModulesForLecturer(lecturerId: string): Promise<ModuleModel[]> {
  const client = requireSupabaseClient();
  const { data, error } = await client
    .from(TABLES.modules)
    .select("*")
    .or(`lecturer_id.eq.${lecturerId},co_lecturer_ids.cs.["${lecturerId}"]`);

  if (error) {
    console.error("Error fetching lecturer modules:", error);
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