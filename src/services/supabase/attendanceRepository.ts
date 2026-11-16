// src/services/supabase/attendanceRepository.ts
// BLE-only attendance tracking. No GPS. No attendance_records.

import { requireSupabaseClient } from "@/supabase/client";
import { TABLES } from "@/supabase/tables";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type PresenceEventType =
  | "check_in"
  | "exit"
  | "re_entry"
  | "break_start"
  | "break_end"
  | "emergency";

export type LiveAttendanceSession = {
  id: string;
  moduleId: string;
  moduleCode: string;
  sessionType: string;
  title: string | null;
  startedAt: string;
  insideCount: number;
  onBreakCount: number;
  leftCount: number;
  totalStudents: number;
};

export type RecentAttendanceSession = {
  id: string;
  moduleId: string;
  moduleCode: string;
  date: string;
  avgStayMinutes: number;
  earlyExits: number;
  totalStudents: number;
};

// ─────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────

export const attendanceRepository = {
  // ── START A SESSION (lecturer taps "Start attendance") ──────
    // Update the function signature
  async startAttendanceSession(
    moduleId: string,
    lecturerId: string,
    sessionType: string = "lecture",
    venueId: string | null = null,
    lecturerMac: string = "UNKNOWN" // <-- NEW
  ): Promise<{ sessionId: string }> {
    const client = requireSupabaseClient();
    // ... (keep existing active session check) ...

    const sessionId = `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const { error } = await client
      .from(TABLES.attendanceSessions)
      .insert({
        id: sessionId,
        module_id: moduleId,
        lecturer_id: lecturerId,
        started_by_id: lecturerId,
        started_by_role: "lecturer",
        session_type: sessionType,
        venue_id: venueId,
        is_active: true,
        active: true,
        created_at: new Date().toISOString(),
        radius: 0,
        algorithm_seed: "ble",
        expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        lecturer_mac: lecturerMac, // <-- SAVE IT HERE
      });

    if (error) throw error;
    return { sessionId };
  },
    async getSessionLecturerMac(sessionId: string): Promise<string | null> {
    const client = requireSupabaseClient();
    const { data } = await client
      .from(TABLES.attendanceSessions)
      .select("lecturer_mac")
      .eq("id", sessionId)
      .maybeSingle();
    return data?.lecturer_mac || null;
  },

  // ── END A SESSION ───────────────────────────────────────────
  async endAttendanceSession(sessionId: string): Promise<void> {
    const client = requireSupabaseClient();
    const { error } = await client
      .from(TABLES.attendanceSessions)
      .update({
        is_active: false,
        active: false,
        ended_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    if (error) {
      console.error("[attendance] endAttendanceSession error:", error);
      throw error;
    }
  },

  // ── RECORD A BLE PRESENCE EVENT (called by student phone) ───
  async recordPresenceEvent(
    sessionId: string,
    studentId: string,
    eventType: PresenceEventType,
    rssiValue: number | null
  ): Promise<void> {
    const client = requireSupabaseClient();
    const { error } = await client.from(TABLES.attendanceEvents).insert({
      session_id: sessionId,
      student_id: studentId,
      event_type: eventType,
      rssi_value: rssiValue,
      timestamp: new Date().toISOString(),
    });

    if (error) {
      console.error("[attendance] recordPresenceEvent error:", error);
      throw error;
    }
  },

  // ── LIVE SESSIONS (dashboard: "who is inside NOW?") ─────────
  async getLiveAttendanceSessions(
    lecturerId: string
  ): Promise<LiveAttendanceSession[]> {
    const client = requireSupabaseClient();

    const { data: sessions, error } = await client
      .from(TABLES.attendanceSessions)
      .select("id, module_id, session_type, title, created_at")
      .eq("lecturer_id", lecturerId)
      .eq("is_active", true);

    if (error) {
      console.error("[attendance] getLiveAttendanceSessions error:", error);
      throw error;
    }
    if (!sessions || sessions.length === 0) return [];

    const moduleIds = sessions.map((s: any) => s.module_id);
    const { data: modules } = await client
      .from(TABLES.modules)
      .select("id, module_code, enrolled_students")
      .in("id", moduleIds);

    const moduleMap = new Map<string, any>(
      (modules ?? []).map((m: any) => [m.id, m])
    );

    const results: LiveAttendanceSession[] = [];

    for (const s of sessions) {
      const { data: events } = await client
        .from(TABLES.attendanceEvents)
        .select("student_id, event_type, timestamp")
        .eq("session_id", s.id)
        .order("timestamp", { ascending: false })
        .limit(1000);

      // Latest event per student wins
      const latest = new Map<string, string>();
      for (const e of events ?? []) {
        if (!latest.has(e.student_id)) {
          latest.set(e.student_id, e.event_type);
        }
      }

      let inside = 0;
      let onBreak = 0;
      let left = 0;
      for (const ev of latest.values()) {
        if (ev === "check_in" || ev === "re_entry" || ev === "break_end")
          inside++;
        else if (ev === "break_start") onBreak++;
        else if (ev === "exit" || ev === "emergency") left++;
      }

      const module = moduleMap.get(s.module_id);
      const enrolled = (module?.enrolled_students as string[]) ?? [];

      results.push({
        id: s.id,
        moduleId: s.module_id,
        moduleCode: module?.module_code ?? "—",
        sessionType: s.session_type ?? "class",
        title: s.title ?? null,
        startedAt: s.created_at,
        insideCount: inside,
        onBreakCount: onBreak,
        leftCount: left,
        totalStudents: enrolled.length,
      });
    }

    return results;
  },

  // ── RECENT SESSIONS (dashboard: past reports) ───────────────
  async getRecentAttendanceSessions(
    lecturerId: string
  ): Promise<RecentAttendanceSession[]> {
    const client = requireSupabaseClient();

    const { data: sessions, error } = await client
      .from(TABLES.attendanceSessions)
      .select("id, module_id, created_at, ended_at")
      .eq("lecturer_id", lecturerId)
      .eq("is_active", false)
      .not("ended_at", "is", null)
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) {
      console.error("[attendance] getRecentAttendanceSessions error:", error);
      throw error;
    }
    if (!sessions || sessions.length === 0) return [];

    const moduleIds = sessions.map((s: any) => s.module_id);
    const { data: modules } = await client
      .from(TABLES.modules)
      .select("id, module_code, enrolled_students")
      .in("id", moduleIds);

    const moduleMap = new Map<string, any>(
      (modules ?? []).map((m: any) => [m.id, m])
    );

    const results: RecentAttendanceSession[] = [];

    for (const s of sessions) {
      const { data: events } = await client
        .from(TABLES.attendanceEvents)
        .select("student_id, event_type, timestamp")
        .eq("session_id", s.id)
        .order("timestamp", { ascending: true });

      const stats = new Map<
        string,
        { first: string | null; last: string | null; exits: number }
      >();

      for (const e of events ?? []) {
        if (!stats.has(e.student_id)) {
          stats.set(e.student_id, { first: null, last: null, exits: 0 });
        }
        const s2 = stats.get(e.student_id)!;

        if (
          (e.event_type === "check_in" || e.event_type === "re_entry") &&
          !s2.first
        ) {
          s2.first = e.timestamp;
        }
        if (
          e.event_type === "check_in" ||
          e.event_type === "re_entry" ||
          e.event_type === "break_end"
        ) {
          s2.last = e.timestamp;
        }
        if (e.event_type === "exit") s2.exits += 1;
      }

      const durations: number[] = [];
      let earlyExits = 0;
      for (const s2 of stats.values()) {
        if (s2.first && s2.last) {
          durations.push(
            (new Date(s2.last).getTime() - new Date(s2.first).getTime()) / 60000
          );
        }
        if (s2.exits > 0) earlyExits++;
      }

      const avgStay =
        durations.length > 0
          ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
          : 0;

      const module = moduleMap.get(s.module_id);
      const enrolled = (module?.enrolled_students as string[]) ?? [];

      results.push({
        id: s.id,
        moduleId: s.module_id,
        moduleCode: module?.module_code ?? "—",
        date: new Date(s.created_at).toLocaleDateString(),
        avgStayMinutes: avgStay,
        earlyExits,
        totalStudents: enrolled.length,
      });
    }

    return results;
  },

  // ── SESSION ROSTER (live monitoring, ids only) ─────────────
  async getSessionRoster(sessionId: string): Promise<
    {
      studentId: string;
      status: "inside" | "on_break" | "left" | "not_seen";
      lastEventAt: string | null;
      lastRssi: number | null;
      exitCount: number;
      lastBreakAt: string | null;
    }[]
  > {
    const client = requireSupabaseClient();

    const { data: session } = await client
      .from(TABLES.attendanceSessions)
      .select("module_id")
      .eq("id", sessionId)
      .maybeSingle();

    if (!session) return [];

    const { data: module } = await client
      .from(TABLES.modules)
      .select("enrolled_students")
      .eq("id", session.module_id)
      .maybeSingle();

    const enrolled: string[] = (module?.enrolled_students as string[]) ?? [];

    const { data: events } = await client
      .from(TABLES.attendanceEvents)
      .select("student_id, event_type, rssi_value, timestamp")
      .eq("session_id", sessionId)
      .order("timestamp", { ascending: true });

    const byStudent = new Map<string, any[]>();
    for (const e of events ?? []) {
      if (!byStudent.has(e.student_id)) byStudent.set(e.student_id, []);
      byStudent.get(e.student_id)!.push(e);
    }

    return enrolled.map((studentId) => {
      const list = byStudent.get(studentId) ?? [];
      if (list.length === 0) {
        return {
          studentId,
          status: "not_seen" as const,
          lastEventAt: null,
          lastRssi: null,
          exitCount: 0,
          lastBreakAt: null,
        };
      }
      const last = list[list.length - 1];
      const exitCount = list.filter((e) => e.event_type === "exit").length;
      const lastBreak = [...list]
        .reverse()
        .find((e) => e.event_type === "break_start");

      let status: "inside" | "on_break" | "left" | "not_seen" = "inside";
      if (
        last.event_type === "check_in" ||
        last.event_type === "re_entry" ||
        last.event_type === "break_end"
      )
        status = "inside";
      else if (last.event_type === "break_start") status = "on_break";
      else if (last.event_type === "exit" || last.event_type === "emergency")
        status = "left";

      return {
        studentId,
        status,
        lastEventAt: last.timestamp,
        lastRssi: last.rssi_value,
        exitCount,
        lastBreakAt: lastBreak?.timestamp ?? null,
      };
    });
  },

  // ── SESSION ROSTER WITH NAMES (live monitoring, for display) ─
  async getSessionRosterWithNames(sessionId: string): Promise<
    {
      studentId: string;
      fullName: string;
      studentNumber: string;
      status: "inside" | "on_break" | "left" | "not_seen";
      lastEventAt: string | null;
      lastRssi: number | null;
      exitCount: number;
      lastBreakAt: string | null;
    }[]
  > {
    const client = requireSupabaseClient();

    const { data: session } = await client
      .from(TABLES.attendanceSessions)
      .select("module_id")
      .eq("id", sessionId)
      .maybeSingle();

    if (!session) return [];

    const { data: module } = await client
      .from(TABLES.modules)
      .select("enrolled_students")
      .eq("id", session.module_id)
      .maybeSingle();

    const enrolled: string[] = (module?.enrolled_students as string[]) ?? [];
    if (enrolled.length === 0) return [];

    const { data: studentRows } = await client
      .from("students")
      .select("id, full_name, student_number")
      .in("id", enrolled);

    const nameMap = new Map<string, { fullName: string; studentNumber: string }>(
      (studentRows ?? []).map((s: any) => [
        s.id,
        { fullName: s.full_name, studentNumber: s.student_number },
      ])
    );

    const { data: events } = await client
      .from(TABLES.attendanceEvents)
      .select("student_id, event_type, rssi_value, timestamp")
      .eq("session_id", sessionId)
      .order("timestamp", { ascending: true });

    const byStudent = new Map<string, any[]>();
    for (const e of events ?? []) {
      if (!byStudent.has(e.student_id)) byStudent.set(e.student_id, []);
      byStudent.get(e.student_id)!.push(e);
    }

    return enrolled.map((studentId) => {
      const info = nameMap.get(studentId) ?? {
        fullName: "Unknown",
        studentNumber: studentId,
      };
      const list = byStudent.get(studentId) ?? [];

      if (list.length === 0) {
        return {
          studentId,
          fullName: info.fullName,
          studentNumber: info.studentNumber,
          status: "not_seen" as const,
          lastEventAt: null,
          lastRssi: null,
          exitCount: 0,
          lastBreakAt: null,
        };
      }

      const last = list[list.length - 1];
      const exitCount = list.filter((e) => e.event_type === "exit").length;
      const lastBreak = [...list]
        .reverse()
        .find((e) => e.event_type === "break_start");

      let status: "inside" | "on_break" | "left" = "inside";
      if (
        last.event_type === "check_in" ||
        last.event_type === "re_entry" ||
        last.event_type === "break_end"
      ) {
        status = "inside";
      } else if (last.event_type === "break_start") {
        status = "on_break";
      } else if (
        last.event_type === "exit" ||
        last.event_type === "emergency"
      ) {
        status = "left";
      }

      return {
        studentId,
        fullName: info.fullName,
        studentNumber: info.studentNumber,
        status,
        lastEventAt: last.timestamp,
        lastRssi: last.rssi_value,
        exitCount,
        lastBreakAt: lastBreak?.timestamp ?? null,
      };
    });
  },

  // ── ENROLMENT HELPERS ───────────────────────────────────────
  async listStudentsForModule(moduleId: string): Promise<{
    enrolled: { id: string; fullName: string; studentNumber: string; email: string }[];
    available: { id: string; fullName: string; studentNumber: string; email: string }[];
  }> {
    const client = requireSupabaseClient();

    const { data: module } = await client
      .from(TABLES.modules)
      .select("enrolled_students")
      .eq("id", moduleId)
      .maybeSingle();

    const enrolledIds: string[] = (module?.enrolled_students as string[]) ?? [];

    const { data: allStudents, error } = await client
      .from("students")
      .select("id, full_name, student_number, email")
      .order("full_name", { ascending: true });

    if (error) throw error;

    const enrolled: any[] = [];
    const available: any[] = [];

    for (const s of allStudents ?? []) {
      const entry = {
        id: s.id,
        fullName: s.full_name,
        studentNumber: s.student_number,
        email: s.email,
      };
      if (enrolledIds.includes(s.id)) enrolled.push(entry);
      else available.push(entry);
    }

    return { enrolled, available };
  },

  async setEnrolledStudents(
    moduleId: string,
    studentIds: string[]
  ): Promise<void> {
    const client = requireSupabaseClient();
    const { error } = await client
      .from(TABLES.modules)
      .update({ enrolled_students: studentIds })
      .eq("id", moduleId);

    if (error) {
      console.error("[attendance] setEnrolledStudents error:", error);
      throw error;
    }
  },
};