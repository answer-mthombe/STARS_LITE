import { mockDB } from "@/mockDB/mockDBService";
import { useMockDbVersionStore } from "@/store/mockDbVersionStore";
import type { ModuleDelegationModel, ModuleDelegateType } from "@/models/ModuleDelegation";
import type { ProxyAssignmentModel } from "@/models/ProxyAssignment";
import type { AttendanceCapability } from "@/types/capabilities";
import type { ProxyScope } from "@/models/ProxyAssignment";
import type { AuditLogModel } from "@/models/AuditLog";
import type { InstitutionRole } from "@/types/roles";
import { requireSupabaseClient,isSupabaseEnabled } from "@/supabase/client";
import { TABLES } from "@/supabase";
import { getDataSource } from "./dataSource";

//new added imports 
import { fromRow } from "@/supabase/mappers/idBasedMapper";
import type { ModuleModel } from "@/models/Module";

function bump() {
  useMockDbVersionStore.getState().bump();
}

function audit(entry: Omit<AuditLogModel, "id" | "createdAt">) {
  mockDB.create("auditLogs", { ...entry, createdAt: new Date().toISOString() });
}

export const delegationService = {
  
  
  // listModuleDelegations(moduleId?: string): ModuleDelegationModel[] {
  //   mockDB.touch();
  //   const all = mockDB.list("moduleDelegations");
  //   return moduleId ? all.filter((d) => d.moduleId === moduleId) : all;
  // },

  async listModuleDelegations(moduleId?: string): Promise<ModuleDelegationModel[]> {
    if (isSupabaseEnabled()) {
      const supabase = requireSupabaseClient();
      let query = supabase.from(TABLES.moduleDelegations).select("*");
      if (moduleId) query = query.eq("module_id", moduleId);
      
      const { data, error } = await query;
      if (error) throw error;
      // Map your data from snake_case to camelCase here if needed
      return data as ModuleDelegationModel[];
    }

    // Existing Mock Path
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
async grantModuleDelegation(args: {
    moduleId: string;
    grantedByLecturerId: string;
    delegateStudentId: string;
    delegateType: ModuleDelegateType;
    capabilities: AttendanceCapability[];
    effectiveDate?: string | null;
    sessionId?: string | null;
    expiresAt?: string | null;
  }): Promise<ModuleDelegationModel> {
    
    // 1. DYNAMIC SOURCE SWITCH: Fetch module
    let mod: any;
    if (getDataSource() === "supabase") {
      const supabase = requireSupabaseClient();
      const { data, error } = await supabase
        .from(TABLES.modules)
        .select("*")
        .eq("id", args.moduleId)
        .single();
      
      if (error || !data) throw new Error("Module not found in Supabase.");
      mod = data;
    } else {
      mockDB.touch();
      mod = mockDB.read("modules", args.moduleId);
    }

    // 2. AUTHORIZATION & VALIDATION
    // Map snake_case to camelCase for the validation logic
    const lecturerId = mod.lecturer_id ?? mod.lecturerId;
    const enrolledStudents = mod.enrolled_students ?? mod.enrolledStudents ?? [];

    if (!mod || lecturerId !== args.grantedByLecturerId) {
      throw new Error("Module not found or you are not the primary lecturer.");
    }
    if (!enrolledStudents.includes(args.delegateStudentId)) {
      throw new Error("Delegate must be enrolled in the module.");
    }

    // 3. EXECUTE BASED ON SOURCE
    if (getDataSource() === "supabase") {
      const supabase = requireSupabaseClient();
      
      // Generate ID for delegation since it's TEXT, not auto-generated
      const delegationId = `del_${Date.now()}`; 

      const { data: created, error } = await supabase
        .from(TABLES.moduleDelegations)
        .upsert({
          id: delegationId,
          module_id: args.moduleId,
          granted_by_lecturer_id: args.grantedByLecturerId,
          delegate_type: args.delegateType,
          delegate_student_id: args.delegateStudentId,
          capabilities: args.capabilities,
          active: true,
          effective_date: args.effectiveDate ?? null,
          session_id: args.sessionId ?? null,
          expires_at: args.expiresAt ?? null,
        })
        .select()
        .single();

      if (error) throw error;

      // Secondary Update: Update tutor_ids if delegate is a tutor
      if (args.delegateType === "tutor") {
        const currentTutors = mod.tutor_ids ?? mod.tutorIds ?? [];
        if (!currentTutors.includes(args.delegateStudentId)) {
          await supabase
            .from(TABLES.modules)
            .update({ tutor_ids: [...currentTutors, args.delegateStudentId] })
            .eq("id", args.moduleId);
        }
      }
      
      return created as unknown as ModuleDelegationModel;

    } else {
      // 4. LEGACY MOCK LOGIC
      mockDB.touch();
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
    }
  },

  // grantModuleDelegation(args: {
  //   moduleId: string;
  //   grantedByLecturerId: string;
  //   delegateStudentId: string;
  //   delegateType: ModuleDelegateType;
  //   capabilities: AttendanceCapability[];
  //   effectiveDate?: string | null;
  //   sessionId?: string | null;
  //   expiresAt?: string | null;
  // }): ModuleDelegationModel {


  //   mockDB.touch();
  //   const mod = mockDB.read("modules", args.moduleId);
  //   if (!mod || mod.lecturerId !== args.grantedByLecturerId) {
  //     throw new Error("Module not found or you are not the primary lecturer.");
  //   }
  //   if (!mod.enrolledStudents.includes(args.delegateStudentId)) {
  //     throw new Error("Delegate must be enrolled in the module.");
  //   }

  //   const existing = mockDB
  //     .query("moduleDelegations", {
  //       moduleId: args.moduleId,
  //       delegateStudentId: args.delegateStudentId,
  //       delegateType: args.delegateType,
  //     })
  //     .find((d) => d.active);

  //   if (existing) {
  //     return mockDB.update("moduleDelegations", existing.id, {
  //       capabilities: args.capabilities,
  //       effectiveDate: args.effectiveDate ?? null,
  //       sessionId: args.sessionId ?? null,
  //       expiresAt: args.expiresAt ?? null,
  //       active: true,
  //     });
  //   }

  //   const created = mockDB.create("moduleDelegations", {
  //     moduleId: args.moduleId,
  //     courseId: mod.courseId ?? null,
  //     grantedByLecturerId: args.grantedByLecturerId,
  //     delegateType: args.delegateType,
  //     delegateStudentId: args.delegateStudentId,
  //     capabilities: args.capabilities,
  //     active: true,
  //     effectiveDate: args.effectiveDate ?? null,
  //     sessionId: args.sessionId ?? null,
  //     expiresAt: args.expiresAt ?? null,
  //     createdAt: new Date().toISOString(),
  //   });

  //   if (args.delegateType === "tutor") {
  //     const tutorIds = [...new Set([...(mod.tutorIds ?? []), args.delegateStudentId])];
  //     mockDB.update("modules", args.moduleId, { tutorIds });
  //     const tutor = mockDB.query("tutors", { studentId: args.delegateStudentId })[0];
  //     const stu = mockDB.read("students", args.delegateStudentId);
  //     if (stu && !tutor) {
  //       mockDB.create("tutors", {
  //         studentId: stu.id,
  //         fullName: stu.fullName,
  //         email: stu.email,
  //         facultyId: stu.facultyId,
  //         departmentId: stu.departmentId ?? null,
  //         yearLevel: stu.yearLevel ?? 3,
  //         moduleIds: [args.moduleId],
  //         totalLoggedHours: 0,
  //         createdAt: new Date().toISOString(),
  //       });
  //     } else if (tutor) {
  //       mockDB.update("tutors", tutor.id, {
  //         moduleIds: [...new Set([...tutor.moduleIds, args.moduleId])],
  //       });
  //     }
  //   }

  //   audit({
  //     action: "delegation.created",
  //     actorRole: "lecturer",
  //     actorPersonId: args.grantedByLecturerId,
  //     scopeType: "module",
  //     scopeId: args.moduleId,
  //     targetPersonId: args.delegateStudentId,
  //     metadata: { delegateType: args.delegateType, capabilities: args.capabilities },
  //   });

  //   bump();
  //   return created;
  // },

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


