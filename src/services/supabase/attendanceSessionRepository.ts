import { getRowById } from "@/supabase/queries";
import { TABLES } from "@/supabase/tables";
import type { AttendanceSessionModel } from "@/models/Attendance";
import { requireSupabaseClient } from "@/supabase/client";
import { fromRow } from "@/supabase/mappers/idBasedMapper";

export async function getAttendanceSessionById(id: string): Promise<AttendanceSessionModel | null> {
  return getRowById<AttendanceSessionModel>(TABLES.attendanceSessions, id);
}





export const attendanceSessionRepository = {
  async getActiveSession(sessionId: string): Promise<AttendanceSessionModel | null> {
    const client = requireSupabaseClient();
    console.log("DEBUG: Searching for ID:", `"${sessionId}"`);
    const { data, error } = await client
      .from(TABLES.attendanceSessions)
      .select("*")
      .eq("id", sessionId)
      .eq("active", true)
      .single();

      console.log("Supabase response:", { data, error });
    
    if (error) {
      console.error("Supabase error in getActiveSession:", error);
      return null;
    }

    if (!data) return null;

    // Convert Postgres snake_case to React Native camelCase
    return fromRow(data) as AttendanceSessionModel;
  }
};

