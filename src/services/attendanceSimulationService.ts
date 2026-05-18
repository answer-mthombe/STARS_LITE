import * as Crypto from "expo-crypto";

import { mockDB } from "@/mockDB/mockDBService";
import { haversineMeters } from "@/utils/haversine";
import { verifyAttendanceCode } from "@/utils/rotatingCode";
import type { AttendanceSessionModel, SessionHostRole } from "@/models/Attendance";
import { useMockDbVersionStore } from "@/store/mockDbVersionStore";
import { delegationService } from "@/services/delegationService";
import { canStartModuleSession } from "@/permissions/delegationPermissions";
import type { InstitutionRole } from "@/types/roles";

function bump() {
  useMockDbVersionStore.getState().bump();
}

export const attendanceSimulationService = {
  async createSession(args: {
    moduleId: string;
    hostRole: SessionHostRole;
    hostId: string;
    /** Owning lecturer id for audit (defaults from module) */
    lecturerId?: string;
    latitude: number;
    longitude: number;
    radiusMeters?: number;
    durationMinutes?: number;
  }): Promise<AttendanceSessionModel> {
    mockDB.touch();
    const mod = mockDB.read("modules", args.moduleId);
    if (!mod) throw new Error("Module not found.");

    const lecturerId = args.lecturerId ?? mod.lecturerId;
    const delegations = delegationService.listModuleDelegations(args.moduleId);

    const roleForCheck: InstitutionRole =
      args.hostRole === "lecturer" ? "lecturer" : args.hostRole === "tutor" ? "tutor" : "student";

    const allowed =
      args.hostRole === "lecturer"
        ? mod.lecturerId === args.hostId || mod.coLecturerIds?.includes(args.hostId)
        : canStartModuleSession({
            role: roleForCheck,
            personId: args.hostId,
            module: mod,
            delegations,
          });

    if (!allowed) throw new Error("You are not authorised to start this session.");

    const radius = args.radiusMeters ?? 40;
    const mins = args.durationMinutes ?? 20;
    const now = Date.now();
    const seed = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${args.moduleId}:${now}:${Math.random().toString(16)}`
    );
    const shortSeed = seed.slice(0, 16);

    const session = mockDB.create("attendanceSessions", {
      moduleId: args.moduleId,
      lecturerId,
      startedByRole: args.hostRole,
      startedById: args.hostId,
      lecturerLocation: { latitude: args.latitude, longitude: args.longitude },
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + mins * 60_000).toISOString(),
      active: true,
      radius,
      algorithmSeed: shortSeed,
    });

    mockDB.update("modules", args.moduleId, { activeSessionId: session.id });
    mockDB.create("auditLogs", {
      action: "session.started",
      actorRole: roleForCheck,
      actorPersonId: args.hostId,
      scopeType: "module",
      scopeId: args.moduleId,
      metadata: { sessionId: session.id, hostRole: args.hostRole },
      createdAt: new Date().toISOString(),
    });
    bump();
    return session;
  },

  /** @deprecated Use createSession with hostRole/hostId — kept for lecturer screens */
  async createSessionAsLecturer(args: {
    moduleId: string;
    lecturerId: string;
    latitude: number;
    longitude: number;
    radiusMeters?: number;
    durationMinutes?: number;
  }): Promise<AttendanceSessionModel> {
    return this.createSession({
      ...args,
      hostRole: "lecturer",
      hostId: args.lecturerId,
      lecturerId: args.lecturerId,
    });
  },

  markAttendance(args: {
    sessionId: string;
    studentId: string;
    studentLat: number;
    studentLng: number;
    codeEntered: string;
  }): { ok: true } | { ok: false; reason: string } {
    mockDB.touch();
    const session = mockDB.read("attendanceSessions", args.sessionId);
    if (!session || !session.active) return { ok: false, reason: "Session not active or missing." };
    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      mockDB.update("attendanceSessions", args.sessionId, { active: false });
      bump();
      return { ok: false, reason: "Session expired." };
    }

    const mod = mockDB.read("modules", session.moduleId);
    if (!mod || !mod.enrolledStudents.includes(args.studentId)) {
      return { ok: false, reason: "You are not enrolled in this module." };
    }

    const dup = mockDB
      .query("attendanceRecords", { sessionId: args.sessionId })
      .find((r) => r.studentId === args.studentId);
    if (dup) return { ok: false, reason: "Attendance already recorded." };

    const v = verifyAttendanceCode(session.algorithmSeed, args.codeEntered);
    if (!v.ok) return { ok: false, reason: "Invalid attendance code." };

    const distance = haversineMeters(
      { latitude: args.studentLat, longitude: args.studentLng },
      session.lecturerLocation
    );
    if (distance > session.radius) {
      return { ok: false, reason: `Too far from class (${Math.round(distance)}m / max ${session.radius}m).` };
    }

    mockDB.create("attendanceRecords", {
      sessionId: args.sessionId,
      studentId: args.studentId,
      timestamp: new Date().toISOString(),
      distance,
      verified: true,
    });

    const stu = mockDB.read("students", args.studentId);
    if (stu) {
      const attended = stu.attendanceStats.attended + 1;
      const totalSessions = Math.max(stu.attendanceStats.totalSessions, attended);
      const rate = totalSessions ? attended / totalSessions : 0;
      mockDB.update("students", args.studentId, {
        attendanceStats: {
          ...stu.attendanceStats,
          attended,
          totalSessions,
          absent: Math.max(0, totalSessions - attended),
          attendanceRate: rate,
        },
      });
    }

    bump();
    return { ok: true };
  },
};
