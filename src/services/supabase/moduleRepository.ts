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
.or(`lecturer_id.eq.${lecturerId},co_lecturer_ids.cs.${JSON.stringify([lecturerId])}`);

  if (error) {
    console.error("Error fetching lecturer modules:", error);
    throw error;
  }
  return (data || []).map((row) => fromRow(row) as ModuleModel);
}

export async function getLinkedStudentId(): Promise<string | null> {
  const client = requireSupabaseClient();
  const { data: { session } } = await client.auth.getSession();
  if (!session?.user?.id) return null;
    
  const { data, error } = await client
    .from(TABLES.userProfiles)
    .select("linked_student_id")
    .eq("id", session.user.id) // Using the true UUID
    .single();

  if (error || !data) return null;
  return data.linked_student_id;
}

export async function fetchStudentProfile(studentId: string) {
  const client = requireSupabaseClient();
  const { data, error } = await client
    .from(TABLES.students)
    .select("*")
    .eq("id", studentId)
    .single();

  if (error) {
    console.error("Error fetching student profile:", error);
    return null;
  }
  return data;
}