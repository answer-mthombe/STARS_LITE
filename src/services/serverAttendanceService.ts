import { requireSupabaseClient } from "@/supabase/client";
import { getOrCreateDeviceId } from "@/utils/deviceId";
import type { AttendanceFix } from "@/utils/captureAttendanceLocation";

/**
 * Client wrapper for the server-side attendance authority
 * (begin_attendance / submit_attendance RPCs — see
 * ATTENDANCE_SECURITY_ARCHITECTURE.md §10-§11). The app only submits evidence;
 * PostgreSQL makes the final PRESENT/reject decision.
 */

export type AttendanceOutcome =
  | { ok: true; recordId: string; distanceM: number }
  | { ok: false; code: AttendanceErrorCode; message: string; retryable: boolean };

export type AttendanceErrorCode =
  | "NOT_AUTHENTICATED" | "NOT_STUDENT" | "NOT_ENROLLED" | "SESSION_INACTIVE"
  | "INVALID_CODE" | "GPS_INVALID" | "GPS_STALE" | "GEOFENCE_FAILED"
  | "VENUE_MISSING" | "TOKEN_INVALID" | "DUPLICATE_ATTENDANCE" | "UNKNOWN";

// Maps each server error code to student-facing copy + whether retrying can help.
const ERROR_COPY: Record<AttendanceErrorCode, { message: string; retryable: boolean }> = {
  NOT_AUTHENTICATED: { message: "Please sign in again.", retryable: false },
  NOT_STUDENT: { message: "This account can't mark attendance.", retryable: false },
  NOT_ENROLLED: { message: "You're not enrolled in this class.", retryable: false },
  SESSION_INACTIVE: { message: "This session has ended.", retryable: false },
  INVALID_CODE: { message: "That code isn't current — check the lecturer's screen and try again.", retryable: true },
  GPS_INVALID: { message: "We couldn't confirm your location. Move into the room and retry.", retryable: true },
  GPS_STALE: { message: "Your location wasn't fresh enough. Stay in the room and retry.", retryable: true },
  GEOFENCE_FAILED: { message: "You're not inside the venue for this class.", retryable: true },
  VENUE_MISSING: { message: "This class has no venue set — please tell your lecturer.", retryable: false },
  TOKEN_INVALID: { message: "Your attempt expired. Tap “Mark me present” again.", retryable: true },
  DUPLICATE_ATTENDANCE: { message: "You're already marked present for this class.", retryable: false },
  UNKNOWN: { message: "Attendance could not be recorded. Please try again.", retryable: true },
};

function classify(raw?: string): { code: AttendanceErrorCode; message: string; retryable: boolean } {
  const codes = Object.keys(ERROR_COPY) as AttendanceErrorCode[];
  const code = codes.find((c) => c !== "UNKNOWN" && (raw ?? "").includes(c)) ?? "UNKNOWN";
  return { code, ...ERROR_COPY[code] };
}

/** Lecturer/tutor display: the current server code + seconds until it rotates. */
export async function getActiveSessionCode(
  sessionId: string
): Promise<{ code: string; secondsRemaining: number } | null> {
  try {
    const supabase = requireSupabaseClient();
    const { data, error } = await supabase.rpc("get_active_session_code", { p_session_id: sessionId });
    if (error || !data) return null;
    return { code: (data as any).code as string, secondsRemaining: (data as any).seconds_remaining ?? 0 };
  } catch {
    return null;
  }
}

/** Step 1: ask the server for a one-time token (validates enrolment/session/dup). */
export async function beginAttendance(
  sessionId: string
): Promise<{ ok: true; token: string } | { ok: false; code: AttendanceErrorCode; message: string; retryable: boolean }> {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase.rpc("begin_attendance", { p_session_id: sessionId });
  if (error) return { ok: false, ...classify(error.message) };
  const token = (data as any)?.token as string | undefined;
  if (!token) return { ok: false, ...classify("UNKNOWN") };
  return { ok: true, token };
}

/** Step 2: submit the code + location evidence; the server decides PRESENT. */
export async function submitAttendance(args: {
  token: string;
  code: string;
  fix: AttendanceFix;
}): Promise<AttendanceOutcome> {
  const supabase = requireSupabaseClient();
  const deviceId = await getOrCreateDeviceId();
  const { data, error } = await supabase.rpc("submit_attendance", {
    p_token: args.token,
    p_code: args.code.trim(),
    p_latitude: args.fix.latitude,
    p_longitude: args.fix.longitude,
    p_accuracy: args.fix.accuracyMeters,
    p_captured_at: new Date(args.fix.capturedAtMs).toISOString(),
    p_device_id: deviceId,
  });
  if (error) return { ok: false, ...classify(error.message) };
  return { ok: true, recordId: (data as any)?.record_id, distanceM: (data as any)?.distance_m ?? 0 };
}
