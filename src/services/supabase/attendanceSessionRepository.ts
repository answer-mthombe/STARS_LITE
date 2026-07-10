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

// new functions added from m4 job 019
export async function createSession(session: {
  moduleId: string;
  hostRole: string;
  hostId: string;
  latitude: number;
  longitude: number;
  algorithmSeed: string;
  radius: number;
  expiresAt: string;
  active: boolean;
}) {
  const client = requireSupabaseClient();

  const { data, error } = await client
    .from(TABLES.attendanceSessions)
  .insert({
  module_id: session.moduleId,
  lecturer_id: session.hostId,
  started_by_role: session.hostRole,
  started_by_id: session.hostId,
  lecturer_location: {
    latitude: session.latitude,
    longitude: session.longitude,
  },
  algorithm_seed: session.algorithmSeed,
  radius: session.radius,
  expires_at: session.expiresAt,
  active: session.active,
})
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}



