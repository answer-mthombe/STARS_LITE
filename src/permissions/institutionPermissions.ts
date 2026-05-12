import type { InstitutionRole } from "@/types/roles";

/**
 * Declarative capability matrix — navigation & analytics follow these scopes.
 * Implementation: route guards (`useRoleGuard`) + `institutionAnalytics` filters.
 */
export type AnalyticsScope = "university" | "faculty" | "department" | "module_assignment" | "self";

export type InstitutionPermission =
  | "nav.admin.university"
  | "nav.dean.faculty"
  | "nav.hod.department"
  | "nav.lecturer.modules"
  | "nav.student.self"
  | "analytics.university"
  | "analytics.faculty"
  | "analytics.department"
  | "analytics.modules_assigned"
  | "analytics.self"
  | "users.manage_university"
  | "users.manage_faculty"
  | "users.manage_department"
  | "catalog.manage_structure";

export const ROLE_PERMISSIONS: Record<InstitutionRole, InstitutionPermission[]> = {
  admin: [
    "nav.admin.university",
    "analytics.university",
    "users.manage_university",
    "catalog.manage_structure",
  ],
  dean: ["nav.dean.faculty", "analytics.faculty", "users.manage_faculty"],
  hod: ["nav.hod.department", "analytics.department", "users.manage_department"],
  lecturer: ["nav.lecturer.modules", "analytics.modules_assigned"],
  student: ["nav.student.self", "analytics.self"],
};

export const ROLE_ANALYTICS_SCOPE: Record<InstitutionRole, AnalyticsScope> = {
  admin: "university",
  dean: "faculty",
  hod: "department",
  lecturer: "module_assignment",
  student: "self",
};

export function roleHasPermission(role: InstitutionRole, permission: InstitutionPermission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
