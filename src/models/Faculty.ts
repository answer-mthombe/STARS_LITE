import type { WithTimestamps } from "./common";

export interface FacultyModel extends WithTimestamps {
  id: string;
  facultyName: string;
  /** Linked dean account id (mock `deans` collection) */
  deanId?: string | null;
  /** Denormalised department ids — optional; can derive from `departments` query */
  departmentIds?: string[];
}

