
import { requireSupabaseClient } from "@/supabase/client";
import { TABLES } from "@/supabase/tables";

export type PresenceEventType =
  | "check_in"
  | "exit"
  | "re_entry"
  | "break_start"
  | "break_end"
  | "emergency";

export type StudentAttendanceStatus =
  | "inside"
  | "on_break"
  | "left"
  | "not_seen";

export type SessionRosterStudent = {
  studentId: string;
  fullName: string;
  studentNumber: string;
  status: StudentAttendanceStatus;
  lastEventAt: string | null;
  lastRssi: number | null;
  exitCount: number;
  lastBreakAt: string | null;
  wasPresent: boolean;
};

export type AttendanceSessionInfo = {
  id: string;
  expiresAt: string;
  isActive: boolean;
  active: boolean;
  endedAt: string | null;
};

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
export type AttendanceHistoryModule = {
  moduleId: string;
  moduleCode: string;
  totalSessions: number;
  latestSessionDate: string;
};

export type ModuleAttendanceHistoryPage = {
  moduleCode: string;
  totalStudents: number;
  sessions: RecentAttendanceSession[];
  totalCount: number;
};
export type SessionAttendanceExportRow = {
  sessionId: string;
  moduleCode: string;
  sessionDate: string;
  studentId: string;
  studentNumber: string;
  fullName: string;
  attendanceStatus: "Present" | "Absent";
  firstAttendanceAt: string | null;
  lastEventAt: string | null;
  exitCount: number;
};
const PRESENT_EVENTS = ["check_in", "re_entry", "break_end"];

function getStudentStatus(eventType?: string): StudentAttendanceStatus {
  if (
    eventType === "check_in" ||
    eventType === "re_entry" ||
    eventType === "break_end"
  ) {
    return "inside";
  }

  if (eventType === "break_start") return "on_break";

  if (eventType === "exit" || eventType === "emergency") return "left";

  return "not_seen";
}

