import { getRowById } from "@/supabase/queries";
import { TABLES } from "@/supabase/tables";
import type { LecturerModel } from "@/models/Lecturer";

export async function getLecturerById(id: string): Promise<LecturerModel | null> {
  return getRowById<LecturerModel>(TABLES.lecturers, id);
}
