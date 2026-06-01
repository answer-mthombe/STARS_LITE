import { getRowById } from "@/supabase/queries";
import { TABLES } from "@/supabase/tables";
import type { AttendanceSessionModel } from "@/models/Attendance";
import { requireSupabaseClient } from "@/supabase/client";

export async function getAttendanceSessionById(id: string): Promise<AttendanceSessionModel | null> {
  return getRowById<AttendanceSessionModel>(TABLES.attendanceSessions, id);
}


export const attendanceSessionRepository = {
  async getActiveSession(sessionId: string) {
    const client = requireSupabaseClient();
    const { data, error } = await client
      .from(TABLES.attendanceSessions)
      .select("*")
      .eq("id", sessionId)
      .eq("active", true)
      .single();
    
    if (error || !data) return null;
    return data;
  }
};



