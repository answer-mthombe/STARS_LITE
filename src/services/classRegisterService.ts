import { mockDB } from "@/mockDB/mockDBService";
import { useMockDbVersionStore } from "@/store/mockDbVersionStore";
import type { ClassRegisterModel } from "@/models/ClassRegister";
import { registerPdfService } from "@/services/registerPdfService";

function bump() {
  useMockDbVersionStore.getState().bump();
}

function tutorNamesForModule(moduleId: string): { ids: string[]; names: string[] } {
  const mod = mockDB.read("modules", moduleId);
  const ids = mod?.tutorIds ?? [];
  const names = ids
    .map((sid) => mockDB.read("students", sid))
    .filter(Boolean)
    .map((s) => s!.fullName);
  return { ids, names };
}

function durationMinutes(startIso: string, endIso: string): number {
  return Math.max(1, Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60_000));
}

function logTutorHours(args: {
  tutorStudentId: string;
  tutorName: string;
  moduleId: string;
  moduleCode: string;
  startedAt: string;
  endedAt: string;
  workType: "class";
  referenceId: string;
}) {
  const hours = durationMinutes(args.startedAt, args.endedAt) / 60;
  mockDB.create("tutorTimesheets", {
    tutorStudentId: args.tutorStudentId,
    tutorName: args.tutorName,
    workType: args.workType,
    referenceId: args.referenceId,
    moduleId: args.moduleId,
    moduleCode: args.moduleCode,
    startedAt: args.startedAt,
    endedAt: args.endedAt,
    hoursWorked: Math.round(hours * 100) / 100,
    submitted: false,
    submittedAt: null,
    createdAt: new Date().toISOString(),
  });
  const tutor = mockDB.query("tutors", { studentId: args.tutorStudentId })[0];
  if (tutor) {
    mockDB.update("tutors", tutor.id, {
      totalLoggedHours: Math.round((tutor.totalLoggedHours + hours) * 100) / 100,
    });
  }
}

export const classRegisterService = {
  getRegister(id: string): ClassRegisterModel | null {
    return mockDB.read("classRegisters", id);
  },

  listForModule(moduleId: string): ClassRegisterModel[] {
    return mockDB.list("classRegisters").filter((r) => r.moduleId === moduleId);
  },

  listForTutor(tutorStudentId: string): ClassRegisterModel[] {
    return mockDB
      .list("classRegisters")
      .filter((r) => r.tutorStudentIds.includes(tutorStudentId));
  },

  /**
   * Tutor or lecturer confirms class ended → build register + PDF + tutor timesheets.
   * If module has tutors: each must confirm once; lecturer can finalize immediately.
   */
  async confirmClassEnded(args: {
    sessionId: string;
    confirmedByRole: "lecturer" | "tutor";
    confirmedByPersonId: string;
  }): Promise<{ ok: true; register: ClassRegisterModel } | { ok: false; reason: string }> {
    mockDB.touch();
    const session = mockDB.read("attendanceSessions", args.sessionId);
    if (!session) return { ok: false, reason: "Session not found." };
    if (session.classRegisterId) {
      const existing = mockDB.read("classRegisters", session.classRegisterId);
      if (existing) return { ok: true, register: existing };
    }

    const mod = mockDB.read("modules", session.moduleId);
    if (!mod) return { ok: false, reason: "Module not found." };

    const { ids: tutorIds, names: tutorNames } = tutorNamesForModule(mod.id);
    const confirmations = [...(session.tutorEndConfirmations ?? [])];

    if (args.confirmedByRole === "tutor") {
      const tutorStudentId = args.confirmedByPersonId;
      if (!tutorIds.includes(tutorStudentId)) {
        return { ok: false, reason: "You are not a tutor on this module." };
      }
      if (!confirmations.includes(tutorStudentId)) confirmations.push(tutorStudentId);
    }

    const lecturerFinalize = args.confirmedByRole === "lecturer";
    const allTutorsConfirmed = tutorIds.length === 0 || tutorIds.every((id) => confirmations.includes(id));

    if (!lecturerFinalize && !allTutorsConfirmed) {
      mockDB.update("attendanceSessions", session.id, {
        tutorEndConfirmations: confirmations,
        active: false,
      });
      bump();
      const pending = tutorIds.filter((id) => !confirmations.includes(id)).length;
      return {
        ok: false,
        reason: `Awaiting ${pending} more tutor confirmation(s) before the register is generated.`,
      };
    }

    const endedAt = new Date().toISOString();
    const lecturer = mockDB.read("lecturers", session.lecturerId);
    const records = mockDB.query("attendanceRecords", { sessionId: session.id });
    const presentIds = new Set(records.map((r) => r.studentId));

    const students = mod.enrolledStudents.map((sid) => {
      const stu = mockDB.read("students", sid);
      const rec = records.find((r) => r.studentId === sid);
      return {
        studentId: sid,
        studentNumber: stu?.studentNumber ?? sid,
        fullName: stu?.fullName ?? "Unknown",
        present: presentIds.has(sid),
        markedAt: rec?.timestamp ?? null,
      };
    });

    const register = mockDB.create("classRegisters", {
      sessionId: session.id,
      moduleId: mod.id,
      moduleCode: mod.moduleCode,
      moduleName: mod.moduleName,
      tutorStudentIds: tutorIds,
      tutorNames,
      lecturerId: session.lecturerId,
      lecturerName: lecturer?.fullName ?? "Lecturer",
      startedAt: session.createdAt,
      endedAt,
      durationMinutes: durationMinutes(session.createdAt, endedAt),
      students,
      confirmedByTutorStudentIds: confirmations,
      confirmedByLecturer: lecturerFinalize,
      pdfUri: null,
      htmlSnapshot: null,
      createdAt: endedAt,
    });

    const { uri, html } = await registerPdfService.exportClassRegisterPdf(register);
    mockDB.update("classRegisters", register.id, { pdfUri: uri, htmlSnapshot: html });
    mockDB.update("attendanceSessions", session.id, {
      active: false,
      endedAt,
      tutorEndConfirmations: confirmations,
      classRegisterId: register.id,
    });
    if (mod.activeSessionId === session.id) {
      mockDB.update("modules", mod.id, { activeSessionId: null });
    }

    for (const tid of tutorIds) {
      const stu = mockDB.read("students", tid);
      if (stu) {
        logTutorHours({
          tutorStudentId: tid,
          tutorName: stu.fullName,
          moduleId: mod.id,
          moduleCode: mod.moduleCode,
          startedAt: session.createdAt,
          endedAt,
          workType: "class",
          referenceId: register.id,
        });
      }
    }

    bump();
    return { ok: true, register: mockDB.read("classRegisters", register.id)! };
  },

  async shareRegisterPdf(registerId: string): Promise<void> {
    const reg = mockDB.read("classRegisters", registerId);
    if (!reg) throw new Error("Register not found.");
    const { uri, html } = await registerPdfService.ensureClassPdf(reg);
    mockDB.update("classRegisters", registerId, { pdfUri: uri, htmlSnapshot: html });
    await registerPdfService.sharePdf(uri, `${reg.moduleCode} class register`);
  },

  async printRegister(registerId: string): Promise<void> {
    const reg = mockDB.read("classRegisters", registerId);
    if (!reg) throw new Error("Register not found.");
    const html = reg.htmlSnapshot ?? (await registerPdfService.ensureClassPdf(reg)).html;
    await registerPdfService.printHtml(html);
  },
};
