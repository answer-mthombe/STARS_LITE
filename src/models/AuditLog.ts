import type { ISODateString } from "./common";
import type { InstitutionRole } from "@/types/roles";

export type AuditAction =
  | "user.privilege_granted"
  | "user.privilege_revoked"
  | "proxy.activated"
  | "proxy.deactivated"
  | "delegation.created"
  | "delegation.revoked"
  | "session.started"
  | "session.ended"
  | "attendance.marked"
  | "request.approved"
  | "request.rejected";

export interface AuditLogModel {
  id: string;
  action: AuditAction;
  actorRole: InstitutionRole;
  actorPersonId: string;
  /** Optional: module, faculty, department scope */
  scopeType?: "university" | "faculty" | "department" | "course" | "module" | null;
  scopeId?: string | null;
  targetPersonId?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: ISODateString;
}
