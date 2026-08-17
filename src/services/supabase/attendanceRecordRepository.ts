import { requireSupabaseClient } from "@/supabase/client";
import { TABLES } from "@/supabase/tables";

// export interface IntegratedAttendanceRecord {
//   id: string;
//   student_id: string;
//   session_id: string;
//   status: "present" | "absent" | "late";
//   created_at: string;
//   session?: {
//     id: string;
//     timestamp: string;
//     module?: {
//       module_code: string;
//       module_name: string;
//     };
//   };
// }

// /**
//  * JOB-014: Fetch a student's attendance history joined with session and module data.
//  */
// export async function listForStudent(
//   studentId: string
// ): Promise<IntegratedAttendanceRecord[]> {
//   const supabase = requireSupabaseClient();

//   const { data, error } = await supabase
//     .from(TABLES.attendanceRecords)
//     .select(`
//       id,
//       student_id,
//       session_id,
//       status,
//       created_at,
//       session:attendance_sessions (
//         id,
//         timestamp,
//         module:modules (
//           module_code,
//           module_name
//         )
//       )
//     `)
//     .eq("student_id", studentId)
//     .order("created_at", { ascending: false });

//   if (error) {
//     console.error("[JOB-014] Error fetching student attendance history:", error);
//     throw error;
//   }

//   return (data as unknown as IntegratedAttendanceRecord[]) ?? [];
// }

export interface IntegratedAttendanceRecord {
  id: string;
  session_id: string;
  student_id: string;
  timestamp: string;
  distance: number | null;
  verified: boolean;
  passed: boolean;

  session: {
    id: string;
    created_at: string;

    module: {
      module_code: string;
      module_name: string;
    } | null;
  } | null;
}

export async function listForStudent(
  studentId: string
): Promise<IntegratedAttendanceRecord[]> {
  const supabase = requireSupabaseClient();

  const { data, error } = await supabase
    .from(TABLES.attendanceRecords)
    .select(`
      id,
      session_id,
      student_id,
      timestamp,
      distance,
      verified,
      passed,
      session:attendance_sessions(
        id,
        created_at,
        module:modules(
          module_code,
          module_name
        )
      )
    `)
    .eq("student_id", studentId)
    .order("timestamp", { ascending: false });

  if (error) {
    console.error("[JOB-014] Error fetching student attendance history:", error);
    throw error;
  }

  return (data as unknown as IntegratedAttendanceRecord[]) ?? [];

}

export interface AttendanceRecordPayload {
  id:string;
  session_id: string;
  student_id: string;
  device_id: string;
  time_bucket: number;
  gps_bucket_hash: string;
  tapped_index: number;
  tier_used: number;
  action_hash: string;
  passed: boolean;
  timestamp: string; // <-- Added timestamp
  distance: number | null; // <-- Added distance
  verified: boolean; // <-- Added verified
}

export async function saveRecord(payload: AttendanceRecordPayload): Promise<void> {
  const supabase = requireSupabaseClient();

  const { error } = await supabase
    .from(TABLES.attendanceRecords)
    .insert([
      {
        id: payload.id,
        session_id: payload.session_id,
        student_id: payload.student_id,
        device_id: payload.device_id,
        time_bucket: payload.time_bucket,
        gps_bucket_hash: payload.gps_bucket_hash,
        tapped_index: payload.tapped_index,
        tier_used: payload.tier_used,
        action_hash: payload.action_hash,
        passed: payload.passed,
        timestamp: payload.timestamp,
        distance: payload.distance,
        verified: payload.verified,
      }
    ]);

  if (error) {
    // If a student tries to cheat and check in twice with the same device, 
    // Postgres throws a unique constraint violation error (code 23505).
    if (error.code === '23505') {
      throw new Error("Already checked in on this device.");
    }
    console.error("[JOB-021] Failed to save attendance record:", error.message);
    throw new Error("Could not save attendance record. Please try again.");
  }
}

export async function hasAlreadyCheckedIn(sessionId: string, deviceId: string): Promise<boolean> {
  const supabase = requireSupabaseClient();

  const { data, error } = await supabase
    .from(TABLES.attendanceRecords)
    .select("id")
    .eq("session_id", sessionId)
    .eq("device_id", deviceId)
    .maybeSingle();

  if (error) {
    console.error("[JOB-024] Error checking attendance duplicate:", error);
    return false;
  }

  return Boolean(data);
}