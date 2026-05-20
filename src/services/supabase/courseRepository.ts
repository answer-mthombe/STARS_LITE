import { getRowById } from "@/supabase/queries";
import { TABLES } from "@/supabase/tables";
import type { CourseModel } from "@/models/Course";

export async function getCourseById(id: string): Promise<CourseModel | null> {
  return getRowById<CourseModel>(TABLES.courses, id);
}
