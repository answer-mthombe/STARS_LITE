import type { WithTimestamps } from "./common";

export interface FacultyModel extends WithTimestamps {
  id: string;
  facultyName: string;
  /** Linked dean account id (mock `deans` collection) */
  deanId?: string | null;
  /** Faculty secretary — operational support; may hold dean-approved proxy */
  secretaryId?: string | null;
  /** Acting dean when primary dean unavailable (`deans` or proxy grantee) */
  actingDeanId?: string | null;
  /** Denormalised department ids — optional; can derive from `departments` query */
  departmentIds?: string[];
}

