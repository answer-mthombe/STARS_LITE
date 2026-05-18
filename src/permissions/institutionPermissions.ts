import type { InstitutionRole } from "@/types/roles";
import type { InstitutionCapability } from "@/types/capabilities";

/**
 * Declarative capability matrix — navigation, analytics, and governance.
 * Implementation: route guards, `institutionAnalytics`, Firestore rules.
 */
export type AnalyticsScope =
  | "university"
  | "faculty"
  | "department"
  | "course"
  | "module_assignment"
  | "delegated_module"
  | "self";

export const ROLE_ANALYTICS_SCOPE: Record<InstitutionRole, AnalyticsScope> = {
  admin: "university",
  dean: "faculty",
  hod: "department",
  lecturer: "module_assignment",
  tutor: "delegated_module",
  student: "self",
};

/** Base capabilities per institutional role (before proxy/delegation grants) */
export const ROLE_BASE_CAPABILITIES: Record<InstitutionRole, InstitutionCapability[]> = {
  admin: [
    "users.manage",
    "users.grant_privileges",
    "users.revoke_privileges",
    "audit.view",
    "analytics.university",
    "reports.generate_university",
    "catalog.manage_structure",
    "proxy.activate",
    "proxy.deactivate",
  ],
  dean: [
    "faculty.view_analytics",
    "faculty.view_departments",
    "faculty.view_attendance",
    "faculty.designate_proxy",
    "faculty.reports",
    "analytics.faculty",
    "reports.generate_faculty",
    "proxy.activate",
    "proxy.deactivate",
  ],
  hod: [
    "department.view_analytics",
    "department.view_courses",
    "department.quality_control",
    "department.reports",
    "department.designate_proxy",
    "analytics.department",
    "reports.generate_department",
    "proxy.activate",
    "proxy.deactivate",
  ],
  lecturer: [
    "lecturer.monitor_at_risk",
    "lecturer.manage_module_students",
    "lecturer.delegate_tutor",
    "lecturer.delegate_registrar",
    "lecturer.accept_requests",
    "analytics.module",
    "reports.generate_module",
    "attendance.start_session",
    "attendance.end_session",
    "attendance.approve_requests",
    "attendance.view_records",
  ],
  tutor: [
    "attendance.start_session",
    "attendance.end_session",
    "attendance.mark_for_class",
    "attendance.approve_requests",
    "attendance.view_records",
    "analytics.module",
    "student.check_in",
    "student.view_own",
  ],
  student: ["student.check_in", "student.view_own", "student.request_join", "attendance.mark_self", "analytics.self"],
};

export function roleHasCapability(
  role: InstitutionRole,
  capability: InstitutionCapability,
  extras: InstitutionCapability[] = []
): boolean {
  const base = ROLE_BASE_CAPABILITIES[role] ?? [];
  return base.includes(capability) || extras.includes(capability);
}

/** @deprecated Use roleHasCapability — kept for existing imports */
export type InstitutionPermission = InstitutionCapability;

export const ROLE_PERMISSIONS = ROLE_BASE_CAPABILITIES;

export function roleHasPermission(
  role: InstitutionRole,
  permission: InstitutionCapability,
  extras: InstitutionCapability[] = []
): boolean {
  return roleHasCapability(role, permission, extras);
}
