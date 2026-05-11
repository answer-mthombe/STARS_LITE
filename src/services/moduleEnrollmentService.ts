import { mockDB } from "@/mockDB/mockDBService";
import { useMockDbVersionStore } from "@/store/mockDbVersionStore";

function bump() {
  useMockDbVersionStore.getState().bump();
}

export const moduleEnrollmentService = {
  joinByClassCode(studentId: string, rawCode: string) {
    const code = rawCode.trim().toUpperCase();
    const mod = mockDB.list("modules").find((m) => m.classCode.toUpperCase() === code);
    if (!mod) throw new Error("Invalid class code.");

    const stu = mockDB.read("students", studentId);
    if (!stu) throw new Error("Student not found.");

    if (mod.enrolledStudents.includes(studentId)) return mod;

    const enrolled = [...mod.enrolledStudents, studentId];
    mockDB.update("modules", mod.id, { enrolledStudents: enrolled });

    const reg = Array.from(new Set([...stu.registeredModules, mod.id]));
    mockDB.update("students", studentId, { registeredModules: reg });

    bump();
    return mockDB.read("modules", mod.id)!;
  },

  requestJoin(studentId: string, moduleId: string) {
    const mod = mockDB.read("modules", moduleId);
    if (!mod) throw new Error("Module not found.");
    if (mod.enrolledStudents.includes(studentId)) return;
    const pending = Array.from(new Set([...mod.pendingRequests, studentId]));
    mockDB.update("modules", moduleId, { pendingRequests: pending });
    bump();
  },

  acceptPending(moduleId: string, studentId: string) {
    const mod = mockDB.read("modules", moduleId);
    if (!mod) throw new Error("Module not found.");
    const pending = mod.pendingRequests.filter((id) => id !== studentId);
    const enrolled = mod.enrolledStudents.includes(studentId)
      ? mod.enrolledStudents
      : [...mod.enrolledStudents, studentId];
    mockDB.update("modules", moduleId, { pendingRequests: pending, enrolledStudents: enrolled });

    const stu = mockDB.read("students", studentId);
    if (stu) {
      const reg = Array.from(new Set([...stu.registeredModules, moduleId]));
      mockDB.update("students", studentId, { registeredModules: reg });
    }
    bump();
  },

  rejectPending(moduleId: string, studentId: string) {
    const mod = mockDB.read("modules", moduleId);
    if (!mod) throw new Error("Module not found.");
    mockDB.update("modules", moduleId, {
      pendingRequests: mod.pendingRequests.filter((id) => id !== studentId),
    });
    bump();
  },

  manualAddStudent(moduleId: string, studentId: string) {
    const mod = mockDB.read("modules", moduleId);
    const stu = mockDB.read("students", studentId);
    if (!mod || !stu) throw new Error("Module or student not found.");
    if (mod.enrolledStudents.includes(studentId)) return;
    mockDB.update("modules", moduleId, { enrolledStudents: [...mod.enrolledStudents, studentId] });
    mockDB.update("students", studentId, {
      registeredModules: Array.from(new Set([...stu.registeredModules, moduleId])),
    });
    bump();
  },
};
