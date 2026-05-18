export interface ModuleModel {
  id: string;
  moduleCode: string;
  moduleName: string;
  /** Primary module lecturer */
  lecturerId: string;
  /** Optional co-lecturers */
  coLecturerIds?: string[];
  /** Student tutors (also in `enrolledStudents`) — sync with `moduleDelegations` */
  tutorIds?: string[];
  classCode: string;
  enrolledStudents: string[]; // student ids
  pendingRequests: string[]; // student ids
  activeSessionId?: string | null;
  courseId?: string | null;
}

