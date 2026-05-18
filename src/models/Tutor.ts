import type { WithTimestamps } from "./common";

/**
 * Tutor — always a **senior student** from `students` (same person, elevated role).
 * Helps junior students understand concepts; paid by institution per logged hours.
 */
export interface TutorModel extends WithTimestamps {
  id: string;
  /** Source of truth — tutor is never a separate person */
  studentId: string;
  fullName: string;
  email: string;
  facultyId: string;
  departmentId?: string | null;
  yearLevel: number;
  /** Modules where module-tutor class assistance is active */
  moduleIds: string[];
  /** Cumulative hours submitted for payroll */
  totalLoggedHours: number;
}
