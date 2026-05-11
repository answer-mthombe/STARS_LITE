import type { WithTimestamps } from "./common";

export interface CourseModel extends WithTimestamps {
  id: string;
  facultyId: string;
  courseName: string;
  modules: string[]; // module ids
}

