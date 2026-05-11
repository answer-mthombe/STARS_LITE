export interface ModuleModel {
  id: string;
  moduleCode: string;
  moduleName: string;
  lecturerId: string;
  classCode: string;
  enrolledStudents: string[]; // student ids
  pendingRequests: string[]; // student ids
  activeSessionId?: string | null;
  courseId?: string | null;
}

