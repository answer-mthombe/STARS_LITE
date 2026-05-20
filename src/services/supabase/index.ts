/**
 * Live Supabase repositories (Postgres + Auth).
 * Screens still use mock services until you wire a feature flag or replace calls — see SUPABASE_INTEGRATION.md.
 */
export * from "./authRepository";
export * from "./studentRepository";
export * from "./lecturerRepository";
export * from "./moduleRepository";
export * from "./courseRepository";
export * from "./facultyRepository";
export * from "./attendanceSessionRepository";
export * from "./attendanceRecordRepository";
export * from "./userProfileRepository";
