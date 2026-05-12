import { mockDB } from "@/mockDB/mockDBService";
import type { AuthUser } from "@/store/authStore";
import type { ModuleModel } from "@/models/Module";

function overallAttendanceRate(): number {
  const students = mockDB.list("students");
  if (!students.length) return 0;
  const sum = students.reduce((acc, s) => acc + (s.attendanceStats?.attendanceRate ?? 0), 0);
  return sum / students.length;
}

function modulesForLecturer(lecturerId: string): ModuleModel[] {
  return mockDB.list("modules").filter((m) => m.lecturerId === lecturerId);
}

/** Scoped aggregates for dashboards — mock DB only; mirror queries in Firestore later. */
export const institutionAnalytics = {
  universityOverview() {
    mockDB.touch();
    const students = mockDB.list("students");
    const records = mockDB.list("attendanceRecords");
    const sessions = mockDB.list("attendanceSessions");
    const faculties = mockDB.list("faculties");
    const departments = mockDB.list("departments");
    const rate = overallAttendanceRate();
    const lowAttendanceStudents = students.filter((s) => (s.attendanceStats?.attendanceRate ?? 1) < 0.6).length;

    return {
      totalStudents: students.length,
      totalLecturers: mockDB.list("lecturers").length,
      totalFaculties: faculties.length,
      totalDepartments: departments.length,
      totalCourses: mockDB.list("courses").length,
      overallAttendanceRate: rate,
      totalAttendanceRecords: records.length,
      activeSessions: sessions.filter((s) => s.active && new Date(s.expiresAt).getTime() > Date.now()).length,
      lowAttendanceAlerts: lowAttendanceStudents,
      facultyPerformance: faculties.map((f) => {
        const deptIds = mockDB.list("departments").filter((d) => d.facultyId === f.id).map((d) => d.id);
        const courseIds = mockDB.list("courses").filter((c) => deptIds.includes(c.departmentId)).map((c) => c.id);
        const mods = mockDB.list("modules").filter((m) => courseIds.includes(m.courseId ?? ""));
        const stu = students.filter((stu) => stu.facultyId === f.id);
        const avg =
          stu.length === 0 ? 0 : stu.reduce((a, x) => a + (x.attendanceStats?.attendanceRate ?? 0), 0) / stu.length;
        return { facultyId: f.id, facultyName: f.facultyName, studentCount: stu.length, avgAttendance: avg, moduleCount: mods.length };
      }),
    };
  },

  facultyOverview(facultyId: string) {
    mockDB.touch();
    const departments = mockDB.list("departments").filter((d) => d.facultyId === facultyId);
    const courseIds = mockDB
      .list("courses")
      .filter((c) => c.facultyId === facultyId)
      .map((c) => c.id);
    const students = mockDB.list("students").filter((s) => s.facultyId === facultyId);
    const mods = mockDB.list("modules").filter((m) => courseIds.includes(m.courseId ?? ""));
    const lecturerIds = new Set(mockDB.list("lecturers").filter((l) => l.facultyId === facultyId).map((l) => l.id));
    const sessions = mockDB
      .list("attendanceSessions")
      .filter((sess) => mods.some((m) => m.id === sess.moduleId && lecturerIds.has(sess.lecturerId)));
    const rate =
      students.length === 0
        ? 0
        : students.reduce((a, s) => a + (s.attendanceStats?.attendanceRate ?? 0), 0) / students.length;

    const deptStats = departments.map((d) => {
      const dcourses = mockDB.list("courses").filter((c) => c.departmentId === d.id);
      const dstu = students.filter((s) => dcourses.some((c) => c.id === s.courseId));
      const davg =
        dstu.length === 0 ? 0 : dstu.reduce((a, s) => a + (s.attendanceStats?.attendanceRate ?? 0), 0) / dstu.length;
      return { departmentId: d.id, name: d.departmentName, avgAttendance: davg, studentCount: dstu.length };
    });

    const lowDepts = deptStats.filter((x) => x.avgAttendance < 0.65 && x.studentCount > 0);

    return {
      facultyId,
      facultyAttendancePct: rate * 100,
      departmentStats: deptStats,
      lecturerPerformance: mockDB
        .list("lecturers")
        .filter((l) => l.facultyId === facultyId)
        .map((lec) => {
          const ms = modulesForLecturer(lec.id);
          const rec = mockDB.list("attendanceRecords").filter((r) => {
            const sess = mockDB.read("attendanceSessions", r.sessionId);
            return sess && ms.some((m) => m.id === sess.moduleId);
          });
          return { lecturerId: lec.id, name: lec.fullName, modulesTaught: ms.length, marksRecorded: rec.length };
        }),
      activeSessions: sessions.filter((s) => s.active && new Date(s.expiresAt).getTime() > Date.now()).length,
      lowPerformingDepartments: lowDepts,
    };
  },

  departmentOverview(departmentId: string) {
    mockDB.touch();
    const dept = mockDB.read("departments", departmentId);
    const courses = mockDB.list("courses").filter((c) => c.departmentId === departmentId);
    const courseIds = courses.map((c) => c.id);
    const mods = mockDB.list("modules").filter((m) => courseIds.includes(m.courseId ?? ""));
    const students = mockDB.list("students").filter((s) => courseIds.includes(s.courseId));
    const rate =
      students.length === 0
        ? 0
        : students.reduce((a, s) => a + (s.attendanceStats?.attendanceRate ?? 0), 0) / students.length;

    const atRisk = students.filter((s) => (s.attendanceStats?.attendanceRate ?? 1) < 0.55);

    return {
      departmentId,
      departmentName: dept?.departmentName ?? "Department",
      attendanceRate: rate,
      moduleStats: mods.map((m) => ({
        moduleId: m.id,
        code: m.moduleCode,
        name: m.moduleName,
        enrolled: m.enrolledStudents.length,
      })),
      coursePerformance: courses.map((c) => ({
        courseId: c.id,
        name: c.courseName,
        modules: c.modules.length,
      })),
      lecturerPerformance: mockDB
        .list("lecturers")
        .filter((l) => l.departmentId === departmentId)
        .map((l) => ({
          id: l.id,
          name: l.fullName,
          modules: modulesForLecturer(l.id).length,
        })),
      studentInsights: { total: students.length, atRiskCount: atRisk.length },
      riskAlerts: atRisk.slice(0, 8).map((s) => ({ studentId: s.id, name: s.fullName, rate: s.attendanceStats.attendanceRate })),
    };
  },

  lecturerScoped(lecturerId: string) {
    mockDB.touch();
    const mods = modulesForLecturer(lecturerId);
    const sessions = mockDB
      .list("attendanceSessions")
      .filter((s) => mods.some((m) => m.id === s.moduleId));
    return {
      assignedModules: mods,
      activeSessions: sessions.filter((s) => s.active && new Date(s.expiresAt).getTime() > Date.now()),
      attendanceRatesByModule: mods.map((m) => {
        const sessIds = sessions.filter((x) => x.moduleId === m.id).map((x) => x.id);
        const rec = mockDB.list("attendanceRecords").filter((r) => sessIds.includes(r.sessionId));
        const denom = Math.max(m.enrolledStudents.length, 1);
        return { moduleId: m.id, code: m.moduleCode, participation: rec.length / denom };
      }),
    };
  },

  studentScoped(studentId: string) {
    mockDB.touch();
    const stu = mockDB.read("students", studentId);
    return {
      student: stu,
      attendanceRate: stu?.attendanceStats.attendanceRate ?? 0,
    };
  },

  forUser(user: AuthUser | null) {
    if (!user) return { scope: "none" as const, payload: null };
    if (user.role === "admin") return { scope: "university" as const, payload: this.universityOverview() };
    if (user.role === "dean") return { scope: "faculty" as const, payload: this.facultyOverview(user.facultyId) };
    if (user.role === "hod") return { scope: "department" as const, payload: this.departmentOverview(user.departmentId) };
    if (user.role === "lecturer") return { scope: "lecturer" as const, payload: this.lecturerScoped(user.id) };
    return { scope: "student" as const, payload: this.studentScoped(user.id) };
  },
};
