import { getRowById } from "@/supabase/queries";
import { TABLES } from "@/supabase/tables";
import type { StudentModel } from "@/models/Student";
import { requireSupabaseClient } from "@/supabase/client";
import { fromRow } from "@/supabase/mappers/idBasedMapper";

export async function getStudentById(id: string): Promise<StudentModel | null> {
  return getRowById<StudentModel>(TABLES.students, id);
}

/** Batch lookup — used where a screen needs several students at once (e.g. pending/enrolled lists). */
export async function getStudentsByIds(ids: string[]): Promise<StudentModel[]> {
  if (ids.length === 0) return [];

  const client = requireSupabaseClient();

  const { data, error } = await client
    .from(TABLES.students)
    .select("*")
    .in("id", ids);

  if (error) {
    console.error("Error fetching students by ids:", error);
    throw error;
  }

  return (data || []).map((row) => fromRow(row) as StudentModel);
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