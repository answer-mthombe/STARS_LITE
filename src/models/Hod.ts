import type { WithTimestamps } from "./common";

/** Head of Department — exactly one department */
export interface HodModel extends WithTimestamps {
  id: string;
  fullName: string;
  email: string;
  departmentId: string;
}
