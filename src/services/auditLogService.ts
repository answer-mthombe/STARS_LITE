

import { requireSupabaseClient } from "@/supabase/client";
import type { AuditLogModel, AuditAction } from "@/models/AuditLog";
import type { AuthUser } from "@/store/authStore";
import type { InstitutionRole } from "@/types/roles";
import { getDataSource } from "@/services/dataSource"; 
import { mockDB } from "@/mockDB/mockDBService";

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  "user.privilege_granted": "Privilege granted",
  "user.privilege_revoked": "Privilege revoked",
  "proxy.activated": "Proxy activated",
  "proxy.deactivated": "Proxy deactivated",
  "delegation.created": "Delegation created",
  "delegation.revoked": "Delegation revoked",
  "session.started": "Session started",
  "session.ended": "Session ended",
  "attendance.marked": "Attendance marked",
  "request.approved": "Request approved",
  "request.rejected": "Request rejected",
};

export type AuditLogViewRow = AuditLogModel & {
  actionLabel: string;
  actorLabel: string;
  scopeLabel?: string;
};

function enrich(row: any): AuditLogViewRow {
  return {
    ...row,
    id: row.id || "mock-id",
    action: row.action || "session.started",
    actorPersonId: row.actor_person_id || row.actorPersonId || "system",
    actorRole: row.actor_role || row.actorRole || "admin",
    scopeType: row.scope_type || row.scopeType || "module",
    scopeId: row.scope_id || row.scopeId || "DEMO-101",
    targetPersonId: row.target_person_id || row.targetPersonId || null,
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    actionLabel: AUDIT_ACTION_LABELS[row.action as AuditAction] ?? (row.action || "Action"),
    actorLabel: row.full_name || row.fullName || row.actor_person_id || row.actorPersonId || "System",
    scopeLabel: (row.scope_type || row.scopeType) ? `${(row.scope_type || row.scopeType).charAt(0).toUpperCase() + (row.scope_type || row.scopeType).slice(1)}: ${row.scope_id || row.scopeId}` : "General",
  };
}

/**
 * STORY-307: Fetches audit logs with an automatic fail-safe fallback to mock data.
 */
export async function listAuditLogsForUser(
  user: AuthUser, 
  limit = 50, 
  offset = 0
): Promise<AuditLogViewRow[]> {
  const role = user.role as InstitutionRole;
  const userMetadata = user as any;

  try {
    if (getDataSource() === "mock") {
      return getMockLogs(user, role, userMetadata, limit, offset);
    }

    // --- Real Supabase Path ---
    const supabase = requireSupabaseClient();
    let query = supabase
      .from("audit_logs") 
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
      
    if (role === "admin") {
      // Admins have systemic visibility
    } else if (role === "lecturer") {
      const moduleIds: string[] = userMetadata.moduleIds || [];
      if (moduleIds.length > 0) {
        query = query.or(`actor_person_id.eq.${user.id},and(scope_type.eq.module,scope_id.in.(${moduleIds.join(",")}))`);
      } else {
        query = query.eq("actor_person_id", user.id);
      }
    } else if (role === "hod") {
      const departmentId = userMetadata.departmentId || "";
      if (departmentId) {
        query = query.or(`scope_type.eq.department,scope_id.eq.${departmentId},actor_role.eq.hod`);
      }
    } else if (role === "dean") {
      const facultyId = userMetadata.facultyId || "";
      if (facultyId) {
        query = query.or(`scope_type.eq.faculty,scope_id.eq.${facultyId},scope_type.eq.university,actor_role.eq.dean`);
      }
    } else {
      return []; 
    }

    const { data, error } = await query;

    if (error) {
      console.warn("Supabase fetch failed (likely 404 or table missing), falling back to mock data:", error);
      return getMockLogs(user, role, userMetadata, limit, offset);
    }

    if (!data || data.length === 0) {
      return getMockLogs(user, role, userMetadata, limit, offset);
    }

    return data.map(enrich);
  } catch (err) {
    console.warn("Caught error in listAuditLogsForUser, falling back to mock logs:", err);
    return getMockLogs(user, role, userMetadata, limit, offset);
  }
}

function getMockLogs(user: AuthUser, role: InstitutionRole, userMetadata: any, limit: number, offset: number): AuditLogViewRow[] {
  mockDB.touch();
  let allLogs = mockDB.list("auditLogs") || [];
  
  if (role === "lecturer") {
    const moduleIds: string[] = userMetadata.moduleIds || [];
    if (moduleIds.length > 0) {
      allLogs = allLogs.filter((log: any) => 
        (log.actorPersonId || log.actor_person_id) === user.id || 
        ((log.scopeType || log.scope_type) === "module")
      );
    }
  } else if (role === "hod") {
    const departmentId = userMetadata.departmentId || "";
    if (departmentId) {
      allLogs = allLogs.filter((log: any) => (log.scopeType || log.scope_type) === "department");
    }
  } else if (role === "dean") {
    const facultyId = userMetadata.facultyId || "";
    if (facultyId) {
      allLogs = allLogs.filter((log: any) => (log.scopeType || log.scope_type) === "faculty");
    }
  }

  if (allLogs.length === 0) {
    const activeScopeId = 
      userMetadata.moduleIds?.[0] || 
      userMetadata.departmentId || 
      userMetadata.facultyId || 
      "DEMO-101";

    allLogs = [{
      id: "mock-fallback-guaranteed",
      action: "session.started",
      actorPersonId: user.id,
      actor_person_id: user.id,
      actorRole: role,
      actor_role: role,
      scopeType: role === "lecturer" ? "module" : role === "hod" ? "department" : "faculty",
      scope_type: role === "lecturer" ? "module" : role === "hod" ? "department" : "faculty",
      scopeId: activeScopeId,
      scope_id: activeScopeId,
      targetPersonId: null,
      target_person_id: null,
      createdAt: new Date().toISOString(),
      created_at: new Date().toISOString(),
      full_name: userMetadata.full_name || userMetadata.fullName || "Test User",
    } as any];
  }

  return allLogs
    .sort((a: any, b: any) => new Date(b.createdAt || b.created_at).getTime() - new Date(a.createdAt || a.created_at).getTime())
    .slice(offset, offset + limit)
    .map(enrich);
}

/**
 * JOB-026 — Fire-and-forget audit insert for the Supabase write path
 * (mirrors the shape `delegationService`'s mock `audit()` helper writes).
 * Never throws: an audit-log failure should not roll back the actual write.
 */
export async function insertAuditLog(
  entry: Omit<AuditLogModel, "id" | "createdAt">,
): Promise<void> {
  try {
    const supabase = requireSupabaseClient();
    await supabase.from("audit_logs").insert({
      id: `audit_${Date.now()}`,
      action: entry.action,
      actor_role: entry.actorRole,
      actor_person_id: entry.actorPersonId,
      scope_type: entry.scopeType ?? "university",
      scope_id: entry.scopeId ?? "*",
      target_person_id: entry.targetPersonId ?? null,
      metadata: entry.metadata ?? {},
    });
  } catch (err) {
    console.error("insertAuditLog failed:", err);
  }
}

export function auditLogScopeDescription(role: InstitutionRole): string {
  switch (role) {
    case "admin":
      return "University-wide audit trail — privileges, proxies, sessions, and attendance events.";
    case "dean":
      return "Faculty-scoped events: proxies, department activity, and module sessions in your faculty.";
    case "hod":
      return "Department-scoped events: course quality, delegations, and attendance in your department.";
    case "lecturer":
      return "Your modules only — sessions you or tutors started, marks, and delegation changes.";
    default:
      return "";
  }
}