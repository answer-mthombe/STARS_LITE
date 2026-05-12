import type { WithTimestamps } from "./common";

/**
 * Academic department under a faculty (e.g. IT under Engineering).
 * `lecturerIds` / `courseIds` mirror Firestore-friendly denormalisation; can also be derived by query.
 */
export interface DepartmentModel extends WithTimestamps {
  id: string;
  departmentName: string;
  facultyId: string;
  hodId: string | null;
  lecturerIds: string[];
  courseIds: string[];
}
