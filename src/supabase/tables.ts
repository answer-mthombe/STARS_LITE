/**
 * Postgres table names — keep aligned with `src/mockDB/*.json` roots and RLS policies.
 * Change only when the backend schema is agreed with the team.
 */
export const TABLES = {
  faculties: "faculties",
  departments: "departments",
  deans: "deans",
  hods: "hods",
  facultySecretaries: "faculty_secretaries",
  courses: "courses",
  modules: "modules",
  lecturers: "lecturers",
  students: "students",
  tutors: "tutors",
  /** Dean/HOD/Admin proxy grants */
  proxyAssignments: "proxy_assignments",
  /** Lecturer → tutor / student registrar per module */
  moduleDelegations: "module_delegations",
  attendanceSessions: "attendance_sessions",
  attendanceRecords: "attendance_records",
  attendanceEvents: "attendance_events",
  auditLogs: "audit_logs",
  classRegisters: "class_registers",
  testSessions: "test_sessions",
  testMarks: "test_marks",
  testRegisters: "test_registers",
  tutorTimesheets: "tutor_timesheets",
  /** Profile + role row keyed by Supabase Auth user id */
  userProfiles: "user_profiles",
} as const;

export type TableKey = keyof typeof TABLES;

/** Resolve logical collection key or raw table name to Postgres table id. */
export function resolveTableName(key: string): string {
  return (TABLES as Record<string, string>)[key] ?? key;
}
