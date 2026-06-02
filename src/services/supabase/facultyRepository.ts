import { getRowById } from "@/supabase/queries";
import { TABLES } from "@/supabase/tables";
import type { FacultyModel } from "@/models/Faculty";
import { requireSupabaseClient } from "@/supabase/client";

export async function getFacultyById(id: string): Promise<FacultyModel | null> {
  return getRowById<FacultyModel>(TABLES.faculties, id);
}

export async function getAllFaculties(): Promise<FacultyModel[]> {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase.from(TABLES.faculties).select("*");
  
  if (error) {
    console.error("Error fetching faculties:", error);
    throw error;
  }
  return data || [];
}
