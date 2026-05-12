import * as Device from "expo-device";

import { mockDB } from "@/mockDB/mockDBService";
import { useMockDbVersionStore } from "@/store/mockDbVersionStore";
import type { AuthUser } from "@/store/authStore";
import type { UserRole } from "@/types/roles";
import type { StudentModel } from "@/models/Student";

function buildStudentEmail(studentNumber: string) {
  return `${studentNumber}@live.mut.ac.za`.toLowerCase();
}

function deviceIdFallback() {
  return `${Device.osName ?? "unknown"}_${Device.modelName ?? "device"}_${Date.now().toString(16)}`;
}

/**
 * Simulation credentials (password for all demo accounts): `password`
 * - Admin: admin@mut.ac.za
 * - Dean: dean.engineering@mut.ac.za | dean.management@mut.ac.za
 * - HOD: hod.it@mut.ac.za | hod.electrical@mut.ac.za | hod.business@mut.ac.za
 * - Lecturer: emails from lecturers.json
 * - Student: *@live.mut.ac.za from students (seed + synthetic)
 */
export const mockAuthService = {
  async login(args: { role: UserRole; email: string; password: string }): Promise<AuthUser> {
    const email = args.email.trim().toLowerCase();
    if (args.password !== "password") throw new Error("Invalid credentials.");

    if (args.role === "admin") {
      if (email !== "admin@mut.ac.za") throw new Error("Admin account not found.");
      return { role: "admin", id: "admin_1", email, fullName: "MUT System Administrator" };
    }

    if (args.role === "dean") {
      const dean = mockDB.query("deans", { email })[0];
      if (!dean) throw new Error("Dean account not found.");
      return { role: "dean", id: dean.id, email: dean.email, fullName: dean.fullName, facultyId: dean.facultyId };
    }

    if (args.role === "hod") {
      const hod = mockDB.query("hods", { email })[0];
      if (!hod) throw new Error("HOD account not found.");
      return { role: "hod", id: hod.id, email: hod.email, fullName: hod.fullName, departmentId: hod.departmentId };
    }

    if (args.role === "lecturer") {
      const lecturer = mockDB.query("lecturers", { email })[0];
      if (!lecturer) throw new Error("Lecturer not found.");
      return { role: "lecturer", id: lecturer.id, email: lecturer.email, fullName: lecturer.fullName };
    }

    const student = mockDB.query("students", { email })[0];
    if (!student) throw new Error("Student not found.");
    return { role: "student", id: student.id, email: student.email, fullName: student.fullName };
  },

  async registerStudent(args: {
    fullName: string;
    studentNumber: string;
    gender: "male" | "female" | "other";
    facultyId: string;
    courseId: string;
    password: string;
  }): Promise<AuthUser> {
    if (args.password.length < 6) throw new Error("Password must be at least 6 characters.");

    const studentNumber = args.studentNumber.trim();
    const email = buildStudentEmail(studentNumber);

    const existing = mockDB.query("students", { studentNumber })[0] ?? mockDB.query("students", { email })[0];
    if (existing) throw new Error("Student already exists.");

    const course = mockDB.read("courses", args.courseId);
    const departmentId = course?.departmentId;

    const student: StudentModel = mockDB.create("students", {
      fullName: args.fullName.trim(),
      studentNumber,
      gender: args.gender,
      email,
      facultyId: args.facultyId,
      courseId: args.courseId,
      ...(departmentId ? { departmentId } : {}),
      registeredModules: [],
      attendanceStats: { totalSessions: 0, attended: 0, absent: 0, attendanceRate: 0 },
      profileImage: null,
      deviceId: deviceIdFallback(),
      createdAt: new Date().toISOString(),
    });

    useMockDbVersionStore.getState().bump();
    return { role: "student", id: student.id, email: student.email, fullName: student.fullName };
  },
};
