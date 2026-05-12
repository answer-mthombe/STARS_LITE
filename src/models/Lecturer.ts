import type { WithTimestamps } from "./common";

export interface LecturerModel extends WithTimestamps {
  id: string;
  fullName: string;
  email: string;
  facultyId: string;
  departmentId: string;
  modules: string[]; // module ids
}

