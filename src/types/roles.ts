/** Institutional roles — ordered highest authority first for display/sorting */
export const INSTITUTION_ROLES = [
  "admin",
  "dean",
  "hod",
  "lecturer",
  "tutor",
  "student",
] as const;

export type InstitutionRole = (typeof INSTITUTION_ROLES)[number];

/** Alias used across auth and guards */
export type UserRole = InstitutionRole;

/** Leadership roles that may grant scoped proxy access */
export const PROXY_GRANTOR_ROLES = ["admin", "dean", "hod"] as const;
export type ProxyGrantorRole = (typeof PROXY_GRANTOR_ROLES)[number];

/** Roles that can manage module-level attendance delegation */
export const MODULE_DELEGATION_GRANTOR_ROLES = ["lecturer", "hod"] as const;
