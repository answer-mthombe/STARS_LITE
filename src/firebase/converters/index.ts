import type { StudentModel } from "@/models/Student";
import type { LecturerModel } from "@/models/Lecturer";
import type { ModuleModel } from "@/models/Module";
import type { CourseModel } from "@/models/Course";
import type { FacultyModel } from "@/models/Faculty";
import type { AttendanceSessionModel, AttendanceRecordModel } from "@/models/Attendance";
import { idBasedConverter } from "./idBasedConverter";
import { userProfileConverter } from "./userProfileConverter";

export const studentConverter = idBasedConverter<StudentModel>();
export const lecturerConverter = idBasedConverter<LecturerModel>();
export const moduleConverter = idBasedConverter<ModuleModel>();
export const courseConverter = idBasedConverter<CourseModel>();
export const facultyConverter = idBasedConverter<FacultyModel>();
export const attendanceSessionConverter = idBasedConverter<AttendanceSessionModel>();
export const attendanceRecordConverter = idBasedConverter<AttendanceRecordModel>();
export { userProfileConverter };
