import type { ISODateString } from "./common";

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface AttendanceSessionModel {
  id: string;
  moduleId: string;
  lecturerId: string;
  lecturerLocation: GeoPoint;
  createdAt: ISODateString;
  expiresAt: ISODateString;
  active: boolean;
  radius: number;
  algorithmSeed: string;
}

export interface AttendanceRecordModel {
  id: string;
  sessionId: string;
  studentId: string;
  timestamp: ISODateString;
  distance: number;
  verified: boolean;
}

