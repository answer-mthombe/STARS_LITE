import type { AuditLogModel, AuditAction } from "@/models/AuditLog";
import type { AuthUser } from "@/store/authStore";
import type { InstitutionRole } from "@/types/roles";
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

function personLabel(personId: string): string {
  const student = mockDB.read("students", personId);
  if (student) return `${student.fullName} (student)`;
  const lecturer = mockDB.read("lecturers", personId);
  if (lecturer) return lecturer.fullName;
  const tutor = mockDB.list("tutors").find((t) => t.id === personId || t.studentId === personId);
  if (tutor) {
    const stu = mockDB.read("students", tutor.studentId);
    return stu ? `${stu.fullName} (tutor)` : personId;
  }
  return personId;
}

function moduleLabel(moduleId: string | null | undefined): string | undefined {
  if (!moduleId) return undefined;
  const mod = mockDB.read("modules", moduleId);
  return mod ? `${mod.moduleCode} · ${mod.moduleName}` : moduleId;
}

export type AuditLogViewRow = AuditLogModel & {
  actionLabel: string;
  actorLabel: string;
  scopeLabel?: string;
};

function enrich(row: AuditLogModel): AuditLogViewRow {
  return {
    ...row,
    actionLabel: AUDIT_ACTION_LABELS[row.action] ?? row.action,
    actorLabel: personLabel(row.actorPersonId),
    scopeLabel:
      row.scopeType === "module"
        ? moduleLabel(row.scopeId ?? undefined)
        : row.scopeType
          ? `${row.scopeType}${row.scopeId ? ` · ${row.scopeId}` : ""}`
          : undefined,
  };
}

function lecturerModuleIds(lecturerId: string): Set<string> {
  return new Set(mockDB.list("modules").filter((m) => m.lecturerId === lecturerId).map((m) => m.id));
}

function departmentModuleIds(departmentId: string): Set<string> {
  const courseIds = new Set(
    mockDB
      .list("courses")
      .filter((c) => c.departmentId != null && c.departmentId === departmentId)
      .map((c) => c.id)
  );
  return new Set(mockDB.list("modules").filter((m) => m.courseId != null && courseIds.has(m.courseId)).map((m) => m.id));
}

function facultyModuleIds(facultyId: string): Set<string> {
  const deptIds = new Set(mockDB.list("departments").filter((d) => d.facultyId === facultyId).map((d) => d.id));
  const courseIds = new Set(
    mockDB
      .list("courses")
      .filter((c) => c.departmentId != null && deptIds.has(c.departmentId))
      .map((c) => c.id)
  );
  return new Set(mockDB.list("modules").filter((m) => m.courseId != null && courseIds.has(m.courseId)).map((m) => m.id));
}

export function listAuditLogsForUser(user: AuthUser, limit = 50): AuditLogViewRow[] {
  mockDB.touch();
  const rows = mockDB
    .list("auditLogs")
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const filtered = filterByRole(rows, user);
  return filtered.slice(0, limit).map(enrich);
}

function filterByRole(rows: AuditLogModel[], user: AuthUser): AuditLogModel[] {
  const role = user.role as InstitutionRole;

  if (role === "admin") return rows;

  if (role === "lecturer") {
    const mods = lecturerModuleIds(user.id);
    return rows.filter(
      (r) =>
        r.actorPersonId === user.id ||
        (r.scopeType === "module" && r.scopeId != null && mods.has(r.scopeId))
    );
  }

  if (role === "dean" && user.role === "dean") {
    const mods = facultyModuleIds(user.facultyId);
    return rows.filter(
      (r) =>
        r.scopeType === "faculty"
          ? r.scopeId === user.facultyId
          : r.scopeType === "module" && r.scopeId != null
            ? mods.has(r.scopeId)
            : r.scopeType === "university" || r.actorRole === "dean"
    );
  }

  if (role === "hod" && user.role === "hod") {
    const mods = departmentModuleIds(user.departmentId);
    return rows.filter(
      (r) =>
        r.scopeType === "department"
          ? r.scopeId === user.departmentId
          : r.scopeType === "module" && r.scopeId != null
            ? mods.has(r.scopeId)
            : r.actorRole === "hod"
    );
  }

  return [];
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
