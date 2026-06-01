import { getRowById } from "@/supabase/queries";
import { TABLES } from "@/supabase/tables";
import type { AttendanceRecordModel } from "@/models/Attendance";
import { requireSupabaseClient } from "@/supabase/client";

export async function getAttendanceRecordById(id: string): Promise<AttendanceRecordModel | null> {
  return getRowById<AttendanceRecordModel>(TABLES.attendanceRecords, id);
}


export const attendanceRecordRepository = {
  async saveRecord(record: AttendanceRecordModel): Promise<{ ok: true } | { ok: false; reason: string }> {
    const client = requireSupabaseClient();
    
    // We map to snake_case here to match our normalized schema
    const { error } = await client.from(TABLES.attendanceRecords).insert({
      session_id: record.sessionId,
      student_id: record.studentId,
      distance: record.distance,
      verified: record.verified,
      device_id: record.deviceId,
      time_bucket: record.timeBucket,
      gps_bucket_hash: record.gpsBucketHash,
      tapped_index: record.tappedIndex,
      tier_used: record.tierUsed,
      action_hash: record.actionHash,
      passed: record.passed,
    });

    if (error) {
      console.error("Failed to save attendance:", error);
      // Logic for handling Unique Constraint violation: (session_id, device_id)
      if (error.code === '23505') return { ok: false, reason: "Already checked in." };
      return { ok: false, reason: "Database error." };
    }
    return { ok: true };
  }
};
