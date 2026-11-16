import { requireSupabaseClient } from "@/supabase/client";
import { TABLES } from "@/supabase/tables";
import type { PresenceEventType } from "./attendanceRepository";

export type ActiveSessionForStudent = {
  sessionId: string;
  moduleId: string;
  moduleCode: string;
  moduleName: string;
  sessionType: string;
  startedAt: string;
};

export const studentAttendanceRepository = {
  // Find active sessions for modules this student is enrolled in
  async getActiveSessionsForStudent(
    studentId: string
  ): Promise<ActiveSessionForStudent[]> {
    const client = requireSupabaseClient();

    // 1. Get modules this student is enrolled in
    const { data: modules, error: modErr } = await client
      .from(TABLES.modules)
      .select("id, module_code, module_name, enrolled_students")
      .contains("enrolled_students", JSON.stringify([studentId]));

    if (modErr) {
      console.error("[student] module query error:", modErr);
      throw modErr;
    }
    if (!modules || modules.length === 0) return [];

    const moduleIds = modules.map((m: any) => m.id);
    const moduleMap = new Map(modules.map((m: any) => [m.id, m]));

    // 2. Get active sessions for those modules
    const { data: sessions, error: sessErr } = await client
      .from(TABLES.attendanceSessions)
      .select("id, module_id, session_type, created_at")
      .in("module_id", moduleIds)
      .eq("is_active", true);

    if (sessErr) {
      console.error("[student] session query error:", sessErr);
      throw sessErr;
    }
    if (!sessions) return [];

    return sessions.map((s: any) => {
      const m: any = moduleMap.get(s.module_id);
      return {
        sessionId: s.id,
        moduleId: s.module_id,
        moduleCode: m?.module_code ?? "—",
        moduleName: m?.module_name ?? "—",
        sessionType: s.session_type ?? "lecture",
        startedAt: s.created_at,
      };
    });
  },

  // Log a presence event (student side)
  async logPresence(
    sessionId: string,
    studentId: string,
    eventType: PresenceEventType,
    rssi: number | null
  ): Promise<void> {
    const client = requireSupabaseClient();
    const { error } = await client.from(TABLES.attendanceEvents).insert({
      session_id: sessionId,
      student_id: studentId,
      event_type: eventType,
      rssi_value: rssi,
      timestamp: new Date().toISOString(),
    });
    if (error) {
      console.error("[student] logPresence error:", error);
      throw error;
    }
  },

  // Get the latest event for this student + session (to avoid duplicates)
  async getLastEventForStudent(
    sessionId: string,
    studentId: string
  ): Promise<{ eventType: string; timestamp: string } | null> {
    const client = requireSupabaseClient();
    const { data } = await client
      .from(TABLES.attendanceEvents)
      .select("event_type, timestamp")
      .eq("session_id", sessionId)
      .eq("student_id", studentId)
      .order("timestamp", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) return null;
    return { eventType: data.event_type, timestamp: data.timestamp };
  },
};