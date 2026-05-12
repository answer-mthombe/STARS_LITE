import { currentAttendanceCode } from "@/utils/rotatingCode";

/** Deep link–style payload; encodes session + current rotating code (must match manual entry). */
export function buildAttendanceQrPayload(sessionId: string, seed: string, nowMs = Date.now()) {
  const { code } = currentAttendanceCode(seed, nowMs);
  const sid = encodeURIComponent(sessionId);
  return `stars://attend?sid=${sid}&c=${code}`;
}

export function parseAttendanceQrPayload(raw: string): { sessionId: string; code: string } | null {
  const s = raw.trim();
  if (!s) return null;
  const qIdx = s.indexOf("?");
  if (qIdx < 0) return null;
  const query = s.slice(qIdx + 1);
  const params = new URLSearchParams(query);
  const sessionId = params.get("sid") ?? params.get("sessionId");
  const code = params.get("c") ?? params.get("code");
  if (!sessionId || !code) return null;
  const trimmed = code.trim();
  if (!/^\d{6}$/.test(trimmed)) return null;
  return { sessionId: decodeURIComponent(sessionId), code: trimmed };
}
