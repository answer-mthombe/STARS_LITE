import type { MockCollections } from "./mockDBService";
import type { ClassRegisterModel } from "@/models/ClassRegister";
import type { TestSessionModel, TestMarkModel, TestRegisterModel } from "@/models/TestSession";
import type { TutorTimesheetModel } from "@/models/TutorTimesheet";
import type { AttendanceSessionModel, AttendanceRecordModel } from "@/models/Attendance";
import type { AuditLogModel } from "@/models/AuditLog";
import { classRegisterHtml, testRegisterHtml } from "@/utils/registerPdfHtml";

const DEMO_PDF_URI = "demo:print-ready";

function minsBetween(start: string, end: string) {
  return Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60_000));
}

/**
 * Fills simulator with complete demo data: past sessions, class/test registers (HTML print-ready),
 * test marks, timesheets, and one live test session for scanning demos.
 */
export function populateDemoRegistersAndTests(data: MockCollections): void {
  const mkhize = data.lecturers.find((l) => l.id === "lec_mkhize");
  const modMobile = data.modules.find((m) => m.id === "mod_mobile");
  const modDb = data.modules.find((m) => m.id === "mod_db");
  const modNet = data.modules.find((m) => m.id === "mod_net");
  if (!mkhize || !modMobile) return;

  const thabo = data.students.find((s) => s.id === "stu_22005678");
  const amahle = data.students.find((s) => s.id === "stu_22001234");
  const tutorNames = thabo ? [thabo.fullName] : [];

  // —— Completed class session + register (Mobile Dev) ——
  const classStart = "2026-05-15T08:00:00.000Z";
  const classEnd = "2026-05-15T09:30:00.000Z";
  const sessClass: AttendanceSessionModel = {
    id: "sess_demo_mobile_class",
    moduleId: modMobile.id,
    lecturerId: mkhize.id,
    startedByRole: "tutor",
    startedById: thabo?.id ?? mkhize.id,
    lecturerLocation: { latitude: -29.8587, longitude: 31.0218 },
    createdAt: classStart,
    expiresAt: classEnd,
    active: false,
    radius: 50,
    algorithmSeed: "demo_seed_mobile",
    endedAt: classEnd,
    tutorEndConfirmations: thabo ? [thabo.id] : [],
    classRegisterId: "reg_class_mobile",
  };

  const classRecords: AttendanceRecordModel[] = [
    {
      id: "rec_demo_m1",
      sessionId: sessClass.id,
      studentId: "stu_22001234",
      timestamp: "2026-05-15T08:12:00.000Z",
      distance: 8,
      verified: true,
    },
    {
      id: "rec_demo_m2",
      sessionId: sessClass.id,
      studentId: "stu_22005678",
      timestamp: "2026-05-15T08:15:00.000Z",
      distance: 14,
      verified: true,
    },
  ];

  const classStudents = modMobile.enrolledStudents.map((sid) => {
    const stu = data.students.find((s) => s.id === sid);
    const present = classRecords.some((r) => r.studentId === sid);
    return {
      studentId: sid,
      studentNumber: stu?.studentNumber ?? sid,
      fullName: stu?.fullName ?? "Unknown",
      present,
      markedAt: classRecords.find((r) => r.studentId === sid)?.timestamp ?? null,
    };
  });

  const classReg: ClassRegisterModel = {
    id: "reg_class_mobile",
    sessionId: sessClass.id,
    moduleId: modMobile.id,
    moduleCode: modMobile.moduleCode,
    moduleName: modMobile.moduleName,
    tutorStudentIds: modMobile.tutorIds ?? [],
    tutorNames,
    lecturerId: mkhize.id,
    lecturerName: mkhize.fullName,
    startedAt: classStart,
    endedAt: classEnd,
    durationMinutes: minsBetween(classStart, classEnd),
    students: classStudents,
    confirmedByTutorStudentIds: thabo ? [thabo.id] : [],
    confirmedByLecturer: false,
    pdfUri: DEMO_PDF_URI,
    htmlSnapshot: null,
    createdAt: classEnd,
  };
  classReg.htmlSnapshot = classRegisterHtml(classReg);

  // —— Closed test with full register (Mobile Dev midterm) ——
  const testStart = "2026-05-10T10:00:00.000Z";
  const testEnd = "2026-05-10T11:30:00.000Z";
  const testClosed: TestSessionModel = {
    id: "test_demo_mobile_midterm",
    moduleId: modMobile.id,
    moduleCode: modMobile.moduleCode,
    moduleName: modMobile.moduleName,
    title: "Midterm test — Mobile Development",
    lecturerId: mkhize.id,
    status: "closed",
    invigilators: [
      {
        personId: mkhize.id,
        role: "lecturer",
        fullName: mkhize.fullName,
        canScan: true,
        scanSide: "any",
      },
      ...(thabo
        ? [
            {
              personId: thabo.id,
              role: "tutor" as const,
              fullName: thabo.fullName,
              canScan: true,
              scanSide: "left" as const,
            },
          ]
        : []),
    ],
    startedAt: testStart,
    endedAt: testEnd,
    lecturerConfirmedAt: testEnd,
    registerId: "reg_test_mobile_midterm",
    createdAt: testStart,
  };

  const testMarks: TestMarkModel[] = modMobile.enrolledStudents.map((sid, i) => {
    const stu = data.students.find((s) => s.id === sid);
    return {
      id: `mark_demo_m_${i}`,
      testSessionId: testClosed.id,
      studentId: sid,
      studentNumber: stu?.studentNumber ?? "",
      fullName: stu?.fullName ?? "",
      markedByPersonId: i % 2 === 0 ? mkhize.id : (thabo?.id ?? mkhize.id),
      markedByRole: i % 2 === 0 ? "lecturer" : "tutor",
      method: i === 0 ? "barcode" : "manual",
      timestamp: testStart,
    };
  });

  const testRegStudents = modMobile.enrolledStudents.map((sid) => {
    const stu = data.students.find((s) => s.id === sid);
    const m = testMarks.find((x) => x.studentId === sid);
    const inv = testClosed.invigilators.find((i) => i.personId === m?.markedByPersonId);
    return {
      studentId: sid,
      studentNumber: stu?.studentNumber ?? "",
      fullName: stu?.fullName ?? "",
      present: !!m,
      markedBy: inv?.fullName ?? null,
      method: m?.method ?? null,
    };
  });

  const testReg: TestRegisterModel = {
    id: "reg_test_mobile_midterm",
    testSessionId: testClosed.id,
    moduleId: modMobile.id,
    title: testClosed.title,
    invigilatorNames: testClosed.invigilators.map((i) => i.fullName),
    lecturerName: mkhize.fullName,
    startedAt: testStart,
    endedAt: testEnd,
    students: testRegStudents,
    pdfUri: DEMO_PDF_URI,
    htmlSnapshot: null,
    createdAt: testEnd,
  };
  testReg.htmlSnapshot = testRegisterHtml(testReg);

  // —— Active test for live scanning demo ——
  const testActiveStart = new Date(Date.now() - 20 * 60_000).toISOString();
  const testActive: TestSessionModel = {
    id: "test_demo_active",
    moduleId: modMobile.id,
    moduleCode: modMobile.moduleCode,
    moduleName: modMobile.moduleName,
    title: "Quiz 2 (live demo)",
    lecturerId: mkhize.id,
    status: "active",
    invigilators: [
      {
        personId: mkhize.id,
        role: "lecturer",
        fullName: mkhize.fullName,
        canScan: true,
        scanSide: "right",
      },
      ...(thabo
        ? [
            {
              personId: thabo.id,
              role: "tutor" as const,
              fullName: thabo.fullName,
              canScan: true,
              scanSide: "left" as const,
            },
          ]
        : []),
    ],
    startedAt: testActiveStart,
    endedAt: null,
    lecturerConfirmedAt: null,
    registerId: null,
    createdAt: testActiveStart,
  };

  const activeMark: TestMarkModel[] = amahle
    ? [
        {
          id: "mark_demo_active_1",
          testSessionId: testActive.id,
          studentId: amahle.id,
          studentNumber: amahle.studentNumber,
          fullName: amahle.fullName,
          markedByPersonId: mkhize.id,
          markedByRole: "lecturer",
          method: "barcode",
          timestamp: testActiveStart,
        },
      ]
    : [];

  // —— Database class register (lecturer-ended) ——
  let extraClassReg: ClassRegisterModel | null = null;
  let extraSess: AttendanceSessionModel | null = null;
  if (modDb && amahle) {
    const dbStart = "2026-05-12T11:00:00.000Z";
    const dbEnd = "2026-05-12T12:20:00.000Z";
    extraSess = {
      id: "sess_demo_db_class",
      moduleId: modDb.id,
      lecturerId: mkhize.id,
      startedByRole: "lecturer",
      startedById: mkhize.id,
      lecturerLocation: { latitude: -29.8587, longitude: 31.0218 },
      createdAt: dbStart,
      expiresAt: dbEnd,
      active: false,
      radius: 45,
      algorithmSeed: "demo_seed_db",
      endedAt: dbEnd,
      tutorEndConfirmations: [],
      classRegisterId: "reg_class_db",
    };
    extraClassReg = {
      id: "reg_class_db",
      sessionId: extraSess.id,
      moduleId: modDb.id,
      moduleCode: modDb.moduleCode,
      moduleName: modDb.moduleName,
      tutorStudentIds: [],
      tutorNames: [],
      lecturerId: mkhize.id,
      lecturerName: mkhize.fullName,
      startedAt: dbStart,
      endedAt: dbEnd,
      durationMinutes: minsBetween(dbStart, dbEnd),
      students: modDb.enrolledStudents.map((sid) => {
        const stu = data.students.find((s) => s.id === sid);
        return {
          studentId: sid,
          studentNumber: stu?.studentNumber ?? sid,
          fullName: stu?.fullName ?? "",
          present: sid === "stu_22005678",
          markedAt: sid === "stu_22005678" ? dbStart : null,
        };
      }),
      confirmedByTutorStudentIds: [],
      confirmedByLecturer: true,
      pdfUri: DEMO_PDF_URI,
      htmlSnapshot: null,
      createdAt: dbEnd,
    };
    extraClassReg.htmlSnapshot = classRegisterHtml(extraClassReg);
  }

  // —— Tutor timesheets ——
  const timesheets: TutorTimesheetModel[] = [];
  if (thabo) {
    timesheets.push(
      {
        id: "ts_demo_class_pending",
        tutorStudentId: thabo.id,
        tutorName: thabo.fullName,
        workType: "class",
        referenceId: classReg.id,
        moduleId: modMobile.id,
        moduleCode: modMobile.moduleCode,
        startedAt: classStart,
        endedAt: classEnd,
        hoursWorked: 1.5,
        submitted: false,
        submittedAt: null,
        createdAt: classEnd,
      },
      {
        id: "ts_demo_test_submitted",
        tutorStudentId: thabo.id,
        tutorName: thabo.fullName,
        workType: "test",
        referenceId: testReg.id,
        moduleId: modMobile.id,
        moduleCode: modMobile.moduleCode,
        startedAt: testStart,
        endedAt: testEnd,
        hoursWorked: 1.5,
        submitted: true,
        submittedAt: testEnd,
        createdAt: testEnd,
      }
    );
    const tutor = data.tutors.find((t) => t.studentId === thabo.id);
    if (tutor) {
      tutor.totalLoggedHours = 3;
    }
  }

  const auditLogs: AuditLogModel[] = [
    {
      id: "audit_demo_1",
      action: "session.started",
      actorRole: "tutor",
      actorPersonId: thabo?.id ?? mkhize.id,
      scopeType: "module",
      scopeId: modMobile.id,
      createdAt: classStart,
    },
    {
      id: "audit_demo_2",
      action: "attendance.marked",
      actorRole: "student",
      actorPersonId: "stu_22001234",
      scopeType: "module",
      scopeId: modMobile.id,
      createdAt: classStart,
    },
  ];

  const isDemoId = (id: string) => id.includes("_demo_") || id.startsWith("reg_") || id.startsWith("test_demo") || id.startsWith("ts_demo") || id.startsWith("sess_demo") || id.startsWith("mark_demo") || id.startsWith("audit_demo");

  const upsert = <T extends { id: string }>(arr: T[], items: T[]) => {
    const ids = new Set(items.map((i) => i.id));
    return [...arr.filter((x) => !ids.has(x.id) && !isDemoId(x.id)), ...items];
  };

  data.attendanceSessions = upsert(data.attendanceSessions, [sessClass, ...(extraSess ? [extraSess] : [])]);
  data.attendanceRecords = upsert(data.attendanceRecords, classRecords);
  data.classRegisters = upsert(data.classRegisters, [classReg, ...(extraClassReg ? [extraClassReg] : [])]);
  data.testSessions = upsert(data.testSessions, [testClosed, testActive]);
  data.testMarks = upsert(data.testMarks, [...testMarks, ...activeMark]);
  data.testRegisters = upsert(data.testRegisters, [testReg]);
  data.tutorTimesheets = upsert(data.tutorTimesheets, timesheets);
  data.auditLogs = upsert(data.auditLogs, auditLogs);

  // Enrich hand-authored students
  if (amahle) {
    amahle.yearLevel = 2;
    amahle.cardBarcode = `MUT:${amahle.studentNumber}`;
  }
  if (thabo) {
    thabo.yearLevel = 3;
    thabo.cardBarcode = `MUT:${thabo.studentNumber}`;
  }

  // Networking module past session record if exists in seed
  if (modNet && amahle) {
    const netSess: AttendanceSessionModel = {
      id: "sess_demo_net",
      moduleId: modNet.id,
      lecturerId: modNet.lecturerId,
      startedByRole: "lecturer",
      startedById: modNet.lecturerId,
      lecturerLocation: { latitude: -29.86, longitude: 31.02 },
      createdAt: "2026-05-08T14:00:00.000Z",
      expiresAt: "2026-05-08T15:00:00.000Z",
      active: false,
      radius: 40,
      algorithmSeed: "demo_net",
      endedAt: "2026-05-08T15:00:00.000Z",
      classRegisterId: null,
    };
    data.attendanceSessions = upsert(data.attendanceSessions, [netSess]);
    data.attendanceRecords = upsert(data.attendanceRecords, [
      {
        id: "rec_demo_net",
        sessionId: netSess.id,
        studentId: amahle.id,
        timestamp: "2026-05-08T14:10:00.000Z",
        distance: 10,
        verified: true,
      },
    ]);
  }
}

export { DEMO_PDF_URI };
