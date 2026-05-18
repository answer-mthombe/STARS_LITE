import studentsSeed from "./students.json";
import lecturersSeed from "./lecturers.json";
import facultiesSeed from "./faculties.json";
import coursesSeed from "./courses.json";
import modulesSeed from "./modules.json";
import attendanceSessionsSeed from "./attendanceSessions.json";
import attendanceRecordsSeed from "./attendanceRecords.json";
import departmentsSeed from "./departments.json";
import deansSeed from "./deans.json";
import hodsSeed from "./hods.json";
import moduleDelegationsSeed from "./moduleDelegations.json";
import proxyAssignmentsSeed from "./proxyAssignments.json";
import tutorsSeed from "./tutors.json";

import type { StudentModel } from "@/models/Student";
import type { LecturerModel } from "@/models/Lecturer";
import type { FacultyModel } from "@/models/Faculty";
import type { CourseModel } from "@/models/Course";
import type { ModuleModel } from "@/models/Module";
import type { AttendanceRecordModel, AttendanceSessionModel } from "@/models/Attendance";
import type { DepartmentModel } from "@/models/Department";
import type { DeanModel } from "@/models/Dean";
import type { HodModel } from "@/models/Hod";
import type { ModuleDelegationModel } from "@/models/ModuleDelegation";
import type { ProxyAssignmentModel } from "@/models/ProxyAssignment";
import type { TutorModel } from "@/models/Tutor";
import type { AuditLogModel } from "@/models/AuditLog";
import type { ClassRegisterModel } from "@/models/ClassRegister";
import type { TestSessionModel, TestMarkModel, TestRegisterModel } from "@/models/TestSession";
import type { TutorTimesheetModel } from "@/models/TutorTimesheet";
import { studentCardBarcodeValue } from "@/utils/studentCardBarcode";

import { generateSyntheticStudents } from "./syntheticPopulation";
import { populateDemoRegistersAndTests } from "./demoSeedPopulation";

export type MockCollectionName =
  | "students"
  | "lecturers"
  | "faculties"
  | "courses"
  | "modules"
  | "attendanceSessions"
  | "attendanceRecords"
  | "departments"
  | "deans"
  | "hods"
  | "moduleDelegations"
  | "proxyAssignments"
  | "tutors"
  | "auditLogs"
  | "classRegisters"
  | "testSessions"
  | "testMarks"
  | "testRegisters"
  | "tutorTimesheets";

export type MockCollections = {
  students: StudentModel[];
  lecturers: LecturerModel[];
  faculties: FacultyModel[];
  courses: CourseModel[];
  modules: ModuleModel[];
  attendanceSessions: AttendanceSessionModel[];
  attendanceRecords: AttendanceRecordModel[];
  departments: DepartmentModel[];
  deans: DeanModel[];
  hods: HodModel[];
  moduleDelegations: ModuleDelegationModel[];
  proxyAssignments: ProxyAssignmentModel[];
  tutors: TutorModel[];
  auditLogs: AuditLogModel[];
  classRegisters: ClassRegisterModel[];
  testSessions: TestSessionModel[];
  testMarks: TestMarkModel[];
  testRegisters: TestRegisterModel[];
  tutorTimesheets: TutorTimesheetModel[];
};

type AnyRecord = { id: string };

export type Query<T> = Partial<Record<keyof T, unknown>> & {
  limit?: number;
  orderBy?: keyof T;
  order?: "asc" | "desc";
};

function nowIso() {
  return new Date().toISOString();
}

