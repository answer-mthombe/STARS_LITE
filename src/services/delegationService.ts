import { mockDB } from "@/mockDB/mockDBService";
import { useMockDbVersionStore } from "@/store/mockDbVersionStore";
import type { ModuleDelegationModel, ModuleDelegateType } from "@/models/ModuleDelegation";
import type { ProxyAssignmentModel } from "@/models/ProxyAssignment";
import type { AttendanceCapability } from "@/types/capabilities";
import type { ProxyScope } from "@/models/ProxyAssignment";
import type { AuditLogModel } from "@/models/AuditLog";
import type { InstitutionRole } from "@/types/roles";

//new added imports 
import { requireSupabaseClient } from "@/supabase/client";
import { TABLES } from "@/supabase/tables";
import { fromRow } from "@/supabase/mappers/idBasedMapper";
import type { ModuleModel } from "@/models/Module";

function bump() {
  useMockDbVersionStore.getState().bump();
}

function audit(entry: Omit<AuditLogModel, "id" | "createdAt">) {
  mockDB.create("auditLogs", { ...entry, createdAt: new Date().toISOString() });
}

export const delegationService = {
  listModuleDelegations(moduleId?: string): ModuleDelegationModel[] {
    mockDB.touch();
    const all = mockDB.list("moduleDelegations");
    return moduleId ? all.filter((d) => d.moduleId === moduleId) : all;
  },

  listProxies(scope?: { scope: ProxyScope; scopeId: string }): ProxyAssignmentModel[] {
    mockDB.touch();
    const all = mockDB.list("proxyAssignments");
    if (!scope) return all;
    return all.filter((p) => p.scope === scope.scope && p.scopeId === scope.scopeId);
  },

  /** Lecturer grants tutor or class registrar on a module */
  grantModuleDelegation(args: {
    moduleId: string;
    grantedByLecturerId: string;
    delegateStudentId: string;
    delegateType: ModuleDelegateType;
    capabilities: AttendanceCapability[];
    effectiveDate?: string | null;
    sessionId?: string | null;
    expiresAt?: string | null;
  }): ModuleDelegationModel {
    mockDB.touch();
    const mod = mockDB.read("modules", args.moduleId);
    if (!mod || mod.lecturerId !== args.grantedByLecturerId) {
      throw new Error("Module not found or you are not the primary lecturer.");
    }
    if (!mod.enrolledStudents.includes(args.delegateStudentId)) {
      throw new Error("Delegate must be enrolled in the module.");
    }

    const existing = mockDB
      .query("moduleDelegations", {
        moduleId: args.moduleId,
        delegateStudentId: args.delegateStudentId,
        delegateType: args.delegateType,
      })
      .find((d) => d.active);

    if (existing) {
      return mockDB.update("moduleDelegations", existing.id, {
        capabilities: args.capabilities,
        effectiveDate: args.effectiveDate ?? null,
        sessionId: args.sessionId ?? null,
        expiresAt: args.expiresAt ?? null,
        active: true,
      });
    }

    const created = mockDB.create("moduleDelegations", {
      moduleId: args.moduleId,
      courseId: mod.courseId ?? null,
      grantedByLecturerId: args.grantedByLecturerId,
      delegateType: args.delegateType,
      delegateStudentId: args.delegateStudentId,
      capabilities: args.capabilities,
      active: true,
      effectiveDate: args.effectiveDate ?? null,
      sessionId: args.sessionId ?? null,
      expiresAt: args.expiresAt ?? null,
      createdAt: new Date().toISOString(),
    });

    if (args.delegateType === "tutor") {
      const tutorIds = [...new Set([...(mod.tutorIds ?? []), args.delegateStudentId])];
      mockDB.update("modules", args.moduleId, { tutorIds });
      const tutor = mockDB.query("tutors", { studentId: args.delegateStudentId })[0];
      const stu = mockDB.read("students", args.delegateStudentId);
      if (stu && !tutor) {
        mockDB.create("tutors", {
          studentId: stu.id,
          fullName: stu.fullName,
          email: stu.email,
          facultyId: stu.facultyId,
          departmentId: stu.departmentId ?? null,
          yearLevel: stu.yearLevel ?? 3,
          moduleIds: [args.moduleId],
          totalLoggedHours: 0,
          createdAt: new Date().toISOString(),
        });
      } else if (tutor) {
        mockDB.update("tutors", tutor.id, {
          moduleIds: [...new Set([...tutor.moduleIds, args.moduleId])],
        });
      }
    }

    audit({
      action: "delegation.created",
      actorRole: "lecturer",
      actorPersonId: args.grantedByLecturerId,
      scopeType: "module",
      scopeId: args.moduleId,
      targetPersonId: args.delegateStudentId,
      metadata: { delegateType: args.delegateType, capabilities: args.capabilities },
    });

    bump();
    return created;
  },

  revokeModuleDelegation(delegationId: string, revokedByLecturerId: string): void {
    mockDB.touch();
    const d = mockDB.read("moduleDelegations", delegationId);
    if (!d || d.grantedByLecturerId !== revokedByLecturerId) throw new Error("Delegation not found.");
    mockDB.update("moduleDelegations", delegationId, { active: false });
    const mod = mockDB.read("modules", d.moduleId);
    if (mod?.tutorIds?.includes(d.delegateStudentId)) {
      mockDB.update("modules", d.moduleId, {
        tutorIds: mod.tutorIds.filter((id) => id !== d.delegateStudentId),
      });
    }
    audit({
      action: "delegation.revoked",
      actorRole: "lecturer",
      actorPersonId: revokedByLecturerId,
      scopeType: "module",
      scopeId: d.moduleId,
      targetPersonId: d.delegateStudentId,
    });
    bump();
  },

  /** Dean / HOD designates acting proxy */
  grantProxy(args: Omit<ProxyAssignmentModel, "id" | "createdAt" | "active">): ProxyAssignmentModel {
    mockDB.touch();
    const created = mockDB.create("proxyAssignments", { ...args, active: true, createdAt: new Date().toISOString() });
    audit({
      action: "proxy.activated",
      actorRole: args.grantorRole as InstitutionRole,
      actorPersonId: args.grantorPersonId,
      scopeType: args.scope === "faculty" ? "faculty" : args.scope === "department" ? "department" : "university",
      scopeId: args.scopeId,
      targetPersonId: args.granteePersonId,
    });
    bump();
    return created;
  },

  deactivateProxy(proxyId: string, byPersonId: string): void {
    mockDB.touch();
    const p = mockDB.read("proxyAssignments", proxyId);
    if (!p) throw new Error("Proxy not found.");
    mockDB.update("proxyAssignments", proxyId, { active: false });
    audit({
      action: "proxy.deactivated",
      actorRole: p.grantorRole,
      actorPersonId: byPersonId,
      scopeType: p.scope === "faculty" ? "faculty" : "department",
      scopeId: p.scopeId,
      targetPersonId: p.granteePersonId,
    });
    bump();
  },
};
export async function listModulesForTutor(
  studentId: string
): Promise<ModuleModel[]> {

  const client = requireSupabaseClient();

  const { data: modules, error } = await client
    .from(TABLES.moduleDelegations)
    .select(`
      modules (*)
    `)
    .eq("delegate_student_id", studentId)
    .eq("active", true);

  if (error) throw error;

  return (modules ?? [])
    .map((row: any) => fromRow(row.modules) as ModuleModel);
}


