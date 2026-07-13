import { mockDB } from "@/mockDB/mockDBService";
import { getDataSource } from "@/services/dataSource";

import type { ModuleModel } from "@/models/Module";
import type { StudentModel } from "@/models/Student";

import { getStudentById } from "@/services/supabase/studentRepository";
import { listModulesForStudent } from "@/services/supabase/moduleRepository";
// Import JOB-014 repository endpoint
import { listForStudent } from "@/services/supabase/attendanceRecordRepository";

export interface StudentDashboardData {
  student: StudentModel | null;
  modules: ModuleModel[];
}

export async function getStudentDashboard(
  studentId: string,
): Promise<StudentDashboardData> {
  if (getDataSource() === "mock") {
    mockDB.touch();

    const student = mockDB.read("students", studentId);

    const modules: ModuleModel[] = (student?.registeredModules ?? [])
      .map((id) => mockDB.read("modules", id))
      .filter((m): m is ModuleModel => m != null);

    return {
      student,
      modules,
    };
  }

  // --- SUPABASE LIVE PATH ---
  // Run all three queries concurrently to keep the dashboard lightning fast
  const [dbStudent, modules, attendanceRecords] = await Promise.all([
    getStudentById(studentId),
    listModulesForStudent(studentId), // JOB-012
    listForStudent(studentId),        // JOB-014
  ]);

  if (!dbStudent) {
    return {
      student: null,
      modules: [],
    };
  }

  // JOB-014 Aggregate Calculation: Calculate real live metrics for the dashboard card
  const totalSessions = attendanceRecords.length;
  const attended = attendanceRecords.filter(
    (record) => record.status === "present" || record.status === "late"
  ).length;
  const attendanceRate = totalSessions > 0 ? attended / totalSessions : 0;

  // Build the live student model matching your application domain structure
  const studentWithLiveStats: StudentModel = {
    ...dbStudent,
    attendanceStats: {
      totalSessions,
      attended,
      absent: Math.max(0, totalSessions - attended),
      attendanceRate,
    },
  };   

  return {
    student: studentWithLiveStats,
    modules,
  };
}