import { getRowById } from "@/supabase/queries";
import { TABLES } from "@/supabase/tables";
import type { AttendanceRecordModel } from "@/models/Attendance";

export async function getAttendanceRecordById(id: string): Promise<AttendanceRecordModel | null> {
  return getRowById<AttendanceRecordModel>(TABLES.attendanceRecords, id);
}
