import { getRowById } from "@/supabase/queries";
import { TABLES } from "@/supabase/tables";
import type { AttendanceSessionModel } from "@/models/Attendance";

export async function getAttendanceSessionById(id: string): Promise<AttendanceSessionModel | null> {
  return getRowById<AttendanceSessionModel>(TABLES.attendanceSessions, id);
}
