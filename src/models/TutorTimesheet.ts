import type { ISODateString, WithTimestamps } from "./common";

/**
 * Institution payroll log — tutors are paid by hours worked.
 * Created when a class register is finalised or test invigilation ends.
 */
export interface TutorTimesheetModel extends WithTimestamps {
  id: string;
  tutorStudentId: string;
  tutorName: string;
  /** class | test */
  workType: "class" | "test";
  referenceId: string;
  moduleId: string;
  moduleCode: string;
  startedAt: ISODateString;
  endedAt: ISODateString;
  hoursWorked: number;
  submitted: boolean;
  submittedAt?: ISODateString | null;
}
