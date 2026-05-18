import type { WithTimestamps } from "./common";

/** Faculty secretary — may receive dean-approved proxy for faculty operations */
export interface FacultySecretaryModel extends WithTimestamps {
  id: string;
  fullName: string;
  email: string;
  facultyId: string;
  active: boolean;
}
