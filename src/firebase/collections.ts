/**
 * Firestore collection IDs — keep aligned with `src/mockDB/*.json` roots and security rules.
 * Change only when the backend schema is agreed with the team.
 */
export const COLLECTIONS = {
  faculties: "faculties",
  departments: "departments",
  deans: "deans",
  hods: "hods",
  facultySecretaries: "facultySecretaries",
  courses: "courses",
  modules: "modules",
  lecturers: "lecturers",
  students: "students",
  tutors: "tutors",
  /** Dean/HOD/Admin proxy grants */
  proxyAssignments: "proxyAssignments",
  /** Lecturer → tutor / student registrar per module */
  moduleDelegations: "moduleDelegations",
  attendanceSessions: "attendanceSessions",
  attendanceRecords: "attendanceRecords",
  auditLogs: "auditLogs",
  classRegisters: "classRegisters",
  testSessions: "testSessions",
  testMarks: "testMarks",
  testRegisters: "testRegisters",
  tutorTimesheets: "tutorTimesheets",
  /** Custom profile + role document keyed by Firebase Auth UID */
  userProfiles: "userProfiles",
} as const;

export type CollectionKey = keyof typeof COLLECTIONS;
