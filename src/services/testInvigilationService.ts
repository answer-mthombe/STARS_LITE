import { mockDB } from "@/mockDB/mockDBService";
import { useMockDbVersionStore } from "@/store/mockDbVersionStore";
import type {
  TestInvigilator,
  TestMarkModel,
  TestRegisterModel,
  TestSessionModel,
} from "@/models/TestSession";
import type { InvigilatorScanSide } from "@/models/TestSession";
import { findStudentByBarcode } from "@/utils/studentCardBarcode";
import { registerPdfService } from "@/services/registerPdfService";

function bump() {
  useMockDbVersionStore.getState().bump();
}

function durationMinutes(startIso: string, endIso: string): number {
  return Math.max(1, Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60_000));
}

export const testInvigilationService = {
  getSession(id: string): TestSessionModel | null {
    return mockDB.read("testSessions", id);
  },

  listActiveForModule(moduleId: string): TestSessionModel[] {
    return mockDB
      .list("testSessions")
      .filter((t) => t.moduleId === moduleId && t.status !== "closed");
  },

  listInvigilationForPerson(personId: string): TestSessionModel[] {
    return mockDB.list("testSessions").filter((t) => {
      if (t.status === "closed" && !t.registerId) return false;
      return t.invigilators.some((i) => i.personId === personId && i.canScan);
    });
  },

  listRegistersVisibleToTutor(tutorStudentId: string): TestRegisterModel[] {
    return mockDB
      .list("testRegisters")
      .filter((r) => {
        const sess = mockDB.read("testSessions", r.testSessionId);
        return (
          sess?.status === "closed" &&
          sess.invigilators.some((i) => i.personId === tutorStudentId)
        );
      });
  },

  startTest(args: {
    moduleId: string;
    lecturerId: string;
    title: string;
    tutorInvigilators?: { studentId: string; fullName: string; canScan?: boolean; scanSide?: InvigilatorScanSide }[];
  }): TestSessionModel {
    mockDB.touch();
    const mod = mockDB.read("modules", args.moduleId);
    if (!mod || mod.lecturerId !== args.lecturerId) throw new Error("Module not found.");

    const lecturer = mockDB.read("lecturers", args.lecturerId);
    const invigilators: TestInvigilator[] = [
      {
        personId: args.lecturerId,
        role: "lecturer",
        fullName: lecturer?.fullName ?? "Lecturer",
        canScan: true,
        scanSide: "any",
      },
    ];

    const tutors = args.tutorInvigilators ?? [];
    tutors.forEach((t, idx) => {
      invigilators.push({
        personId: t.studentId,
        role: "tutor",
        fullName: t.fullName,
        canScan: t.canScan ?? true,
        scanSide: t.scanSide ?? (idx % 2 === 0 ? "left" : "right"),
      });
    });

    const created = mockDB.create("testSessions", {
      moduleId: mod.id,
      moduleCode: mod.moduleCode,
      moduleName: mod.moduleName,
      title: args.title.trim(),
      lecturerId: args.lecturerId,
      status: "active",
      invigilators,
      startedAt: new Date().toISOString(),
      endedAt: null,
      lecturerConfirmedAt: null,
      registerId: null,
      createdAt: new Date().toISOString(),
    });
    bump();
    return created;
  },

  setInvigilatorCanScan(testSessionId: string, personId: string, canScan: boolean, byLecturerId: string): void {
    const sess = mockDB.read("testSessions", testSessionId);
    if (!sess || sess.lecturerId !== byLecturerId) throw new Error("Not authorised.");
    const invigilators = sess.invigilators.map((i) =>
      i.personId === personId ? { ...i, canScan } : i
    );
    mockDB.update("testSessions", testSessionId, { invigilators });
    bump();
  },

  addTutorInvigilator(args: {
    testSessionId: string;
    tutorStudentId: string;
    byLecturerId: string;
    canScan?: boolean;
    scanSide?: InvigilatorScanSide;
  }): void {
    const sess = mockDB.read("testSessions", args.testSessionId);
    if (!sess || sess.lecturerId !== args.byLecturerId) throw new Error("Not authorised.");
    if (sess.invigilators.some((i) => i.personId === args.tutorStudentId)) return;

    const stu = mockDB.read("students", args.tutorStudentId);
    if (!stu) throw new Error("Student not found.");

    const invigilators: TestInvigilator[] = [
      ...sess.invigilators,
      {
        personId: stu.id,
        role: "tutor",
        fullName: stu.fullName,
        canScan: args.canScan ?? true,
        scanSide: args.scanSide ?? "any",
      },
    ];
    mockDB.update("testSessions", args.testSessionId, { invigilators });
    bump();
  },

  /**
   * Mark student present — single shared register, duplicate-safe across simultaneous scanners.
   */
  markStudent(args: {
    testSessionId: string;
    markedByPersonId: string;
    markedByRole: "lecturer" | "tutor";
    barcodeOrNumber: string;
    method: "barcode" | "manual";
  }): { ok: true; mark: TestMarkModel } | { ok: false; reason: string; duplicate?: boolean } {
    mockDB.touch();
    const sess = mockDB.read("testSessions", args.testSessionId);
    if (!sess || sess.status !== "active") {
      return { ok: false, reason: "Test session not active." };
    }

    const inv = sess.invigilators.find((i) => i.personId === args.markedByPersonId);
    if (!inv?.canScan) {
      return { ok: false, reason: "You are not enabled to scan for this test." };
    }

    const allStudents = mockDB.list("students");
    const stu =
      args.method === "barcode"
        ? findStudentByBarcode(allStudents, args.barcodeOrNumber)
        : allStudents.find((s) => s.studentNumber === args.barcodeOrNumber.trim());

    if (!stu) return { ok: false, reason: "Student not found." };

    const mod = mockDB.read("modules", sess.moduleId);
    if (!mod?.enrolledStudents.includes(stu.id)) {
      return { ok: false, reason: "Student not enrolled in this module." };
    }

    const existing = mockDB
      .query("testMarks", { testSessionId: args.testSessionId })
      .find((m) => m.studentId === stu.id);
    if (existing) {
      return { ok: false, reason: "Already marked present.", duplicate: true };
    }

    const mark = mockDB.create("testMarks", {
      testSessionId: args.testSessionId,
      studentId: stu.id,
      studentNumber: stu.studentNumber,
      fullName: stu.fullName,
      markedByPersonId: args.markedByPersonId,
      markedByRole: args.markedByRole,
      method: args.method,
      timestamp: new Date().toISOString(),
    });
    bump();
    return { ok: true, mark };
  },

  getMarks(testSessionId: string): TestMarkModel[] {
    return mockDB.query("testMarks", { testSessionId });
  },

  endTestScanning(testSessionId: string, byLecturerId: string): void {
    const sess = mockDB.read("testSessions", testSessionId);
    if (!sess || sess.lecturerId !== byLecturerId) throw new Error("Not authorised.");
    mockDB.update("testSessions", testSessionId, {
      status: "awaiting_lecturer_confirm",
      endedAt: new Date().toISOString(),
    });
    bump();
  },

  /** Lecturer confirms test over → generate register PDF; tutors can print */
  async confirmTestComplete(testSessionId: string, lecturerId: string): Promise<TestRegisterModel> {
    mockDB.touch();
    const sess = mockDB.read("testSessions", testSessionId);
    if (!sess || sess.lecturerId !== lecturerId) throw new Error("Not authorised.");
    if (sess.registerId) {
      const reg = mockDB.read("testRegisters", sess.registerId);
      if (reg) return reg;
    }

    const mod = mockDB.read("modules", sess.moduleId);
    const lecturer = mockDB.read("lecturers", lecturerId);
    const marks = mockDB.query("testMarks", { testSessionId });
    const markByStudent = new Map(marks.map((m) => [m.studentId, m]));
    const endedAt = sess.endedAt ?? new Date().toISOString();

    const students = (mod?.enrolledStudents ?? []).map((sid) => {
      const stu = mockDB.read("students", sid);
      const m = markByStudent.get(sid);
      const inv = m
        ? sess.invigilators.find((i) => i.personId === m.markedByPersonId)
        : null;
      return {
        studentId: sid,
        studentNumber: stu?.studentNumber ?? sid,
        fullName: stu?.fullName ?? "Unknown",
        present: !!m,
        markedBy: inv?.fullName ?? null,
        method: m?.method ?? null,
      };
    });

    const register = mockDB.create("testRegisters", {
      testSessionId: sess.id,
      moduleId: sess.moduleId,
      title: sess.title,
      invigilatorNames: sess.invigilators.map((i) => i.fullName),
      lecturerName: lecturer?.fullName ?? "Lecturer",
      startedAt: sess.startedAt,
      endedAt,
      students,
      pdfUri: null,
      htmlSnapshot: null,
      createdAt: new Date().toISOString(),
    });

    const { uri, html } = await registerPdfService.exportTestRegisterPdf(register);
    mockDB.update("testRegisters", register.id, { pdfUri: uri, htmlSnapshot: html });
    mockDB.update("testSessions", testSessionId, {
      status: "closed",
      lecturerConfirmedAt: new Date().toISOString(),
      registerId: register.id,
      endedAt,
    });

    const hours = durationMinutes(sess.startedAt, endedAt) / 60;
    for (const inv of sess.invigilators.filter((i) => i.role === "tutor")) {
      mockDB.create("tutorTimesheets", {
        tutorStudentId: inv.personId,
        tutorName: inv.fullName,
        workType: "test",
        referenceId: register.id,
        moduleId: sess.moduleId,
        moduleCode: sess.moduleCode,
        startedAt: sess.startedAt,
        endedAt,
        hoursWorked: Math.round(hours * 100) / 100,
        submitted: false,
        submittedAt: null,
        createdAt: new Date().toISOString(),
      });
      const tutor = mockDB.query("tutors", { studentId: inv.personId })[0];
      if (tutor) {
        mockDB.update("tutors", tutor.id, {
          totalLoggedHours: Math.round((tutor.totalLoggedHours + hours) * 100) / 100,
        });
      }
    }

    bump();
    return mockDB.read("testRegisters", register.id)!;
  },

  async shareTestRegister(registerId: string): Promise<void> {
    const reg = mockDB.read("testRegisters", registerId);
    if (!reg) throw new Error("Register not found.");
    const { uri, html } = await registerPdfService.ensureTestPdf(reg);
    mockDB.update("testRegisters", registerId, { pdfUri: uri, htmlSnapshot: html });
    await registerPdfService.sharePdf(uri, `${reg.title} register`);
  },

  async printTestRegister(registerId: string): Promise<void> {
    const reg = mockDB.read("testRegisters", registerId);
    if (!reg) throw new Error("Register not found.");
    const html = reg.htmlSnapshot ?? (await registerPdfService.ensureTestPdf(reg)).html;
    await registerPdfService.printHtml(html);
  },
};
