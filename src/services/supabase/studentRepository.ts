import { getRowById } from "@/supabase/queries";
import { TABLES } from "@/supabase/tables";
import type { StudentModel } from "@/models/Student";
import { requireSupabaseClient } from "@/supabase/client";

export async function getStudentById(id: string): Promise<StudentModel | null> {
  return getRowById<StudentModel>(TABLES.students, id);
}


export async function updateRegisteredModules(
  studentId: string,
  registeredModules: string[]
): Promise<void> {
  const client = requireSupabaseClient();

  const { error } = await client
    .from(TABLES.students)
    .update({
      registered_modules: registeredModules,
    })
    .eq("id", studentId);

  if (error) {
    console.error("Error updating student registered modules:", error);
    throw error;
  }
}