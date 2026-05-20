/**
 * Granular capabilities — composed into role defaults and module/proxy grants.
 * Supabase: store on `user_profiles`, `proxy_assignments`, `module_delegations`.
 */
export type AttendanceCapability =
  | "attendance.start_session"
  | "attendance.end_session"
  | "attendance.mark_self"
  | "attendance.mark_for_class"
  | "attendance.approve_requests"
  | "attendance.view_records";

export type AnalyticsCapability =
  | "analytics.university"
  | "analytics.faculty"
  | "analytics.department"
  | "analytics.course"
  | "analytics.module"
  | "analytics.self";

export type AdminCapability =
  | "users.manage"
  | "users.grant_privileges"
  | "users.revoke_privileges"
  | "audit.view"
  | "reports.generate_university"
  | "reports.generate_faculty"
  | "reports.generate_department"
  | "reports.generate_module"
  | "catalog.manage_structure"
  | "proxy.activate"
  | "proxy.deactivate";

export type FacultyCapability =
  | "faculty.view_analytics"
  | "faculty.view_departments"
  | "faculty.view_attendance"
  | "faculty.designate_proxy"
  | "faculty.reports";

export type DepartmentCapability =
  | "department.view_analytics"
  | "department.view_courses"
  | "department.quality_control"
  | "department.reports"
  | "department.designate_proxy";

export type LecturerCapability =
  | "lecturer.monitor_at_risk"
  | "lecturer.manage_module_students"
  | "lecturer.delegate_tutor"
  | "lecturer.delegate_registrar"
  | "lecturer.accept_requests";

export type StudentCapability = "student.check_in" | "student.view_own" | "student.request_join";

export type InstitutionCapability =
  | AttendanceCapability
  | AnalyticsCapability
  | AdminCapability
  | FacultyCapability
  | DepartmentCapability
  | LecturerCapability
  | StudentCapability;
