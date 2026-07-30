import { getDataSource } from "@/services/dataSource";

import {
  getModuleById,
  getModuleByClassCode,
  updateModuleEnrollment,
} from "@/services/supabase/moduleRepository";

import {
  getStudentById,
  updateRegisteredModules,
} from "@/services/supabase/studentRepository";

import { mockDB } from "@/mockDB/mockDBService";
import { useMockDbVersionStore } from "@/store/mockDbVersionStore";

function bump() {
  useMockDbVersionStore.getState().bump();
}

export const moduleEnrollmentService = {

  async joinByClassCode(studentId: string, rawCode: string) {
  const code = rawCode.trim().toUpperCase();

  // ------------------ Supabase ------------------
  if (getDataSource() === "supabase") {
    const mod = await getModuleByClassCode(code);
    if (!mod) throw new Error("Invalid class code.");

    const stu = await getStudentById(studentId);
    if (!stu) throw new Error("Student not found.");

    if (mod.enrolledStudents.includes(studentId)) {
      return mod;
    }

    const enrolledStudents = [...mod.enrolledStudents, studentId];
    const registeredModules = Array.from(
      new Set([...stu.registeredModules, mod.id])
    );

    await updateModuleEnrollment(mod.id, enrolledStudents);
    await updateRegisteredModules(studentId, registeredModules);

    return {
      ...mod,
      enrolledStudents,
    };
  }

  // ------------------ Mock ------------------
  const mod = mockDB.list("modules").find(
    (m) => m.classCode.toUpperCase() === code
  );
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

async requestJoin(studentId: string, moduleId: string) {
  // ------------------ Supabase ------------------
  if (getDataSource() === "supabase") {
    const mod = await getModuleById(moduleId);

    if (!mod) throw new Error("Module not found.");

    if (mod.enrolledStudents.includes(studentId)) {
      return;
    }

    const pendingRequests = Array.from(
      new Set([...mod.pendingRequests, studentId])
    );

    await updateModuleEnrollment(
      moduleId,
      mod.enrolledStudents,
      pendingRequests
    );

    return;
  }

  // ------------------ Mock ------------------
  const mod = mockDB.read("modules", moduleId);
  if (!mod) throw new Error("Module not found.");

  if (mod.enrolledStudents.includes(studentId)) return;

  const pending = Array.from(new Set([...mod.pendingRequests, studentId]));
  mockDB.update("modules", moduleId, { pendingRequests: pending });

  bump();
},

async acceptPending(moduleId: string, studentId: string) {
  // ------------------ Supabase ------------------
  if (getDataSource() === "supabase") {
    const mod = await getModuleById(moduleId);
    if (!mod) throw new Error("Module not found.");

    const pendingRequests = mod.pendingRequests.filter(
      (id) => id !== studentId
    );

    const enrolledStudents = mod.enrolledStudents.includes(studentId)
      ? mod.enrolledStudents
      : [...mod.enrolledStudents, studentId];

    await updateModuleEnrollment(
      moduleId,
      enrolledStudents,
      pendingRequests
    );

    const stu = await getStudentById(studentId);

    if (stu) {
      const registeredModules = Array.from(
        new Set([...stu.registeredModules, moduleId])
      );

      await updateRegisteredModules(
        studentId,
        registeredModules
      );
    }

    return;
  }

  // ------------------ Mock ------------------
  const mod = mockDB.read("modules", moduleId);
  if (!mod) throw new Error("Module not found.");

  const pending = mod.pendingRequests.filter((id) => id !== studentId);

  const enrolled = mod.enrolledStudents.includes(studentId)
    ? mod.enrolledStudents
    : [...mod.enrolledStudents, studentId];

  mockDB.update("modules", moduleId, {
    pendingRequests: pending,
    enrolledStudents: enrolled,
  });

  const stu = mockDB.read("students", studentId);

  if (stu) {
    const reg = Array.from(
      new Set([...stu.registeredModules, moduleId])
    );

    mockDB.update("students", studentId, {
      registeredModules: reg,
    });
  }

  bump();
},



  async rejectPending(moduleId: string, studentId: string) {
  // ------------------ Supabase ------------------
  if (getDataSource() === "supabase") {
    const mod = await getModuleById(moduleId);

    if (!mod) throw new Error("Module not found.");

    const pendingRequests = mod.pendingRequests.filter(
      (id) => id !== studentId
    );

    await updateModuleEnrollment(
      moduleId,
      mod.enrolledStudents,
      pendingRequests
    );

    return;
  }

  // ------------------ Mock ------------------
  const mod = mockDB.read("modules", moduleId);

  if (!mod) throw new Error("Module not found.");

  mockDB.update("modules", moduleId, {
    pendingRequests: mod.pendingRequests.filter(
      (id) => id !== studentId
    ),
  });

  bump();
},

async manualAddStudent(moduleId: string, studentId: string) {
  // ------------------ Supabase ------------------
  if (getDataSource() === "supabase") {
    const mod = await getModuleById(moduleId);
    const stu = await getStudentById(studentId);

    console.log("module =", mod);
    console.log("student =", stu);



    if (!mod || !stu) {
      throw new Error("Module or student not found.");
    }

    if (mod.enrolledStudents.includes(studentId)) {
      return;
    }

    const enrolledStudents = [
      ...mod.enrolledStudents,
      studentId,
    ];

    const registeredModules = Array.from(
      new Set([...stu.registeredModules, moduleId])
    );

    await updateModuleEnrollment(
      moduleId,
      enrolledStudents,
      mod.pendingRequests
    );

    await updateRegisteredModules(
      studentId,
      registeredModules
    );

    return;
  }

  // ------------------ Mock ------------------
  const mod = mockDB.read("modules", moduleId);
  const stu = mockDB.read("students", studentId);

  if (!mod || !stu) {
    throw new Error("Module or student not found.");
  }

  if (mod.enrolledStudents.includes(studentId)) {
    return;
  }

  mockDB.update("modules", moduleId, {
    enrolledStudents: [...mod.enrolledStudents, studentId],
  });

  mockDB.update("students", studentId, {
    registeredModules: Array.from(
      new Set([...stu.registeredModules, moduleId])
    ),
  });

  bump();
},
};
