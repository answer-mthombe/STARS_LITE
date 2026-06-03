import type { ISODateString, WithTimestamps } from "./common";
import type { InstitutionRole } from "@/types/roles";

export type TestSessionStatus = "active" | "awaiting_lecturer_confirm" | "closed";

export type InvigilatorScanSide = "left" | "right" | "any";

/** One invigilator on a test — lecturer or any student tutor (not module-fixed) */
export interface TestInvigilator {
  personId: string;
  role: "lecturer" | "tutor";
  fullName: string;
  canScan: boolean;
  scanSide: InvigilatorScanSide;
}

export interface TestSessionModel extends WithTimestamps {
  id: string;
  moduleId: string;
  moduleCode: string;
  moduleName: string;
  title: string;
  lecturerId: string;
  status: TestSessionStatus;
  invigilators: TestInvigilator[];
  startedAt: ISODateString;
  endedAt?: ISODateString | null;
  lecturerConfirmedAt?: ISODateString | null;
  /** Set when lecturer confirms — tutors can then print */
  registerId?: string | null;
}

export interface TestMarkModel {
  id: string;
  testSessionId: string;
  studentId: string;
  studentNumber: string;
  fullName: string;
  markedByPersonId: string;
  markedByRole: InstitutionRole;
  method: "barcode" | "manual";
  timestamp: ISODateString;
}

export interface TestRegisterStudentRow {
  studentId: string;
  studentNumber: string;
  fullName: string;
  present: boolean;
  markedBy?: string | null;
  method?: "barcode" | "manual" | null;
}

export interface TestRegisterModel extends WithTimestamps {
  id: string;
  testSessionId: string;
  moduleId: string;
  moduleCode?: string | null;
  moduleName?: string | null;
  title: string;
  invigilatorNames: string[];
  lecturerName: string;
  startedAt: ISODateString;
  endedAt: ISODateString;
  students: TestRegisterStudentRow[];
  pdfUri?: string | null;
  htmlSnapshot?: string | null;
}
