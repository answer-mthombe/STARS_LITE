import { getRowById } from "@/supabase/queries";
import { TABLES } from "@/supabase/tables";
import type { StudentModel } from "@/models/Student";

export async function getStudentById(id: string): Promise<StudentModel | null> {
  return getRowById<StudentModel>(TABLES.students, id);
}
