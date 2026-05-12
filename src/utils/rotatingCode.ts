/** 5s windows — code and QR payload derived locally from seed + window (no Firestore writes per tick). */
export const ATTENDANCE_CODE_WINDOW_MS = 5_000;

export function attendanceTimeWindow(nowMs = Date.now()) {
  return Math.floor(nowMs / ATTENDANCE_CODE_WINDOW_MS);
}

/** Deterministic 6-digit code for the current window. */
export function attendanceCodeForWindow(seed: string, windowIndex: number): string {
  const str = `${seed}:${windowIndex}`;
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const n = Math.abs(h) % 1_000_000;
  return n.toString().padStart(6, "0");
}

export function currentAttendanceCode(seed: string, nowMs = Date.now()) {
  const w = attendanceTimeWindow(nowMs);
  return { code: attendanceCodeForWindow(seed, w), windowIndex: w, nextChangeAt: (w + 1) * ATTENDANCE_CODE_WINDOW_MS };
}

/** Allow prev/current/next window so clock skew still works. */
export function verifyAttendanceCode(seed: string, entered: string, nowMs = Date.now()) {
  const w = attendanceTimeWindow(nowMs);
  const trimmed = entered.trim();
  const cur = attendanceCodeForWindow(seed, w);
  const prev = attendanceCodeForWindow(seed, w - 1);
  const next = attendanceCodeForWindow(seed, w + 1);
  return { ok: trimmed === cur || trimmed === prev || trimmed === next, windowIndex: w };
}
