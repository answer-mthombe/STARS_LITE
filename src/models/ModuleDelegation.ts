import type { WithTimestamps } from "./common";
import type { AttendanceCapability } from "@/types/capabilities";

/**
 * Per-module, per-day (or open-ended) delegation from lecturer.
 * - `tutor`: student with tutor privileges (also enrolled)
 * - `student_registrar`: class rep marks roll / starts session when class runs itself
 */
export type ModuleDelegateType = "tutor" | "student_registrar";

export interface ModuleDelegationModel extends WithTimestamps {
  id: string;
  moduleId: string;
  courseId?: string | null;
  grantedByLecturerId: string;
  delegateType: ModuleDelegateType;
  /** Student id (tutors are always linked to a student record) */
  delegateStudentId: string;
  capabilities: AttendanceCapability[];
  active: boolean;
  /** Optional: limit to a single calendar day (ISO date YYYY-MM-DD) */
  effectiveDate?: string | null;
  /** Optional: tie to one session only */
  sessionId?: string | null;
  expiresAt?: string | null;
}
