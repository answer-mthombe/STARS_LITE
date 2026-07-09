// src/types/analytics.types.ts

export interface AnalyticsModulePerformance {
  module_name: string;
  avg_attendance: number;
  enrolled_count: number;
}

export interface AnalyticsDepartmentRisk {
  trend_date: string;
  attendance_rate: number;
}

export interface AnalyticsHeatmapData {
  day_of_week: number;
 week_index: number;
  intensity: number;
}

export type AnalyticsTrendData= {
  trend_date: string;
  sessions_attended: number;
};

export interface AnalyticsFacultyDepartmentSummary {
  department_id: string;
  department_name: string;
  faculty_id: string;
  student_count: number;
  avg_attendance: number;
}

export interface AnalyticsLecturerPerformance {
  lecturer_id: string;
  lecturer_name: string;
  modules_taught: number;
  marks_recorded: number;
}


