import type { ISODateString } from "./common";

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

/** Who started or runs the session (lecturer, tutor, or delegated student registrar) */
export type SessionHostRole = "lecturer" | "tutor" | "student_registrar";

export interface AttendanceSessionModel {
  id: string;
  moduleId: string;
  /** Owning lecturer for the module (audit trail) */
  lecturerId: string;
  /** Person who actually started the session */
  startedByRole: SessionHostRole;
  startedById: string;
  lecturerLocation: GeoPoint;
  createdAt: ISODateString;
  expiresAt: ISODateString;
  active: boolean;
  radius: number;
  algorithmSeed: string;
  /** Set when class register is finalised */
  endedAt?: ISODateString | null;
  /** Tutor student ids who confirmed class end */
  tutorEndConfirmations?: string[];
  classRegisterId?: string | null;
}

export interface AttendanceRecordModel {
  id: string;
  sessionId: string;
  studentId: string;
  timestamp: ISODateString;
  distance: number;
  verified: boolean;
}

