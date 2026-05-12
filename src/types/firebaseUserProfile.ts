import type { UserRole } from "@/types/roles";

/**
 * Firestore document shape for `userProfiles/{uid}` (uid = Firebase Auth UID).
 * Your team extends fields during milestone M2 (faculty, display name, etc.).
 */
export interface FirebaseUserProfileDoc {
  id: string;
  role: UserRole;
  email: string;
  /** Points to person doc (`students`, `lecturers`, `deans`, `hods`, etc.) when applicable */
  linkedPersonId?: string | null;
  facultyId?: string | null;
  departmentId?: string | null;
  updatedAt: string;
}
