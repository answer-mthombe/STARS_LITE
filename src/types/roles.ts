/** Institutional roles — ordered highest authority first for display/sorting */
export const INSTITUTION_ROLES = ["admin", "dean", "hod", "lecturer", "student"] as const;

export type InstitutionRole = (typeof INSTITUTION_ROLES)[number];

/** Alias used across auth and guards */
export type UserRole = InstitutionRole;