export const attendanceRepository = {
  // durationMinutes is the lecturer-selected session duration.
  async startAttendanceSession(
    moduleId: string,
    lecturerId: string,
    sessionType: string = "lecture",
    venueId: string | null = null,
    lecturerMac: string = "UNKNOWN",
    durationMinutes: number = 60
  ): Promise<{ sessionId: string; expiresAt: string }> {
    const client = requireSupabaseClient();

    if (!moduleId || !lecturerId) {
      throw new Error("Module and lecturer information are required.");
    }

    if (
      !Number.isFinite(durationMinutes) ||
      durationMinutes < 1 ||
      durationMinutes > 480
    ) {
      throw new Error("Session duration must be between 1 and 480 minutes.");
    }

    // Prevent a lecturer from accidentally starting another active session
    // for the same module.
    const now = new Date();
    const { data: existing, error: existingError } = await client
      .from(TABLES.attendanceSessions)
      .select("id")
      .eq("lecturer_id", lecturerId)
      .eq("module_id", moduleId)
      .eq("is_active", true)
      .eq("active", true)
      .gt("expires_at", now.toISOString())
      .limit(1);

    if (existingError) throw existingError;

    if (existing && existing.length > 0) {
      throw new Error(
        "There is already an active attendance session for this module. End it before starting another."
      );
    }

    const sessionId = `att_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    const expiresAt = new Date(
      now.getTime() + durationMinutes * 60 * 1000
    ).toISOString();

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
        created_at: now.toISOString(),
        radius: 0,
        algorithm_seed: "ble",
        expires_at: expiresAt,
        lecturer_mac: lecturerMac,
      });

    if (error) {
      console.error("[attendance] startAttendanceSession error:", error);
      throw error;
    }

    return { sessionId, expiresAt };
  },

  async getAttendanceSession(
    sessionId: string
  ): Promise<AttendanceSessionInfo | null> {
    const client = requireSupabaseClient();

    const { data, error } = await client
      .from(TABLES.attendanceSessions)
      .select("id, expires_at, is_active, active, ended_at")
      .eq("id", sessionId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      id: data.id,
      expiresAt: data.expires_at,
      isActive: data.is_active === true,
      active: data.active === true,
      endedAt: data.ended_at ?? null,
    };
  },

  async getSessionLecturerMac(sessionId: string): Promise<string | null> {
    const client = requireSupabaseClient();

    const { data, error } = await client
      .from(TABLES.attendanceSessions)
      .select("lecturer_mac")
      .eq("id", sessionId)
      .maybeSingle();

    if (error) throw error;
    return data?.lecturer_mac || null;
  },

  async endAttendanceSession(sessionId: string): Promise<void> {
    const client = requireSupabaseClient();
    const endedAt = new Date().toISOString();

    const { error } = await client
      .from(TABLES.attendanceSessions)
      .update({
        is_active: false,
        active: false,
        ended_at: endedAt,
      })
      .eq("id", sessionId);

    if (error) {
      console.error("[attendance] endAttendanceSession error:", error);
      throw error;
    }
  },

  async recordPresenceEvent(
    sessionId: string,
    studentId: string,
    eventType: PresenceEventType,
    rssiValue: number | null
  ): Promise<void> {
    const client = requireSupabaseClient();

    // Do not accept new presence events after the session has ended or expired.
    const { data: session, error: sessionError } = await client
      .from(TABLES.attendanceSessions)
      .select("is_active, active, expires_at")
      .eq("id", sessionId)
      .maybeSingle();

    if (sessionError) throw sessionError;

    if (
      !session ||
      session.is_active !== true ||
      session.active !== true ||
      new Date(session.expires_at).getTime() <= Date.now()
    ) {
      throw new Error("This attendance session has ended.");
    }

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

  async getLiveAttendanceSessions(
    lecturerId: string
  ): Promise<LiveAttendanceSession[]> {
    const client = requireSupabaseClient();
    const now = new Date().toISOString();

    const { data: sessions, error } = await client
      .from(TABLES.attendanceSessions)
      .select("id, module_id, session_type, title, created_at")
      .eq("lecturer_id", lecturerId)
      .eq("is_active", true)
      .eq("active", true)
      .gt("expires_at", now);

    if (error) throw error;
    if (!sessions?.length) return [];

    const moduleIds = sessions.map((s: any) => s.module_id);

    const { data: modules, error: moduleError } = await client
      .from(TABLES.modules)
      .select("id, module_code, enrolled_students")
      .in("id", moduleIds);

    if (moduleError) throw moduleError;

    const moduleMap = new Map<string, any>(
      (modules ?? []).map((m: any) => [m.id, m])
    );

    const results: LiveAttendanceSession[] = [];

    for (const session of sessions) {
      const { data: events, error: eventError } = await client
        .from(TABLES.attendanceEvents)
        .select("student_id, event_type, timestamp")
        .eq("session_id", session.id)
        .order("timestamp", { ascending: false })
        .limit(1000);

      if (eventError) throw eventError;

      const latest = new Map<string, string>();

      for (const event of events ?? []) {
        if (!latest.has(event.student_id)) {
          latest.set(event.student_id, event.event_type);
        }
      }

      let inside = 0;
      let onBreak = 0;
      let left = 0;

      for (const eventType of latest.values()) {
        const status = getStudentStatus(eventType);

        if (status === "inside") inside++;
        else if (status === "on_break") onBreak++;
        else if (status === "left") left++;
      }

      const module = moduleMap.get(session.module_id);
      const enrolled = (module?.enrolled_students as string[]) ?? [];

      results.push({
        id: session.id,
        moduleId: session.module_id,
        moduleCode: module?.module_code ?? "—",
        sessionType: session.session_type ?? "lecture",
        title: session.title ?? null,
        startedAt: session.created_at,
        insideCount: inside,
        onBreakCount: onBreak,
        leftCount: left,
        totalStudents: enrolled.length,
      });
    }

    return results;
  },

  

async getRecentAttendanceSessions(
  lecturerId: string
): Promise<RecentAttendanceSession[]> {
  const client = requireSupabaseClient();

  console.log("[STARS HISTORY] Fetching sessions for:", lecturerId);

  // Fetch completed sessions in pages.
  const pageSize = 500;
  let offset = 0;
  const sessions: any[] = [];

  while (true) {
    const { data, error } = await client
      .from(TABLES.attendanceSessions)
      .select("id, module_id, created_at, ended_at")
      .eq("lecturer_id", lecturerId)
      .eq("is_active", false)
      .not("ended_at", "is", null)
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error("[STARS HISTORY] Session query failed:", error);
      throw error;
    }

    const page = data ?? [];

    console.log("[STARS HISTORY] Sessions page:", page.length);

    sessions.push(...page);

    if (page.length < pageSize) break;

    offset += pageSize;
  }

  console.log("[STARS HISTORY] Total sessions:", sessions.length);

  if (sessions.length === 0) {
    return [];
  }

  // Retrieve all related modules in one request.
  const moduleIds = [
    ...new Set(
      sessions
        .map((session: any) => session.module_id)
        .filter(Boolean)
    ),
  ];

  const { data: modules, error: moduleError } = await client
    .from(TABLES.modules)
    .select("id, module_code, enrolled_students")
    .in("id", moduleIds);

  if (moduleError) {
    console.error("[STARS HISTORY] Module query failed:", moduleError);
    throw moduleError;
  }

  console.log("[STARS HISTORY] Modules retrieved:", modules?.length ?? 0);

  const moduleMap = new Map<string, any>(
    (modules ?? []).map((module: any) => [module.id, module])
  );

  // Build history without querying every session's attendance events.
  const results: RecentAttendanceSession[] = sessions.map(
    (session: any) => {
      const module = moduleMap.get(session.module_id);

      const enrolled = Array.isArray(module?.enrolled_students)
        ? module.enrolled_students
        : [];

      return {
        id: session.id,
        moduleId: session.module_id,
        moduleCode: module?.module_code ?? "—",
        date: session.created_at
          ? new Date(session.created_at).toLocaleString()
          : "Date unavailable",
        avgStayMinutes: 0,
        earlyExits: 0,
        totalStudents: enrolled.length,
      };
    }
  );

  console.log("[STARS HISTORY] History successfully prepared:", results.length);

  return results;
},
  // ── HISTORY: GET MODULES WITH COMPLETED SESSIONS ────────────
  async getAttendanceHistoryModules(
    lecturerId: string
  ): Promise<AttendanceHistoryModule[]> {
    const client = requireSupabaseClient();

    console.log("[STARS HISTORY] Fetching module history:", lecturerId);

    const pageSize = 500;
    let offset = 0;

    const moduleStats = new Map<
      string,
      {
        totalSessions: number;
        latestSessionDate: string;
      }
    >();

    // Fetch completed session metadata in batches.
    while (true) {
      const { data: sessions, error } = await client
        .from(TABLES.attendanceSessions)
        .select("module_id, created_at")
        .eq("lecturer_id", lecturerId)
        .eq("is_active", false)
        .not("ended_at", "is", null)
        .order("created_at", { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (error) {
        console.error(
          "[STARS HISTORY] Module sessions failed:",
          error
        );
        throw error;
      }

      const page = sessions ?? [];

      for (const session of page) {
        if (!session.module_id) continue;

        const existing = moduleStats.get(session.module_id);

        if (existing) {
          existing.totalSessions++;
        } else {
          moduleStats.set(session.module_id, {
            totalSessions: 1,
            latestSessionDate: session.created_at,
          });
        }
      }

      if (page.length < pageSize) break;

      offset += pageSize;
    }

    if (moduleStats.size === 0) return [];

    // Retrieve module information in one request.
    const moduleIds = Array.from(moduleStats.keys());

    const { data: modules, error: moduleError } = await client
      .from(TABLES.modules)
      .select("id, module_code")
      .in("id", moduleIds);

    if (moduleError) {
      console.error(
        "[STARS HISTORY] Module details failed:",
        moduleError
      );
      throw moduleError;
    }

    const moduleMap = new Map<string, string>(
      (modules ?? []).map((module: any) => [
        module.id,
        module.module_code ?? "—",
      ])
    );

    const results: AttendanceHistoryModule[] = [];

    for (const [moduleId, stats] of moduleStats.entries()) {
      results.push({
        moduleId,
        moduleCode: moduleMap.get(moduleId) ?? "—",
        totalSessions: stats.totalSessions,
        latestSessionDate: stats.latestSessionDate,
      });
    }

    // Most recently used modules appear first.
    results.sort(
      (a, b) =>
        new Date(b.latestSessionDate).getTime() -
        new Date(a.latestSessionDate).getTime()
    );

    console.log(
      "[STARS HISTORY] Modules prepared:",
      results.length
    );

    return results;
  },

  // ── HISTORY: GET PAGINATED SESSIONS FOR A MODULE ────────────
  async getModuleAttendanceHistory(
    lecturerId: string,
    moduleId: string,
    offset: number = 0,
    pageSize: number = 10
  ): Promise<ModuleAttendanceHistoryPage> {
    const client = requireSupabaseClient();

    const safeOffset = Math.max(0, Math.floor(offset));
    const safePageSize = Math.min(
      50,
      Math.max(1, Math.floor(pageSize))
    );

    // Get module details.
    const { data: module, error: moduleError } = await client
      .from(TABLES.modules)
      .select("id, module_code, enrolled_students")
      .eq("id", moduleId)
      .maybeSingle();

    if (moduleError) {
      console.error(
        "[STARS HISTORY] Module details failed:",
        moduleError
      );
      throw moduleError;
    }

    const enrolled: string[] =
      (module?.enrolled_students as string[]) ?? [];

    // Get only the requested page of completed sessions.
    const {
      data: sessions,
      error: sessionsError,
      count,
    } = await client
      .from(TABLES.attendanceSessions)
      .select("id, module_id, created_at", {
        count: "exact",
      })
      .eq("lecturer_id", lecturerId)
      .eq("module_id", moduleId)
      .eq("is_active", false)
      .not("ended_at", "is", null)
      .order("created_at", { ascending: false })
      .range(
        safeOffset,
        safeOffset + safePageSize - 1
      );

    if (sessionsError) {
      console.error(
        "[STARS HISTORY] Session page failed:",
        sessionsError
      );
      throw sessionsError;
    }

    // No attendance_events queries here.
    const results: RecentAttendanceSession[] = (
      sessions ?? []
    ).map((session: any) => ({
      id: session.id,
      moduleId: session.module_id,
      moduleCode: module?.module_code ?? "—",
      date: session.created_at
        ? new Date(session.created_at).toLocaleString()
        : "Date unavailable",
      avgStayMinutes: 0,
      earlyExits: 0,
      totalStudents: enrolled.length,
    }));

    console.log("[STARS HISTORY] Module sessions loaded:", {
      moduleId,
      loaded: results.length,
      total: count ?? 0,
      offset: safeOffset,
    });

    return {
      moduleCode: module?.module_code ?? "—",
      totalStudents: enrolled.length,
      sessions: results,
      totalCount: count ?? 0,
    };
  },


  // ── EXCEL EXPORT: SELECTED SESSION ──────────────────────────
  async getSessionAttendanceExportRows(
    sessionId: string
  ): Promise<SessionAttendanceExportRow[]> {
    const client = requireSupabaseClient();

    const { data: session, error: sessionError } = await client
      .from(TABLES.attendanceSessions)
      .select("id, module_id, created_at")
      .eq("id", sessionId)
      .maybeSingle();

    if (sessionError) throw sessionError;
    if (!session) throw new Error("Session not found.");

    const { data: module, error: moduleError } = await client
      .from(TABLES.modules)
      .select("module_code, enrolled_students")
      .eq("id", session.module_id)
      .maybeSingle();

    if (moduleError) throw moduleError;

    const enrolled: string[] =
      (module?.enrolled_students as string[]) ?? [];

    if (enrolled.length === 0) return [];

    const { data: students, error: studentsError } = await client
      .from("students")
      .select("id, full_name, student_number")
      .in("id", enrolled);

    if (studentsError) throw studentsError;

    const { data: events, error: eventsError } = await client
      .from(TABLES.attendanceEvents)
      .select("student_id, event_type, timestamp")
      .eq("session_id", sessionId)
      .order("timestamp", { ascending: true });

    if (eventsError) throw eventsError;

    const studentMap = new Map<string, any>(
      (students ?? []).map((student: any) => [student.id, student])
    );

    const eventMap = new Map<string, any[]>();

    for (const event of events ?? []) {
      const list = eventMap.get(event.student_id) ?? [];
      list.push(event);
      eventMap.set(event.student_id, list);
    }

    const presenceEvents = ["check_in", "re_entry", "break_end"];

    return enrolled.map((studentId) => {
      const student = studentMap.get(studentId);
      const studentEvents = eventMap.get(studentId) ?? [];

      const validAttendance = studentEvents.filter((event) =>
        presenceEvents.includes(event.event_type)
      );

      return {
        sessionId,
        moduleCode: module?.module_code ?? "—",
        sessionDate: new Date(session.created_at).toLocaleString(),
        studentId,
        studentNumber: student?.student_number ?? studentId,
        fullName: student?.full_name ?? "Unknown",
        attendanceStatus:
          validAttendance.length > 0 ? "Present" : "Absent",
        firstAttendanceAt: validAttendance[0]?.timestamp ?? null,
        lastEventAt:
          studentEvents[studentEvents.length - 1]?.timestamp ?? null,
        exitCount: studentEvents.filter(
          (event) => event.event_type === "exit"
        ).length,
      };
    });
  },

  // ── EXCEL EXPORT: ALL SESSIONS FOR ONE MODULE ───────────────
  async getModuleAttendanceExportRows(
    lecturerId: string,
    moduleId: string
  ): Promise<SessionAttendanceExportRow[]> {
    const client = requireSupabaseClient();

    const pageSize = 500;
    let offset = 0;
    const sessionIds: string[] = [];

    while (true) {
      const { data, error } = await client
        .from(TABLES.attendanceSessions)
        .select("id")
        .eq("lecturer_id", lecturerId)
        .eq("module_id", moduleId)
        .eq("is_active", false)
        .not("ended_at", "is", null)
        .order("created_at", { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (error) throw error;

      const page = data ?? [];
      sessionIds.push(...page.map((item: any) => item.id));

      if (page.length < pageSize) break;

      offset += pageSize;
    }

    const allRows: SessionAttendanceExportRow[] = [];

    for (const id of sessionIds) {
      const rows =
        await attendanceRepository.getSessionAttendanceExportRows(id);

      allRows.push(...rows);
    }

    return allRows;
  },

  async getSessionRoster(sessionId: string): Promise<
    {
      studentId: string;
      status: StudentAttendanceStatus;
      lastEventAt: string | null;
      lastRssi: number | null;
      exitCount: number;
      lastBreakAt: string | null;
      wasPresent: boolean;
    }[]
  > {
    const roster = await this.getSessionRosterWithNames(sessionId);

    return roster.map((student) => ({
      studentId: student.studentId,
      status: student.status,
      lastEventAt: student.lastEventAt,
      lastRssi: student.lastRssi,
      exitCount: student.exitCount,
      lastBreakAt: student.lastBreakAt,
      wasPresent: student.wasPresent,
    }));
  },

  async getSessionRosterWithNames(
    sessionId: string
  ): Promise<SessionRosterStudent[]> {
    const client = requireSupabaseClient();

    const { data: session, error: sessionError } = await client
      .from(TABLES.attendanceSessions)
      .select("module_id")
      .eq("id", sessionId)
      .maybeSingle();

    if (sessionError) throw sessionError;
    if (!session) return [];

    const { data: module, error: moduleError } = await client
      .from(TABLES.modules)
      .select("enrolled_students")
      .eq("id", session.module_id)
      .maybeSingle();

    if (moduleError) throw moduleError;

    const enrolled: string[] = (module?.enrolled_students as string[]) ?? [];
    if (enrolled.length === 0) return [];

    const { data: studentRows, error: studentError } = await client
      .from("students")
      .select("id, full_name, student_number")
      .in("id", enrolled);

    if (studentError) throw studentError;

    const nameMap = new Map<
      string,
      { fullName: string; studentNumber: string }
    >(
      (studentRows ?? []).map((student: any) => [
        student.id,
        {
          fullName: student.full_name ?? "Unknown",
          studentNumber: student.student_number ?? student.id,
        },
      ])
    );

    const { data: events, error: eventError } = await client
      .from(TABLES.attendanceEvents)
      .select("student_id, event_type, rssi_value, timestamp")
      .eq("session_id", sessionId)
      .order("timestamp", { ascending: true });

    if (eventError) throw eventError;

    const byStudent = new Map<string, any[]>();

    for (const event of events ?? []) {
      if (!byStudent.has(event.student_id)) {
        byStudent.set(event.student_id, []);
      }
      byStudent.get(event.student_id)!.push(event);
    }

    return enrolled.map((studentId) => {
      const info = nameMap.get(studentId) ?? {
        fullName: "Unknown",
        studentNumber: studentId,
      };

      const list = byStudent.get(studentId) ?? [];
      const wasPresent = list.some((event) =>
        PRESENT_EVENTS.includes(event.event_type)
      );

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
          wasPresent: false,
        };
      }

      const last = list[list.length - 1];
      const lastBreak = [...list]
        .reverse()
        .find((event) => event.event_type === "break_start");

      return {
        studentId,
        fullName: info.fullName,
        studentNumber: info.studentNumber,
        status: getStudentStatus(last.event_type),
        lastEventAt: last.timestamp,
        lastRssi: last.rssi_value,
        exitCount: list.filter((event) => event.event_type === "exit").length,
        lastBreakAt: lastBreak?.timestamp ?? null,
        wasPresent,
      };
    });
  },

  async listStudentsForModule(moduleId: string): Promise<{
    enrolled: {
      id: string;
      fullName: string;
      studentNumber: string;
      email: string;
    }[];
    available: {
      id: string;
      fullName: string;
      studentNumber: string;
      email: string;
    }[];
  }> {
    const client = requireSupabaseClient();

    const { data: module, error: moduleError } = await client
      .from(TABLES.modules)
      .select("enrolled_students")
      .eq("id", moduleId)
      .maybeSingle();

    if (moduleError) throw moduleError;

    const enrolledIds: string[] = (module?.enrolled_students as string[]) ?? [];

    const { data: allStudents, error } = await client
      .from("students")
      .select("id, full_name, student_number, email")
      .order("full_name", { ascending: true });

    if (error) throw error;

    const enrolled: {
      id: string;
      fullName: string;
      studentNumber: string;
      email: string;
    }[] = [];

    const available: typeof enrolled = [];

    for (const student of allStudents ?? []) {
      const entry = {
        id: student.id,
        fullName: student.full_name,
        studentNumber: student.student_number,
        email: student.email,
      };

      if (enrolledIds.includes(student.id)) enrolled.push(entry);
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
