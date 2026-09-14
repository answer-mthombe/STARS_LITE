/*import { getRowById } from "@/supabase/queries";
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
      .maybeSingle();

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

  // 1. Create the new session
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

  // 2. NEW: Update the module to store this new active session ID!
  const { error: moduleUpdateError } = await client
    .from("modules")
    .update({ active_session_id: data.id })
    .eq("id", session.moduleId);

  if (moduleUpdateError) {
    console.error("Failed to link session to module:", moduleUpdateError);
    throw moduleUpdateError;
  }

  return data;
}*/











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
    //console.log("DEBUG: Searching for ID:", `"${sessionId}"`);
    const { data, error } = await client
      .from(TABLES.attendanceSessions)
      .select("*")
      .eq("id", sessionId)
      .eq("active", true)
      .single();

    //  console.log("Supabase response:", { data, error });
    
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
  lecturerId: string;
  latitude: number;
  longitude: number;
  algorithmSeed: string;
  radius: number;
  expiresAt: string;
  active: boolean;
  /** Venue that defines the geofence — required for server-side attendance. */
  venueId?: string | null;
}): Promise<AttendanceSessionModel> {
  const client = requireSupabaseClient();

  const { data, error } = await client
    .from(TABLES.attendanceSessions)
  .insert({
  module_id: session.moduleId,
lecturer_id: session.lecturerId,
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
  venue_id: session.venueId ?? null,
})
    .select()
    .single();

  if (error) {
    throw error;
  }

  const mapped = fromRow<AttendanceSessionModel>(data);
  if (!mapped) throw new Error("Session insert returned no row.");
  return mapped;
}

export async function endSessionAndCreateRegister(args: {
  sessionId: string;
  moduleId: string;
  lecturerId: string;
  studentsPayload: any[]; // The bundled array of attendance data
}) {
  const client = requireSupabaseClient();
  
  // Generate a unique ID for the text-based class_registers.id column
  const registerId = `reg_${Date.now()}`;

  const { data, error } = await client.rpc('end_session_and_create_register', {
    p_session_id: args.sessionId,
    p_module_id: args.moduleId,
    p_register_id: registerId,
    p_lecturer_id: args.lecturerId,
    p_students: args.studentsPayload
  });

  if (error) {
    console.error("Failed to end session and generate register:", error);
    throw error;
  }

  return { ok: true, registerId };
}

