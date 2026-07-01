import { getDataSource } from "@/services/dataSource";
import { mockDB } from "@/mockDB/mockDBService";
import { listForStudent as listForStudentSupabase } from "@/services/supabase/attendanceRecordRepository";

export const attendanceService = {
  /**
   * JOB-014 — Routes the data fetching logic based on the EXPO_PUBLIC_DATA_SOURCE toggle.
   */
  async getStudentAttendanceHistory(studentId: string) {
    if (getDataSource() === "mock") {
      mockDB.touch();
      // Fallback matching how mockDB queries logs for a student
      return mockDB
        .list("attendanceRecords")
        .filter((record) => record.studentId === studentId);
    }

    // Live Supabase Path
    return listForStudentSupabase(studentId);
  }
};