import { getRowById } from "@/supabase/queries";
import { TABLES } from "@/supabase/tables";
import type { ModuleModel } from "@/models/Module";
// Fixed Import: Pulling the explicit client getter function from your client file
import { requireSupabaseClient,isSupabaseEnabled} from "@/supabase/client"; 


export async function getModuleById(id: string): Promise<ModuleModel | null> {
  return getRowById<ModuleModel>(TABLES.modules, id);
}

/**
 * Fetches all modules where the user is either the primary lecturer or a co-lecturer.
 * 
 * LIMITATION DOCUMENTATION (STORY-302 / JOB-013):
 * This query explicitly handles primary lecturers and co-lecturers only. 
 * The tutor access path has been deferred to JOB-026.
 * 
 * @param lecturerId The UUID of the lecturer
 */
export async function listModulesForLecturer(lecturerId: string): Promise<ModuleModel[]> {
  try {
    const supabase = requireSupabaseClient();

    const { data, error } = await supabase
      .from(TABLES.modules)
      .select("*")
      .or(`lecturer_id.eq.${lecturerId},co_lecturer_ids.cs.["${lecturerId}"]`);

    if (error) {
      console.error("Error fetching modules for lecturer:", error.message);
      throw new Error(`Failed to fetch modules: ${error.message}`);
    }

    // Explicitly transform Postgres snake_case into frontend camelCase
    return (data || []).map((dbRow: any) => ({
      id: dbRow.id,
      moduleCode: dbRow.module_code,
      moduleName: dbRow.module_name,
      courseId: dbRow.course_id,
      lecturerId: dbRow.lecturer_id,
      enrolledStudents: dbRow.enrolled_students || [],
      pendingRequests: dbRow.pending_requests || [],
      tutorIds: dbRow.tutor_ids || null,
      coLecturerIds: dbRow.co_lecturer_ids || [],
      classCode: dbRow.class_code,
      activeSessionId: dbRow.active_session_id || null,
      createdAt: dbRow.created_at,
      updatedAt: dbRow.updated_at,
    }));
  } catch (error) {
    console.error("Unexpected repository error:", error);
    throw error;
  }
}