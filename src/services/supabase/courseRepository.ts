import { getRowById } from "@/supabase/queries";
import { TABLES } from "@/supabase/tables";
import type { CourseModel } from "@/models/Course";
import { requireSupabaseClient } from "@/supabase/client";

export async function getCourseById(id: string): Promise<CourseModel | null> {
  return getRowById<CourseModel>(TABLES.courses, id);
}


export async function getAllCourses(): Promise<CourseModel[]> {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase.from(TABLES.courses).select("*");
  
  if (error) {
    console.error("Error fetching courses:", error);
    throw error;
  }
  return data || [];
}