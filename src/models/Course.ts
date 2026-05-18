import type { WithTimestamps } from "./common";

export interface CourseModel extends WithTimestamps {
  id: string;
  facultyId: string;
  /** Department that owns this qualification stream */
  departmentId: string;
  courseName: string;
  modules: string[]; // module ids
  /** Denormalised for course-scoped queries */
  lecturerIds?: string[];
  studentIds?: string[];
}

