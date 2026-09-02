import { Platform } from "react-native";

import { mockDB } from "@/mockDB/mockDBService";
import { haversineMeters } from "@/utils/haversine";
import { getOrCreateDeviceId } from "@/utils/deviceId";
import {
  CHALLENGE_WINDOW_MS,
  GPS_POLL_MS,
  challengeTimeBucket,
  computeChallengeSeed,
  gpsBucketHash,
  seedToInt32,
} from "@/utils/challengeBuckets";
import type { GeoPoint } from "@/models/Attendance";
import { requireSupabaseClient, isSupabaseEnabled } from "@/supabase/client";

import { attendanceSessionRepository } from "./supabase";
import { saveRecord, hasAlreadyCheckedIn } from "./supabase/attendanceRecordRepository";

export type ChallengeObjectShape = "circle" | "square" | "triangle" | "star" | "diamond" | "hexagon" | "cross" | "arrow";
export type ChallengeObjectColor =
  | "red"
  | "blue"
  | "green"
  | "yellow"
  | "purple"
  | "orange"
  | "white"
  | "teal";
export type ChallengeObjectSize = "small" | "medium" | "large";
export type ChallengeObjectPattern = "solid" | "outline" | "striped" | "dotted" | "half";

export interface ChallengeObject {
  shape: ChallengeObjectShape;
  color: ChallengeObjectColor;
  size: ChallengeObjectSize;
  pattern: ChallengeObjectPattern;
}

export interface AttendanceChallenge {
  id: string;
  sessionId: string;
  studentId: string;
  moduleId: string;
  openedAtMs: number;
  openedTimeBucket: number;
  deviceId: string;
  gpsBucketHash: string;
  /** JOB-033: raw seed hash (hex digest), sent to the server so it can be
   *  compared against the server's own independently-recomputed seed. */
  seedHex: string;
  tierUsed: 1;
  requiredTaps: number;
  targetIndex: number; // 0..5
  objects: ChallengeObject[]; // length 6
}

type BeginArgs = {
  sessionId: string;
  moduleId: string;
  studentId: string;
  codeEntered: string;
  studentLocation: { latitude: number; longitude: number; accuracyMeters?: number; capturedAtMs?: number };
};

type SubmitArgs = {
  challengeId: string;
  tappedIndex: number;
  tapCount: number;
  gpsPolls: Array<{ latitude: number; longitude: number; accuracyMeters?: number; capturedAtMs: number }>;
};

