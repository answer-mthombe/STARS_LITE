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
  // Expo Device doesn't guarantee stable unique ID cross-platform in all cases,
  // but for the simulation it's enough. Later swap to Firebase + secure device binding.
  return `${Device.osName ?? "unknown"}_${Device.modelName ?? "device"}_${Date.now().toString(16)}`;
}

// Simulation credentials:
// - Lecturer: email in lecturers.json, password: "password"
// - Student: email auto-generated, password: "password"
// - Admin: admin@mut.ac.za / password
export const mockAuthService = {
  async login(args: { role: UserRole; email: string; password: string }): Promise<AuthUser> {
    const email = args.email.trim().toLowerCase();
    if (args.password !== "password") throw new Error("Invalid credentials.");

    if (args.role === "admin") {
      if (email !== "admin@mut.ac.za") throw new Error("Admin account not found.");
      return { role: "admin", id: "admin_1", email, fullName: "MUT Admin" };
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

    const student: StudentModel = mockDB.create("students", {
      fullName: args.fullName.trim(),
      studentNumber,
      gender: args.gender,
      email,
      facultyId: args.facultyId,
      courseId: args.courseId,
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

