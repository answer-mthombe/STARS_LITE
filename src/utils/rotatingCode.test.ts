import { describe, it, expect } from "vitest";

import {
  attendanceCodeForWindow,
  verifyAttendanceCode,
  ATTENDANCE_CODE_WINDOW_MS,
} from "./rotatingCode";

// Example automated tests for TC-G3 (automation testing).
// Pure functions -> no app, no network, no database needed.

describe("attendanceCodeForWindow", () => {
  it("is a 6-digit numeric string", () => {
    const code = attendanceCodeForWindow("seed-123", 42);
    expect(code).toMatch(/^\d{6}$/);
  });

  it("is deterministic (same seed + window => same code)", () => {
    expect(attendanceCodeForWindow("seed-123", 42)).toBe(attendanceCodeForWindow("seed-123", 42));
  });

  it("changes when the window changes", () => {
    expect(attendanceCodeForWindow("seed-123", 42)).not.toBe(attendanceCodeForWindow("seed-123", 43));
  });
});

describe("verifyAttendanceCode", () => {
  const seed = "abc";
  const now = 100 * ATTENDANCE_CODE_WINDOW_MS + 10; // deep inside window 100

  it("accepts the current window code", () => {
    const code = attendanceCodeForWindow(seed, 100);
    expect(verifyAttendanceCode(seed, code, now).ok).toBe(true);
  });

  it("accepts the previous and next window (clock skew tolerance)", () => {
    expect(verifyAttendanceCode(seed, attendanceCodeForWindow(seed, 99), now).ok).toBe(true);
    expect(verifyAttendanceCode(seed, attendanceCodeForWindow(seed, 101), now).ok).toBe(true);
  });

  it("rejects a wrong code", () => {
    expect(verifyAttendanceCode(seed, "000000", now).ok).toBe(false);
  });
});
