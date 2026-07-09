import { requireSupabaseClient } from "@/supabase/client";
import { AnalyticsModulePerformance, AnalyticsDepartmentRisk, AnalyticsHeatmapData, AnalyticsTrendData, AnalyticsFacultyDepartmentSummary, AnalyticsLecturerPerformance } from "@/types/analytics.types";

// export type TrendDataPoint = {
//   trend_date: string;
//   sessions_attended: number;
// };

// export type DepartmentRiskPoint = {
//   trend_date: string;
//   attendance_rate: number;
// };

export const analyticsRepository = {
  async fetchStudentAttendanceTrends(studentId: string): Promise<AnalyticsTrendData[]> {
    const client = requireSupabaseClient();
    
    // Fetch from the view we created in Step 1
    const { data, error } = await client
      .from("attendance_trends")
      .select("*")
      .eq("student_id", studentId)
      .order("trend_date", { ascending: true });

    if (error) {
      console.error("Error fetching attendance trends:", error);
      return []; // Returning an empty array ensures "no fake slopes"
    }
    
    return data || [];
  },

  async fetchDepartmentRiskTrends(departmentId: string) {
    const client = requireSupabaseClient();
    
    // We will query a new view 'department_attendance_trends'
    const { data, error } = await client
      .from("department_attendance_trends")
      .select("*")
      .eq("department_id", departmentId)
      .order("trend_date", { ascending: true })
      .limit(6); // To match the .slice(-6) in your mock

    if (error) {
      console.error("Error fetching HOD trends:", error);
      return []; 
    }
    
    return data || [];
  },

  async fetchModulePerformance(departmentId: string) {
    const client = requireSupabaseClient();
    // This assumes you create a view 'module_performance' 
    // that calculates avg_attendance per module_id
    const { data } = await client
      .from("module_performance") 
      .select("module_name, avg_attendance, enrolled_count")
      .eq("department_id", departmentId);
    return data || [];
  },

  async fetchHeatmapData(departmentId: string) {
    const client = requireSupabaseClient();
    // This fetches attendance counts grouped by day of week and hour
    const { data } = await client
      .from("attendance_heatmap")
      .select("day_of_week, week_index, intensity")
      .eq("department_id", departmentId);
    return data || [];
  },
  async fetchDeanFacultyOverview(facultyId: string) : Promise<AnalyticsFacultyDepartmentSummary[]> {
        const client = requireSupabaseClient();

    const { data, error } = await client
      .from("faculty_department_summary") // The view we created
      .select("*")
      .eq("faculty_id", facultyId);

    if (error) throw error;
    return data || [];
  },

  async fetchDeanLecturerPerformance(): Promise<AnalyticsLecturerPerformance[]> {
        const client = requireSupabaseClient();

    const { data, error } = await client
      .from("faculty_lecturer_performance") // The view we created
      .select("*");

    if (error) throw error;
    return data || [];
  },


};