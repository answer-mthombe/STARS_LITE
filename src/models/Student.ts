import type { WithTimestamps } from "./common";

export interface StudentAttendanceStats {
  totalSessions: number;
  attended: number;
  absent: number;
  attendanceRate: number; // 0..1
}

export interface StudentModel extends WithTimestamps {
  id: string;
  fullName: string;
  studentNumber: string;
  gender: "male" | "female" | "other";
  email: string;
  facultyId: string;
  /** Department derived from course — stored for scoped analytics */
  departmentId?: string;
  courseId: string;
  registeredModules: string[];
  attendanceStats: StudentAttendanceStats;
  profileImage?: string | null;
  deviceId?: string | null;
}