function id(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function matches<T extends AnyRecord>(row: T, where: Query<T>) {
  for (const [k, v] of Object.entries(where)) {
    if (k === "limit" || k === "orderBy" || k === "order") continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((row as any)[k] !== v) return false;
  }
  return true;
}

/** Hand-built seed students + ~118 synthetic across courses ≈ 120 total for demos */
const SYNTHETIC_STUDENT_TARGET = 118;

class InMemoryMockDB {
  private data: MockCollections;

  constructor() {
    this.data = {
      students: [],
      lecturers: [],
      faculties: [],
      courses: [],
      modules: [],
      attendanceSessions: [],
      attendanceRecords: [],
      departments: [],
      deans: [],
      hods: [],
      moduleDelegations: [],
      proxyAssignments: [],
      tutors: [],
      auditLogs: [],
      classRegisters: [],
      testSessions: [],
      testMarks: [],
      testRegisters: [],
      tutorTimesheets: [],
    };
    this.seedInitialData();
  }

  seedInitialData() {
    this.data.faculties = (facultiesSeed as unknown as FacultyModel[]).map((f) => ({ ...f }));
    this.data.departments = (departmentsSeed as unknown as DepartmentModel[]).map((d) => ({ ...d }));
    this.data.deans = (deansSeed as unknown as DeanModel[]).map((d) => ({ ...d }));
    this.data.hods = (hodsSeed as unknown as HodModel[]).map((h) => ({ ...h }));
    this.data.courses = (coursesSeed as unknown as CourseModel[]).map((c) => ({ ...c }));
    this.data.lecturers = (lecturersSeed as unknown as LecturerModel[]).map((l) => ({ ...l }));
    this.data.modules = (modulesSeed as unknown as ModuleModel[]).map((m) => ({ ...m }));
    this.data.moduleDelegations = (moduleDelegationsSeed as unknown as ModuleDelegationModel[]).map((d) => ({ ...d }));
    this.data.proxyAssignments = (proxyAssignmentsSeed as unknown as ProxyAssignmentModel[]).map((p) => ({ ...p }));
    this.data.tutors = (tutorsSeed as unknown as TutorModel[]).map((t) => ({
      ...t,
      yearLevel: t.yearLevel ?? 3,
      totalLoggedHours: t.totalLoggedHours ?? 0,
    }));
    this.data.auditLogs = [];
    this.data.classRegisters = [];
    this.data.testSessions = [];
    this.data.testMarks = [];
    this.data.testRegisters = [];
    this.data.tutorTimesheets = [];
    this.data.attendanceSessions = (attendanceSessionsSeed as unknown as AttendanceSessionModel[]).map((s) => ({
      ...s,
      startedByRole: s.startedByRole ?? "lecturer",
      startedById: s.startedById ?? s.lecturerId,
    }));
    this.data.attendanceRecords = (attendanceRecordsSeed as unknown as AttendanceRecordModel[]).map((r) => ({ ...r }));

    const baseStudents = (studentsSeed as unknown as StudentModel[]).map((s) => ({
      yearLevel: s.yearLevel ?? 2,
      cardBarcode: s.cardBarcode ?? studentCardBarcodeValue(s),
      ...s,
    }));
    const numbers = new Set(baseStudents.map((s) => s.studentNumber));
    const synthetic = generateSyntheticStudents({
      courses: this.data.courses,
      existingStudentNumbers: numbers,
      targetExtra: SYNTHETIC_STUDENT_TARGET,
    });
    this.data.students = [...baseStudents, ...synthetic];
    populateDemoRegistersAndTests(this.data);
  }

  create<K extends MockCollectionName, T extends MockCollections[K][number]>(
    collection: K,
    doc: Omit<T, "id"> & Partial<Pick<T, "id">>
  ): T {
    const created = { ...doc, id: (doc as T).id ?? id(collection) } as T;
    this.data[collection].push(created as never);
    return created;
  }

  read<K extends MockCollectionName, T extends MockCollections[K][number]>(collection: K, docId: string): T | null {
    const found = (this.data[collection] as T[]).find((d) => d.id === docId);
    return found ? ({ ...found } as T) : null;
  }

  update<K extends MockCollectionName, T extends MockCollections[K][number]>(collection: K, docId: string, patch: Partial<T>): T {
    const idx = (this.data[collection] as T[]).findIndex((d) => d.id === docId);
    if (idx < 0) throw new Error(`Not found: ${collection}/${docId}`);
    const current = (this.data[collection] as T[])[idx];
    const updated = { ...current, ...patch } as T;
    (this.data[collection] as T[])[idx] = updated;
    return { ...updated };
  }

  delete<K extends MockCollectionName>(collection: K, docId: string): boolean {
    const before = (this.data[collection] as AnyRecord[]).length;
    const next = (this.data[collection] as AnyRecord[]).filter((d) => d.id !== docId);
    (this.data[collection] as AnyRecord[]) = next;
    return next.length !== before;
  }

  list<K extends MockCollectionName, T extends MockCollections[K][number]>(collection: K): T[] {
    return (this.data[collection] as T[]).map((x) => ({ ...x }));
  }

  query<K extends MockCollectionName, T extends MockCollections[K][number]>(collection: K, where: Query<T>): T[] {
    let results = (this.data[collection] as T[]).filter((row) => matches(row, where));
    if (where.orderBy) {
      const k = where.orderBy;
      results = [...results].sort((a, b) => {
        const av = a[k];
        const bv = b[k];
        if (av === bv) return 0;
        const dir = where.order === "desc" ? -1 : 1;
        return av > bv ? dir : -dir;
      });
    }
    if (where.limit != null) results = results.slice(0, where.limit);
    return results.map((x) => ({ ...x }));
  }

  expireSessions() {
    const now = Date.now();
    for (const s of this.data.attendanceSessions) {
      if (s.active && new Date(s.expiresAt).getTime() <= now) {
        s.active = false;
      }
    }
  }

  touch() {
    this.expireSessions();
    return nowIso();
  }
}

export const mockDB = new InMemoryMockDB();
