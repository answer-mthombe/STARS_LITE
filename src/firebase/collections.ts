/**
 * Firestore collection IDs — keep aligned with `src/mockDB/*.json` roots and security rules.
 * Change only when the backend schema is agreed with the team.
 */
export const COLLECTIONS = {
  faculties: "faculties",
  departments: "departments",
  deans: "deans",
  hods: "hods",
  courses: "courses",
  modules: "modules",
  lecturers: "lecturers",
  students: "students",
  attendanceSessions: "attendanceSessions",
  attendanceRecords: "attendanceRecords",
  /** Optional: custom profile + role document keyed by Firebase Auth UID */
  userProfiles: "userProfiles",
} as const;

export type CollectionKey = keyof typeof COLLECTIONS;
