import { requireSupabaseClient } from "@/supabase/client";
import type { AuditLogModel, AuditAction } from "@/models/AuditLog";
import type { AuthUser } from "@/store/authStore";
import type { InstitutionRole } from "@/types/roles";
import {getDataSource} from "@/services/dataSource"; 
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
    id: row.id,
    action: row.action,
    actorPersonId: row.actor_person_id,
    actorRole: row.actor_role,
    scopeType: row.scope_type,
    scopeId: row.scope_id,
    targetPersonId: row.target_person_id,
    createdAt: row.created_at,
    actionLabel: AUDIT_ACTION_LABELS[row.action as AuditAction] ?? row.action,
    actorLabel: row.full_name || row.actor_person_id || "System",
   // scopeLabel: row.scope_display_name || undefined,
   scopeLabel: row.scope_type ? `${row.scope_type.charAt(0).toUpperCase() + row.scope_type.slice(1)}: ${row.scope_id}` : "General",
  };
}

/**
 * STORY-307: Fetches a real scoped list of audit logs from Supabase.
 */
/**
 * STORY-307: Fetches a real scoped list of audit logs from Supabase.
 * * @param user - The authenticated active user session containing role metadata context.
 * @param limit - The maximum number of log rows to return per page slice. Defaults to 50 rows.
 * @param offset - The starting index offset utilized for cursor-less pagination ranges. Defaults to 0.
 * @returns A processed array of enriched audit log viewport rows.
 */
// export async function listAuditLogsForUser(
//   user: AuthUser, 
//   limit = 50, 
//   offset = 0
// ): Promise<AuditLogViewRow[]> {
//   const role = user.role as InstitutionRole;
  
//   // Cast to any safely to access custom application metadata properties without breaking compilation
//   const userMetadata = user as any;

//   const supabase = requireSupabaseClient();
//   let query = supabase
//     .from("audit_logs")
//     .select(`
//       *,
//       profiles:actor_person_id (full_name)
//     `)
//     .order("created_at", { ascending: false })
//     .range(offset, offset + limit - 1);

//   if (role === "admin") {
//     // Admins have systemic visibility
//   } else if (role === "lecturer") {
//     const moduleIds: string[] = userMetadata.moduleIds || [];
//     query = query.or(`actor_person_id.eq.${user.id},and(scope_type.eq.module,scope_id.in.(${moduleIds.join(",") || ""}))`);
//   } else if (role === "hod") {
//     const departmentId = userMetadata.departmentId || "";
//     query = query.or(`scope_type.eq.department,scope_id.eq.${departmentId},actor_role.eq.hod`);
//   } else if (role === "dean") {
//     const facultyId = userMetadata.facultyId || "";
//     query = query.or(`scope_type.eq.faculty,scope_id.eq.${facultyId},scope_type.eq.university,actor_role.eq.dean`);
//   } else {
//     return []; 
//   }

//   const { data, error } = await query;

//   if (error) {
//     console.error("Error fetching scoped audit logs:", error);
//     throw error;
//   }

//   return (data || []).map(enrich);
// }

export async function listAuditLogsForUser(
  user: AuthUser, 
  limit = 50, 
  offset = 0
): Promise<AuditLogViewRow[]> {
  const role = user.role as InstitutionRole;
  const userMetadata = user as any;

  // --- Mock Fallback ---
  if (getDataSource() === "mock") {
    mockDB.touch();
    let allLogs = mockDB.list("auditLogs") || [];
    
    // Basic mock filtering reflecting RLS rules
    if (role === "lecturer") {
      const moduleIds: string[] = userMetadata.moduleIds || [];
      allLogs = allLogs.filter(log => log.actorPersonId === user.id || (log.scopeType === "module" && moduleIds.includes(log.scopeId ?? "")));
    } else if (role === "hod") {
      const departmentId = userMetadata.departmentId || "";
      allLogs = allLogs.filter(log => log.scopeType === "department" && log.scopeId === departmentId);
    } else if (role === "dean") {
      const facultyId = userMetadata.facultyId || "";
      allLogs = allLogs.filter(log => log.scopeType === "faculty" && log.scopeId === facultyId);
    }
    
    // Admins see all logs
    return allLogs
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(offset, offset + limit)
      .map(enrich);
  }

  // --- Real Supabase Path ---
  const supabase = requireSupabaseClient();
  let query = supabase
    .from("audit_logs_view") 
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
    
  if (role === "admin") {
    // Admins have systemic visibility
  } else if (role === "lecturer") {
    const moduleIds: string[] = userMetadata.moduleIds || [];
    query = query.or(`actor_person_id.eq.${user.id},and(scope_type.eq.module,scope_id.in.(${moduleIds.join(",") || ""}))`);
  } else if (role === "hod") {
    const departmentId = userMetadata.departmentId || "";
    query = query.or(`scope_type.eq.department,scope_id.eq.${departmentId},actor_role.eq.hod`);
  } else if (role === "dean") {
    const facultyId = userMetadata.facultyId || "";
    query = query.or(`scope_type.eq.faculty,scope_id.eq.${facultyId},scope_type.eq.university,actor_role.eq.dean`);
  } else {
    return []; 
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching scoped audit logs:", error);
    throw error;
  }

  return (data || []).map(enrich);
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