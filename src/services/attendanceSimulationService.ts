import * as Crypto from "expo-crypto";

import { mockDB } from "@/mockDB/mockDBService";
import { haversineMeters } from "@/utils/haversine";
import { verifyAttendanceCode } from "@/utils/rotatingCode";
import type { AttendanceSessionModel, SessionHostRole } from "@/models/Attendance";
import { useMockDbVersionStore } from "@/store/mockDbVersionStore";
import { delegationService } from "@/services/delegationService";
import { canStartModuleSession } from "@/permissions/delegationPermissions";
import type { InstitutionRole } from "@/types/roles";
//added imports from m4 job 019
import { getDataSource } from "@/services/dataSource";
import { createSession as createSupabaseSession, endSessionAndCreateRegister } from "@/services/supabase/attendanceSessionRepository";

import { isSupabaseEnabled, requireSupabaseClient } from "@/supabase/client";
import { attendanceSessionRepository } from "@/services/supabase/attendanceSessionRepository";
import { getModuleById } from "@/services/supabase/moduleRepository";

function bump() {
  useMockDbVersionStore.getState().bump();
}

export const attendanceSimulationService = {

  async fetchLiveSessionForModule(moduleId: string): Promise<AttendanceSessionModel | null> {
       if (isSupabaseEnabled()) {
      const moduleData = await getModuleById(moduleId);
      // If the module doesn't exist or has no active session, return null
        if (!moduleData || !moduleData.activeSessionId) return null;
      
      // Fetch the actual session row using the ID from the module
        return await attendanceSessionRepository.getActiveSession(moduleData.activeSessionId);
    }

    // 2. Legacy Mock Path
         mockDB.touch();
         const mod = mockDB.read("modules", moduleId);
        if (!mod || !mod.activeSessionId) return null;
    
    return mockDB.read("attendanceSessions", mod.activeSessionId) ?? null;
  },

  verifyCodeForSession(args: { sessionId: string; codeEntered: string }): { ok: true } | { ok: false; reason: string } {
    mockDB.touch();
    const session = mockDB.read("attendanceSessions", args.sessionId);
    if (!session || !session.active) return { ok: false, reason: "Session not active or missing." };
    if (new Date(session.expiresAt).getTime() <= Date.now()) return { ok: false, reason: "Session expired." };
    const v = verifyAttendanceCode(session.algorithmSeed, args.codeEntered);
    if (!v.ok) return { ok: false, reason: "Invalid attendance code." };
    return { ok: true };
  },

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
  //  mockDB.touch();
   // const mod = mockDB.read("modules", args.moduleId);
   // if (!mod) throw new Error("Module not found.");

   let mod: any;
    if (getDataSource() === "supabase") {
      mod = await getModuleById(args.moduleId);
      if (!mod) throw new Error("Module not found in Supabase.");
    } else {
      mockDB.touch();
      mod = mockDB.read("modules", args.moduleId);
      if (!mod) throw new Error("Module not found in MockDB.");
    }

    const lecturerId = args.lecturerId ?? mod.lecturerId;
    const delegations = await delegationService.listModuleDelegations(args.moduleId);

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

    //new added code from job 019

    if (getDataSource() === "supabase") {
  const expiresAt = new Date(now + mins * 60_000).toISOString();

  return await createSupabaseSession({
    moduleId: args.moduleId,
    hostRole: args.hostRole,
    hostId: args.hostId,
    latitude: args.latitude,
    longitude: args.longitude,
    algorithmSeed: shortSeed,
    radius,
    expiresAt,
    active: true,
  });
}

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


  async endSession(args: {
    sessionId: string;
    moduleId: string;
    lecturerId: string;
  }): Promise<{ ok: true; registerId?: string } | { ok: false; reason: string }> {
    
    // 1. LIVE SUPABASE PATH
    if (getDataSource() === "supabase" || isSupabaseEnabled()) {
      try {
        const supabase = requireSupabaseClient();
        
        // Fetch raw attendance records to bundle into the register
        const { data: records, error: fetchErr } = await supabase
          .from("attendance_records")
          .select("student_id, timestamp, verified, passed")
          .eq("session_id", args.sessionId);

        if (fetchErr) throw fetchErr;

        // Execute the atomic SQL function
        const result = await endSessionAndCreateRegister({
          sessionId: args.sessionId,
          moduleId: args.moduleId,
          lecturerId: args.lecturerId,
          studentsPayload: records || []
        });

        return { ok: true, registerId: result.registerId };
      } catch (e) {
        console.error("Failed to close live session:", e);
        return { ok: false, reason: "Database error closing session." };
      }
    }

    // 2. LEGACY MOCK PATH
    mockDB.touch();
    mockDB.update("attendanceSessions", args.sessionId, { 
      active: false, 
      endedAt: new Date().toISOString() 
    });
    
    const mod = mockDB.read("modules", args.moduleId);
    if (mod) {
      mockDB.update("modules", args.moduleId, { activeSessionId: undefined as any });
    }
    bump();
    
    return { ok: true, registerId: "mock_reg_" + Date.now() };
  },
};
