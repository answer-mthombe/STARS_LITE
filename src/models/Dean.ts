import type { WithTimestamps } from "./common";

/** Dean — exactly one faculty */
export interface DeanModel extends WithTimestamps {
  id: string;
  fullName: string;
  email: string;
  facultyId: string;
}
