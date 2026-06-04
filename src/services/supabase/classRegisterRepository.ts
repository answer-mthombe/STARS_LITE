import { requireSupabaseClient } from "@/supabase/client";
import { TABLES } from "@/supabase/tables";
import type { ClassRegisterModel } from "@/models/ClassRegister";

export const classRegisterRepository = {
  
  async getById(id: string): Promise<ClassRegisterModel | null> {
    const client = requireSupabaseClient();
    const { data, error } = await client
      .from(TABLES.classRegisters) // Assuming 'class_registers'
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) return null;
    
    // We map snake_case from DB back to camelCase for the frontend
    return mapRegisterToModel(data);
  },

  async listForModule(moduleId: string): Promise<ClassRegisterModel[]> {
    const client = requireSupabaseClient();
    const { data, error } = await client
      .from(TABLES.classRegisters)
      .select("*")
      .eq("module_id", moduleId)
      .order("created_at", { ascending: false });

    if (error || !data) return [];
    return data.map(mapRegisterToModel);
  },

  async listForTutor(tutorStudentId: string): Promise<ClassRegisterModel[]> {
    const client = requireSupabaseClient();
    // Using the Supabase contains operator for JSONB/Arrays
    const { data, error } = await client
      .from(TABLES.classRegisters)
      .select("*")
      .contains("tutor_student_ids", [tutorStudentId]) 
      .order("created_at", { ascending: false });

    if (error || !data) return [];
    return data.map(mapRegisterToModel);
  }
};

// Helper to map DB row to your Frontend Model
function mapRegisterToModel(row: any): ClassRegisterModel {
  return {
    id: row.id,
    sessionId: row.session_id,
    moduleId: row.module_id,
    moduleCode: row.module_code,
    moduleName: row.module_name,
    tutorStudentIds: row.tutor_student_ids || [],
    tutorNames: row.tutor_names || [],
    lecturerId: row.lecturer_id,
    lecturerName: row.lecturer_name,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    durationMinutes: row.duration_minutes,
    students: row.students || [], // JSONB array of attendance results
    confirmedByTutorStudentIds: row.confirmed_by_tutor_student_ids || [],
    confirmedByLecturer: row.confirmed_by_lecturer,
    pdfUri: row.pdf_uri,
    htmlSnapshot: row.html_snapshot,
    createdAt: row.created_at,
  };
}