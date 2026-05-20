import * as Crypto from "expo-crypto";

export const CHALLENGE_WINDOW_MS = 10_000;
export const GPS_POLL_MS = 2_000;

export function challengeTimeBucket(nowMs = Date.now()): number {
  return Math.floor(nowMs / CHALLENGE_WINDOW_MS);
}

/**
 * Simple GPS bucket for demo: quantize lat/lng to ~100m cells (3 decimals),
 * then hash for storage/seed mixing.
 */
export async function gpsBucketHash(args: { latitude: number; longitude: number }): Promise<string> {
  const latQ = Math.round(args.latitude * 1000) / 1000;
  const lngQ = Math.round(args.longitude * 1000) / 1000;
  const raw = `${latQ.toFixed(3)},${lngQ.toFixed(3)}`;
  const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, raw);
  return digest.slice(0, 8);
}

/** Stable seed used to generate grid + expected answer. */
export async function computeChallengeSeed(args: {
  sessionId: string;
  deviceId: string;
  gpsBucketHash: string;
  timeBucket: number;
}): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${args.sessionId}:${args.deviceId}:${args.gpsBucketHash}:${args.timeBucket}`
  );
}

/** Convert hex digest to a safe 32-bit integer for mod operations. */
export function seedToInt32(hexDigest: string): number {
  const h = hexDigest.slice(0, 8);
  const n = Number.parseInt(h, 16);
  return Number.isFinite(n) ? (n >>> 0) : 0;
}

