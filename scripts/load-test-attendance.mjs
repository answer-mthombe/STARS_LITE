#!/usr/bin/env node
/**
 * STARS — attendance load harness (no dependencies, Node 20.6+).
 *
 * Simulates a burst of students hitting begin_attendance concurrently and
 * reports success rate + latency percentiles. Used by perf story TC-P2.
 *
 * Prereqs: an ACTIVE test session the test student is enrolled in, with NO
 * existing attendance record for that student (so begin_attendance issues a
 * token instead of returning DUPLICATE). Tokens auto-expire in 90s — no cleanup.
 *
 * Usage (from repo root):
 *   export STARS_TEST_EMAIL=22001234@live.mut.ac.za     # a demo student
 *   export STARS_TEST_PASSWORD=...                       # from your team lead (never commit)
 *   node scripts/load-test-attendance.mjs <session_id> [total=200] [concurrency=20]
 */
import { readFileSync } from "node:fs";

function loadEnv(f = ".env") {
  try { for (const l of readFileSync(f, "utf8").split("\n")) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  } } catch {}
}
loadEnv();

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const EMAIL = process.env.STARS_TEST_EMAIL;
const PASSWORD = process.env.STARS_TEST_PASSWORD;
const SESSION = process.argv[2];
const TOTAL = Number(process.argv[3] || 200);
const CONC = Number(process.argv[4] || 20);

if (!URL || !ANON) { console.error("Missing EXPO_PUBLIC_SUPABASE_URL / ANON_KEY (.env)."); process.exit(2); }
if (!EMAIL || !PASSWORD) { console.error("Set STARS_TEST_EMAIL and STARS_TEST_PASSWORD env vars."); process.exit(2); }
if (!SESSION) { console.error("Usage: node scripts/load-test-attendance.mjs <session_id> [total] [concurrency]"); process.exit(2); }

const login = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
  method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
}).then((r) => r.json());
if (!login.access_token) { console.error("Login failed:", login.error_description || login.msg || login); process.exit(1); }
const JWT = login.access_token;

const headers = { apikey: ANON, Authorization: `Bearer ${JWT}`, "Content-Type": "application/json" };
async function beginOnce() {
  const t0 = performance.now();
  try {
    const r = await fetch(`${URL}/rest/v1/rpc/begin_attendance`, { method: "POST", headers, body: JSON.stringify({ p_session_id: SESSION }) });
    const b = await r.json();
    return { ok: r.status < 300 && b.token, ms: performance.now() - t0, note: b.message || "" };
  } catch (e) { return { ok: false, ms: performance.now() - t0, note: String(e) }; }
}

console.log(`\nAttendance load → begin_attendance on ${SESSION}  (${TOTAL} req, ${CONC} concurrent)\n`);
const res = [];
let sent = 0;
const wall = performance.now();
await Promise.all(Array.from({ length: CONC }, async () => { while (sent < TOTAL) { sent++; res.push(await beginOnce()); } }));
const wallMs = performance.now() - wall;
const ok = res.filter((r) => r.ok).length;
const lat = res.map((r) => r.ms).sort((a, b) => a - b);
const pct = (p) => lat[Math.min(lat.length - 1, Math.floor((p / 100) * lat.length))] || 0;
console.log(`Succeeded  : ${ok}/${res.length}  (${((ok / res.length) * 100).toFixed(1)}%)`);
console.log(`Throughput : ${(res.length / (wallMs / 1000)).toFixed(1)} req/s`);
console.log(`Latency ms : min ${lat[0]?.toFixed(0)}  p50 ${pct(50).toFixed(0)}  p95 ${pct(95).toFixed(0)}  max ${lat.at(-1)?.toFixed(0)}`);
if (ok < res.length) console.log(`First non-ok note: ${res.find((r) => !r.ok)?.note}`);
console.log(`\nScaling verdict: if p95 is comfortable and success ~100%, one primary + the existing indexes are enough. Climb the ladder only if a measured write-throughput ceiling is hit (see database-scaling-playbook).`);
