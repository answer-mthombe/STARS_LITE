import type { ISODateString, WithTimestamps } from "./common";

export interface ClassRegisterStudentRow {
  studentId: string;
  studentNumber: string;
  fullName: string;
  present: boolean;
  markedAt?: ISODateString | null;
}

/** Official class attendance register — generated when class ends */
export interface ClassRegisterModel extends WithTimestamps {
  id: string;
  sessionId: string;
  moduleId: string;
  moduleCode: string;
  moduleName: string;
  /** Senior students (from `students`) who assisted this class */
  tutorStudentIds: string[];
  tutorNames: string[];
  lecturerId: string;
  lecturerName: string;
  startedAt: ISODateString;
  endedAt: ISODateString;
  durationMinutes: number;
  students: ClassRegisterStudentRow[];
  confirmedByTutorStudentIds: string[];
  confirmedByLecturer: boolean;
  /** Local/cache path or base64 — mock stores HTML; device stores file URI after print */
  pdfUri?: string | null;
  htmlSnapshot?: string | null;
}
