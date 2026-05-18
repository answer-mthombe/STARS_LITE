import type { UserRole } from "@/types/roles";
import type { InstitutionCapability } from "@/types/capabilities";

/**
 * Firestore document shape for `userProfiles/{uid}` (uid = Firebase Auth UID).
 */
export interface FirebaseUserProfileDoc {
  id: string;
  role: UserRole;
  email: string;
  /** Points to person doc (`students`, `lecturers`, `deans`, `hods`, `tutors`, etc.) */
  linkedPersonId?: string | null;
  facultyId?: string | null;
  departmentId?: string | null;
  courseId?: string | null;
  /** For tutors: always links back to student record */
  linkedStudentId?: string | null;
  /** Admin-granted extras beyond base role */
  grantedCapabilities?: InstitutionCapability[];
  /** Active proxy assignment ids */
  activeProxyIds?: string[];
  /** Module ids where user has tutor or registrar delegation */
  delegatedModuleIds?: string[];
  updatedAt: string;
}
