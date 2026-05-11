export interface AnalyticsModel {
  moduleAttendanceRate: number; // 0..1
  studentAttendanceRate: number; // 0..1
  totalSessions: number;
  absentees: number;
  trends: Array<{
    label: string;
    value: number;
  }>;
}

