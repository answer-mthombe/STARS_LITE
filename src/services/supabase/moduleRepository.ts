import { getRowById } from "@/supabase/queries";
import { TABLES } from "@/supabase/tables";
import type { ModuleModel } from "@/models/Module";
// Fixed Import: Pulling the explicit client getter function from your client file

import { requireSupabaseClient } from "@/supabase/client";
import { fromRow } from "@/supabase/mappers/idBasedMapper";



export async function getModuleById(id: string): Promise<ModuleModel | null> {
  return getRowById<ModuleModel>(TABLES.modules, id);
}



export async function getModuleByClassCode(
  classCode: string
): Promise<ModuleModel | null> {
  const client = requireSupabaseClient();

  const { data, error } = await client
    .from(TABLES.modules)
    .select("*")
    .eq("class_code", classCode)
    .maybeSingle();

  if (error) {
    console.error("Error fetching module by class code:", error);
    throw error;
  }

  return data ? (fromRow(data) as ModuleModel) : null;
}



export async function updateModuleEnrollment(
  moduleId: string,
  enrolledStudents: string[],
  pendingRequests?: string[]
): Promise<void> {
  const client = requireSupabaseClient();

  const updates: {
    enrolled_students: string[];
    pending_requests?: string[];
  } = {
    enrolled_students: enrolledStudents,
  };

  if (pendingRequests !== undefined) {
    updates.pending_requests = pendingRequests;
  }

  const { error } = await client
    .from(TABLES.modules)
    .update(updates)
    .eq("id", moduleId);

  if (error) {
    console.error("Error updating module enrolment:", error);
    throw error;
  }
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
.or(`lecturer_id.eq.${lecturerId},co_lecturer_ids.cs.${JSON.stringify([lecturerId])}`);

  if (error) {
    console.error("Error fetching lecturer modules:", error);
    throw error;
  }
  return (data || []).map((row) => fromRow(row) as ModuleModel);
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