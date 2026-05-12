import type { CourseModel } from "@/models/Course";
import type { StudentModel } from "@/models/Student";

const FIRST = [
  "Amahle",
  "Thabo",
  "Zinhle",
  "Sipho",
  "Nomsa",
  "Bandile",
  "Lungile",
  "Mpendulo",
  "Ayanda",
  "Kwanele",
  "Ntombi",
  "Sibusiso",
  "Olwethu",
  "Philani",
  "Samkelo",
];
const LAST = [
  "Dlamini",
  "Khumalo",
  "Mthembu",
  "Nkosi",
  "Zulu",
  "Cele",
  "Ndlovu",
  "Shabalala",
  "Buthelezi",
  "Moya",
  "Nzimande",
  "Gwala",
  "Sithole",
  "Radebe",
  "Petersen",
];

const BASE_NUM = 22600001;

/** Adds ~`targetExtra` synthetic students spread across courses for realistic hierarchy demos. */
export function generateSyntheticStudents(args: {
  courses: CourseModel[];
  existingStudentNumbers: Set<string>;
  targetExtra: number;
}): StudentModel[] {
  const { courses, existingStudentNumbers, targetExtra } = args;
  if (!courses.length || targetExtra <= 0) return [];

  const out: StudentModel[] = [];

  for (let i = 0; i < targetExtra; i++) {
    const studentNumber = String(BASE_NUM + i);
    if (existingStudentNumbers.has(studentNumber)) continue;
    existingStudentNumbers.add(studentNumber);

    const course = courses[i % courses.length]!;
    const fn = FIRST[i % FIRST.length]!;
    const ln = LAST[(i + 3) % LAST.length]!;
    const gender = (["female", "male", "other"] as const)[i % 3]!;
    const attended = 4 + (i % 6);
    const absent = 10 - attended;
    const rate = attended / 10;

    out.push({
      id: `stu_sim_${studentNumber}`,
      fullName: `${fn} ${ln}`,
      studentNumber,
      gender,
      email: `${studentNumber}@live.mut.ac.za`,
      facultyId: course.facultyId,
      departmentId: course.departmentId,
      courseId: course.id,
      registeredModules: course.modules.slice(0, Math.min(2, course.modules.length)),
      attendanceStats: {
        totalSessions: 10,
        attended,
        absent,
        attendanceRate: rate,
      },
      profileImage: null,
      deviceId: `sim_${studentNumber}`,
      createdAt: new Date(Date.now() - i * 3600_000).toISOString(),
    });
  }

  return out;
}