function id(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

const shapes: ChallengeObjectShape[] = ["circle", "square", "triangle", "star", "diamond", "hexagon", "cross", "arrow"];
const colors: ChallengeObjectColor[] = ["red", "blue", "green", "yellow", "purple", "orange", "white", "teal"];
const sizes: ChallengeObjectSize[] = ["small", "medium", "large"];
const patterns: ChallengeObjectPattern[] = ["solid", "outline", "striped", "dotted", "half"];

function objFromIndex(idx: number): ChallengeObject {
  const s = shapes[idx % shapes.length]!;
  const c = colors[Math.floor(idx / shapes.length) % colors.length]!;
  const sz = sizes[Math.floor(idx / (shapes.length * colors.length)) % sizes.length]!;
  const p = patterns[Math.floor(idx / (shapes.length * colors.length * sizes.length)) % patterns.length]!;
  return { shape: s, color: c, size: sz, pattern: p };
}

function makeObjectPool(seedInt: number): ChallengeObject[] {
  const poolSize = shapes.length * colors.length * sizes.length * patterns.length; // 960
  const offset = (seedInt >>> 8) % poolSize;
  const objs: ChallengeObject[] = [];
  for (let i = 0; i < 6; i++) objs.push(objFromIndex((offset + i * 11) % poolSize));
  return objs;
}

function withinRadius(anchor: GeoPoint, point: GeoPoint, radiusMeters: number): { ok: boolean; distance: number } {
  const d = haversineMeters(point, anchor);
  return { ok: d <= radiusMeters, distance: d };
}

// In-memory challenge tracker
const challenges = new Map<string, AttendanceChallenge>();
const wrongObjectCounts = new Map<string, { count: number; lockedUntilMs: number }>();

function lockKey(sessionId: string, deviceId: string) {
  return `${sessionId}:${deviceId}`;
}

/**
 * JOB-033: Shape of response from verify-attendance-record Edge Function.
 */
interface VerifyAttendanceResponse {
  passed: boolean;
  checks: {
    seed_valid: boolean;
    object_valid: boolean;
    within_radius: boolean;
    distance_meters: number;
    plausible: boolean;
  };
}

/** Map server check failures to explicit user-facing gate messages. */
function reasonFromChecks(checks: VerifyAttendanceResponse["checks"]): string {
  if (!checks.seed_valid) return "Verification failed. Open the challenge again.";
  if (!checks.object_valid) return "Wrong object. Try again.";
  if (!checks.within_radius) return "Location left the session area during check-in.";
  if (!checks.plausible) return "Location not confirmed. Stay in the room.";
  return "Verification failed.";
}

export const attendanceChallengeService = {
  async begin(args: BeginArgs): Promise<{ ok: true; challengeId: string } | { ok: false; reason: string }> {
    mockDB.touch();

    const session = isSupabaseEnabled()
      ? await attendanceSessionRepository.getActiveSession(args.sessionId)
      : mockDB.read("attendanceSessions", args.sessionId);

    if (!session || !session.active) return { ok: false, reason: "Session not active or missing." };
    if (new Date(session.expiresAt).getTime() <= Date.now()) return { ok: false, reason: "Session has ended. See your coordinator." };

    const deviceId = await getOrCreateDeviceId();

    if (isSupabaseEnabled()) {
      const alreadyCheckedIn = await hasAlreadyCheckedIn(args.sessionId, deviceId);
      if (alreadyCheckedIn) {
        return { ok: false, reason: "You have already marked your attendance for this session." };
      }
    } else {
      const dup = mockDB.query("attendanceRecords", { sessionId: args.sessionId }).some((r) => r.deviceId === deviceId);
      if (dup) return { ok: false, reason: "Already checked in for this session." };
    }

    const lk = lockKey(args.sessionId, deviceId);
    const lock = wrongObjectCounts.get(lk);
    if (lock && lock.lockedUntilMs > Date.now()) {
      const secs = Math.ceil((lock.lockedUntilMs - Date.now()) / 1000);
      return { ok: false, reason: `Too many wrong attempts. Try again in ${secs}s.` };
    }

    const capturedAtMs = args.studentLocation.capturedAtMs ?? Date.now();
    const ageMs = Date.now() - capturedAtMs;
    if (ageMs > 4_000) return { ok: false, reason: "Location not confirmed. Stay in the room." };
    const acc = args.studentLocation.accuracyMeters ?? (Platform.OS === "web" ? 10 : 999);
    if (acc > 30) return { ok: false, reason: "Location not confirmed. Stay in the room." };

    const inside = withinRadius(
      session.lecturerLocation,
      { latitude: args.studentLocation.latitude, longitude: args.studentLocation.longitude },
      session.radius
    );

    if (!inside.ok) return { ok: false, reason: "Location not confirmed. Stay in the room." };

    const openedAtMs = Date.now();
    const openedTimeBucket = challengeTimeBucket(openedAtMs);
    const gbh = await gpsBucketHash({ latitude: args.studentLocation.latitude, longitude: args.studentLocation.longitude });
    const seedHex = await computeChallengeSeed({
      sessionId: args.sessionId,
      deviceId,
      gpsBucketHash: gbh,
      timeBucket: openedTimeBucket,
    });
    const seedInt = seedToInt32(seedHex);
    const targetIndex = seedInt % 6;
    const requiredTaps = 2 + ((seedInt >>> 24) % 6);
    const objects = makeObjectPool(seedInt);

    const challenge: AttendanceChallenge = {
      id: id("chal"),
      sessionId: args.sessionId,
      moduleId: args.moduleId,
      studentId: args.studentId,
      openedAtMs,
      openedTimeBucket,
      deviceId,
      gpsBucketHash: gbh,
      seedHex,
      tierUsed: 1,
      requiredTaps,
      targetIndex,
      objects,
    };
    challenges.set(challenge.id, challenge);
    return { ok: true, challengeId: challenge.id };
  },

  get(challengeId: string): AttendanceChallenge | null {
    return challenges.get(challengeId) ?? null;
  },

  async submit(args: SubmitArgs): Promise<{ ok: true } | { ok: false; reason: string }> {
    const chal = challenges.get(args.challengeId);
    if (!chal) return { ok: false, reason: "Challenge expired. Open the challenge again." };

    const session = isSupabaseEnabled()
      ? await attendanceSessionRepository.getActiveSession(chal.sessionId)
      : mockDB.read("attendanceSessions", chal.sessionId);

    if (!session || !session.active) return { ok: false, reason: "Session has ended. See your coordinator." };
    if (new Date(session.expiresAt).getTime() <= Date.now()) return { ok: false, reason: "Session has ended. See your coordinator." };

    const elapsedMs = Date.now() - chal.openedAtMs;
    if (elapsedMs > CHALLENGE_WINDOW_MS) return { ok: false, reason: "Time expired. Open the challenge again." };

    if (isSupabaseEnabled()) {
      const alreadyCheckedIn = await hasAlreadyCheckedIn(chal.sessionId, chal.deviceId);
      if (alreadyCheckedIn) return { ok: false, reason: "Already checked in for this session." };
    } else {
      const dup = mockDB.query("attendanceRecords", { sessionId: chal.sessionId }).some((r) => r.deviceId === chal.deviceId);
      if (dup) return { ok: false, reason: "Already checked in." };
    }

    const polls = args.gpsPolls.filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude));
    if (polls.length < 1) return { ok: false, reason: "Location left the session area during check-in." };

    const tooManyUnknown = args.gpsPolls.length - polls.length > 1;
    if (tooManyUnknown) return { ok: false, reason: "Location left the session area during check-in." };

    for (const p of polls) {
      const ageMs = Date.now() - p.capturedAtMs;
      if (ageMs > 60_000) return { ok: false, reason: "Location not confirmed. Stay in the room." };
      const acc = p.accuracyMeters ?? 10;
      if (acc > 100) return { ok: false, reason: "Location not confirmed. Stay in the room." };
      const inside = withinRadius(session.lecturerLocation, { latitude: p.latitude, longitude: p.longitude }, session.radius);
      if (!inside.ok) return { ok: false, reason: "Location left the session area during check-in." };
    }

    if (args.tappedIndex !== chal.targetIndex) {
      const k = lockKey(chal.sessionId, chal.deviceId);
      const prev = wrongObjectCounts.get(k) ?? { count: 0, lockedUntilMs: 0 };
      const nextCount = prev.count + 1;
      const lockedUntilMs = nextCount >= 2 ? Date.now() + 60_000 : 0;
      wrongObjectCounts.set(k, { count: nextCount, lockedUntilMs });
      return { ok: false, reason: nextCount >= 2 ? "Wrong object. Try again in 60s." : "Wrong object. Try again." };
    }

    if (args.tapCount !== chal.requiredTaps) return { ok: false, reason: "Action not detected. Try again." };

    const last = polls[polls.length - 1]!;
    const distance = haversineMeters(
      { latitude: last.latitude, longitude: last.longitude },
      session.lecturerLocation
    );

    try {
      if (isSupabaseEnabled()) {
        const supabase = requireSupabaseClient();

        const { data, error } = await supabase.functions.invoke<VerifyAttendanceResponse>(
          "verify-attendance-record",
          {
            body: {
              session_id: chal.sessionId,
              device_id: chal.deviceId,
              gps_bucket_hash: chal.gpsBucketHash,
              time_bucket: chal.openedTimeBucket,
              client_seed: chal.seedHex,
              tapped_index: args.tappedIndex,
              expected_object: chal.targetIndex,
              latitude: last.latitude,
              longitude: last.longitude,
              target_latitude: session.lecturerLocation.latitude,
              target_longitude: session.lecturerLocation.longitude,
              max_radius_meters: session.radius,
              tier: "standard",
            },
          }
        );

        if (error) {
          console.error("[JOB-033] verify-attendance-record invoke failed:", error);
          return { ok: false, reason: "Could not verify attendance. Please try again." };
        }

        if (!data || !data.passed) {
          console.log("[JOB-033] Server rejected attendance:", data?.checks);
          return { ok: false, reason: data ? reasonFromChecks(data.checks) : "Verification failed." };
        }

        await saveRecord({
          id: chal.id,
          session_id: chal.sessionId,
          student_id: chal.studentId,
          device_id: chal.deviceId,
          time_bucket: chal.openedTimeBucket,
          gps_bucket_hash: chal.gpsBucketHash,
          tapped_index: args.tappedIndex,
          tier_used: chal.tierUsed,
          action_hash: `taps:${args.tapCount}`,
          passed: true,
          timestamp: new Date().toISOString(),
          distance,
          verified: true,
        });

        console.log("✅ Attendance verified by server and saved");
      } else {
        mockDB.create("attendanceRecords", {
          sessionId: chal.sessionId,
          studentId: chal.studentId,
          timestamp: new Date().toISOString(),
          distance,
          verified: true,
          deviceId: chal.deviceId,
          timeBucket: chal.openedTimeBucket,
          gpsBucketHash: chal.gpsBucketHash,
          tappedIndex: args.tappedIndex,
          tierUsed: chal.tierUsed,
          actionHash: `taps:${args.tapCount}`,
          passed: true,
        } as any);
      }
    } catch (e: any) {
      return { ok: false, reason: e.message || "Failed to save attendance" };
    }

    challenges.delete(chal.id);
    return { ok: true };
  },

  windowMs: CHALLENGE_WINDOW_MS,
  gpsPollMs: GPS_POLL_MS,
};