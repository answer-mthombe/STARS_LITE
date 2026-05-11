import studentsSeed from "./students.json";
import lecturersSeed from "./lecturers.json";
import facultiesSeed from "./faculties.json";
import coursesSeed from "./courses.json";
import modulesSeed from "./modules.json";
import attendanceSessionsSeed from "./attendanceSessions.json";
import attendanceRecordsSeed from "./attendanceRecords.json";

import type { StudentModel } from "@/models/Student";
import type { LecturerModel } from "@/models/Lecturer";
import type { FacultyModel } from "@/models/Faculty";
import type { CourseModel } from "@/models/Course";
import type { ModuleModel } from "@/models/Module";
import type { AttendanceRecordModel, AttendanceSessionModel } from "@/models/Attendance";

export type MockCollectionName =
  | "students"
  | "lecturers"
  | "faculties"
  | "courses"
  | "modules"
  | "attendanceSessions"
  | "attendanceRecords";

export type MockCollections = {
  students: StudentModel[];
  lecturers: LecturerModel[];
  faculties: FacultyModel[];
  courses: CourseModel[];
  modules: ModuleModel[];
  attendanceSessions: AttendanceSessionModel[];
  attendanceRecords: AttendanceRecordModel[];
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
    };
    this.seedInitialData();
  }

  seedInitialData() {
    this.data.students = (studentsSeed as unknown as StudentModel[]).map((s) => ({ ...s }));
    this.data.lecturers = (lecturersSeed as unknown as LecturerModel[]).map((l) => ({ ...l }));
    this.data.faculties = (facultiesSeed as unknown as FacultyModel[]).map((f) => ({ ...f }));
    this.data.courses = (coursesSeed as unknown as CourseModel[]).map((c) => ({ ...c }));
    this.data.modules = (modulesSeed as unknown as ModuleModel[]).map((m) => ({ ...m }));
    this.data.attendanceSessions = (attendanceSessionsSeed as unknown as AttendanceSessionModel[]).map((s) => ({ ...s }));
    this.data.attendanceRecords = (attendanceRecordsSeed as unknown as AttendanceRecordModel[]).map((r) => ({ ...r }));
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

  // Convenience helpers for session expiry without “backend”
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

