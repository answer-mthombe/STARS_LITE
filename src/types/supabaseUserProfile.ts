import type { UserRole } from "@/types/roles";
import type { InstitutionCapability } from "@/types/capabilities";

/**
 * Postgres row shape for `user_profiles` (id = Supabase Auth user id).
 */
export interface SupabaseUserProfileDoc {
  id: string;
  role: UserRole;
  email: string;
  /** Points to person row (`students`, `lecturers`, `deans`, `hods`, `tutors`, etc.) */
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
