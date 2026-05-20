import { getRowById } from "@/supabase/queries";
import { TABLES } from "@/supabase/tables";
import type { FacultyModel } from "@/models/Faculty";

export async function getFacultyById(id: string): Promise<FacultyModel | null> {
  return getRowById<FacultyModel>(TABLES.faculties, id);
}
