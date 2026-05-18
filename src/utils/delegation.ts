import type { AuthUser } from "@/store/authStore";
import type { ModuleModel } from "@/models/Module";
import type { ModuleDelegationModel } from "@/models/ModuleDelegation";
import type { ProxyAssignmentModel } from "@/models/ProxyAssignment";
import {
  canStartModuleSession,
  canMarkAttendanceForClass,
  activeDelegationsForStudent,
  activeProxiesForPerson,
} from "@/permissions/delegationPermissions";
import type { AttendanceSessionModel } from "@/models/Attendance";
import type { InstitutionCapability } from "@/types/capabilities";
import { roleHasCapability } from "@/permissions/institutionPermissions";

export function authPersonId(user: AuthUser): string {
  return user.id;
}

export function resolveModuleHost(args: {
  user: AuthUser;
  module: ModuleModel;
  delegations: ModuleDelegationModel[];
}): { canHost: boolean; hostRole: "lecturer" | "tutor" | "student_registrar" | null } {
  const personId = authPersonId(args.user);
  if (args.user.role === "lecturer" && args.module.lecturerId === personId) {
    return { canHost: true, hostRole: "lecturer" };
  }
  const studentDelegations = activeDelegationsForStudent(args.delegations, personId, "attendance.start_session");
  const tutorDel = studentDelegations.find((d) => d.delegateType === "tutor");
  if (tutorDel) return { canHost: true, hostRole: "tutor" };
  const regDel = studentDelegations.find((d) => d.delegateType === "student_registrar");
  if (regDel) return { canHost: true, hostRole: "student_registrar" };
  if (
    canStartModuleSession({
      role: args.user.role,
      personId,
      module: args.module,
      delegations: args.delegations,
    })
  ) {
    const d = studentDelegations[0];
    return {
      canHost: true,
      hostRole: d?.delegateType === "student_registrar" ? "student_registrar" : "tutor",
    };
  }
  return { canHost: false, hostRole: null };
}

export function userCanStartSession(args: {
  user: AuthUser;
  module: ModuleModel;
  delegations: ModuleDelegationModel[];
}): boolean {
  return resolveModuleHost(args).canHost;
}

export function userCanMarkForClass(args: {
  user: AuthUser;
  session: AttendanceSessionModel;
  delegations: ModuleDelegationModel[];
}): boolean {
  const personId = authPersonId(args.user);
  if (args.user.role === "lecturer" && args.session.lecturerId === personId) return true;
  return canMarkAttendanceForClass({
    personId,
    session: args.session,
    delegations: args.delegations,
  });
}

export function mergedCapabilities(
  role: AuthUser["role"],
  proxyGrants: ProxyAssignmentModel[] = [],
  extra: InstitutionCapability[] = []
): InstitutionCapability[] {
  const fromProxy = proxyGrants.flatMap((p) => p.capabilities);
  const set = new Set<InstitutionCapability>();
  for (const c of extra) set.add(c);
  for (const c of fromProxy) set.add(c);
  return [...set].filter((c) => roleHasCapability(role, c, [...set]));
}

export function userHasProxyScope(
  proxies: ProxyAssignmentModel[],
  personId: string,
  scope: "faculty" | "department",
  scopeId: string
): boolean {
  return activeProxiesForPerson(proxies, personId).some((p) => p.scope === scope && p.scopeId === scopeId);
}
