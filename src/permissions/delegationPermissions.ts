import type { AttendanceCapability } from "@/types/capabilities";
import type { ModuleDelegationModel } from "@/models/ModuleDelegation";
import type { ProxyAssignmentModel } from "@/models/ProxyAssignment";
import type { InstitutionRole } from "@/types/roles";
import type { ModuleModel } from "@/models/Module";
import type { AttendanceSessionModel } from "@/models/Attendance";

function isDelegationActive(d: ModuleDelegationModel, opts?: { sessionId?: string; date?: string }): boolean {
  if (!d.active) return false;
  if (d.expiresAt && new Date(d.expiresAt).getTime() <= Date.now()) return false;
  if (d.effectiveDate && opts?.date && d.effectiveDate !== opts.date) return false;
  if (d.sessionId && opts?.sessionId && d.sessionId !== opts.sessionId) return false;
  return true;
}

function isProxyActive(p: ProxyAssignmentModel): boolean {
  if (!p.active) return false;
  if (p.expiresAt && new Date(p.expiresAt).getTime() <= Date.now()) return false;
  return true;
}

/** Can this person start a session on the module? */
export function canStartModuleSession(args: {
  role: InstitutionRole;
  personId: string;
  module: ModuleModel;
  delegations: ModuleDelegationModel[];
}): boolean {
  const { role, personId, module, delegations } = args;
  if (role === "lecturer" && (module.lecturerId === personId || module.coLecturerIds?.includes(personId))) {
    return true;
  }

console.log("===== Permission Check =====");
console.log("Module ID:", module.id);
console.log("Person ID:", personId);
console.log("Delegations:", delegations);

  const active = delegations.filter(
    (d) =>
      d.moduleId === module.id &&
      d.delegateStudentId === personId &&
      isDelegationActive(d) &&
      d.capabilities.includes("attendance.start_session")
  );

console.log("Matching delegations:", active);

  if (role === "tutor" || role === "student") {
    return active.some((d) => d.delegateType === "tutor" || d.delegateType === "student_registrar");
  }
  return false;
}

/** Can mark attendance on behalf of others (registrar / tutor running roll) */
export function canMarkAttendanceForClass({
  personId,
  session,
  delegations,
}: {
  personId: string;
  session: AttendanceSessionModel;
  delegations: ModuleDelegationModel[];
}): boolean {
  if (session.startedById === personId) return true;
  return delegations.some(
    (d) =>
      d.moduleId === session.moduleId &&
      d.delegateStudentId === personId &&
      isDelegationActive(d, { sessionId: session.id }) &&
      d.capabilities.includes("attendance.mark_for_class")
  );
}

export function activeDelegationsForStudent(
  delegations: ModuleDelegationModel[],
  studentId: string,
  capability?: AttendanceCapability
): ModuleDelegationModel[] {
  return delegations.filter(
    (d) =>
      d.delegateStudentId === studentId &&
      isDelegationActive(d) &&
      (!capability || d.capabilities.includes(capability))
  );
}

export function activeProxiesForPerson(
  proxies: ProxyAssignmentModel[],
  personId: string
): ProxyAssignmentModel[] {
  return proxies.filter((p) => p.granteePersonId === personId && isProxyActive(p));
}
