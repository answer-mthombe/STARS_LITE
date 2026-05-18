import type { WithTimestamps } from "./common";
import type { InstitutionCapability } from "@/types/capabilities";
import type { ProxyGrantorRole } from "@/types/roles";

/** Scope for acting on behalf of a leadership role */
export type ProxyScope = "university" | "faculty" | "department";

/**
 * Dean / HOD / Admin grants another user temporary authority.
 * e.g. Acting Dean when dean is unavailable; HOD secretary proxy.
 */
export interface ProxyAssignmentModel extends WithTimestamps {
  id: string;
  /** Who approved this grant (dean id, hod id, or admin uid) */
  grantorRole: ProxyGrantorRole;
  grantorPersonId: string;
  /** User receiving proxy — links to `userProfiles` / person doc */
  granteePersonId: string;
  granteeEmail: string;
  scope: ProxyScope;
  /** `fac_eng`, `dep_it`, or `*` for university-wide admin proxy */
  scopeId: string;
  capabilities: InstitutionCapability[];
  active: boolean;
  /** Optional expiry — auto-deactivate after date */
  expiresAt?: string | null;
  notes?: string | null;
}
