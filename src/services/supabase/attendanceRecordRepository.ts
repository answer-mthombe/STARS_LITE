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

  return (data ?? []) as unknown as IntegratedAttendanceRecord[];
}