#!/usr/bin/env node
/**
 * STARS — simple RPC stress test (no dependencies, Node 20.6+).
 *
 * Fires many concurrent requests at a Supabase RPC and reports success rate +
 * latency percentiles. Used by test story TC-B2 (stress testing).
 *
 * Usage (from repo root):
 *   node scripts/stress-test-rpc.mjs
 *   node scripts/stress-test-rpc.mjs get_university_overview 300 30
 *                                     ^ rpc name          ^ total ^ concurrency
 *
 * Reads EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY from the
 * environment, or from a local .env file if not already set.
 */

import { readFileSync } from "node:fs";

// --- tiny .env loader (only fills vars that aren't already set) ---
function loadEnv(file = ".env") {
  try {
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && process.env[m[1]] === undefined) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    /* no .env — rely on real env vars */
  }
}
loadEnv();

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const RPC = process.argv[2] || "get_university_overview";
const TOTAL = Number(process.argv[3] || 200);
const CONCURRENCY = Number(process.argv[4] || 20);
const PASS_RATE = 0.99; // success threshold for exit code

if (!URL || !KEY) {
  console.error("Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY (set them or add a .env).");
  process.exit(2);
}

const endpoint = `${URL.replace(/\/$/, "")}/rest/v1/rpc/${RPC}`;
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

async function oneRequest() {
  const start = performance.now();
  try {
    const res = await fetch(endpoint, { method: "POST", headers, body: "{}" });
    await res.text();
    return { ok: res.status >= 200 && res.status < 300, status: res.status, ms: performance.now() - start };
  } catch (e) {
    return { ok: false, status: 0, ms: performance.now() - start, error: String(e) };
  }
}

function pct(sorted, p) {
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

const results = [];
console.log(`\nStress test → ${RPC}  (${TOTAL} requests, ${CONCURRENCY} at a time)\n`);
const wallStart = performance.now();

let sent = 0;
async function worker() {
  while (sent < TOTAL) {
    sent++;
    results.push(await oneRequest());
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

const wallMs = performance.now() - wallStart;
const ok = results.filter((r) => r.ok).length;
const fail = results.length - ok;
const lat = results.map((r) => r.ms).sort((a, b) => a - b);
const rate = ok / results.length;

console.log(`Requests   : ${results.length}`);
console.log(`Succeeded  : ${ok}   Failed: ${fail}   Success rate: ${(rate * 100).toFixed(1)}%`);
console.log(`Throughput : ${(results.length / (wallMs / 1000)).toFixed(1)} req/s over ${(wallMs / 1000).toFixed(1)}s`);
console.log(`Latency ms : min ${lat[0]?.toFixed(0)}  p50 ${pct(lat, 50).toFixed(0)}  p95 ${pct(lat, 95).toFixed(0)}  max ${lat.at(-1)?.toFixed(0)}`);
if (fail > 0) {
  const sample = results.find((r) => !r.ok);
  console.log(`First failure: status ${sample.status}${sample.error ? " — " + sample.error : ""}`);
}
console.log("");

if (rate < PASS_RATE) {
  console.error(`FAIL — success rate ${(rate * 100).toFixed(1)}% is below ${(PASS_RATE * 100).toFixed(0)}%`);
  process.exit(1);
}
console.log(`PASS — success rate ${(rate * 100).toFixed(1)}% ≥ ${(PASS_RATE * 100).toFixed(0)}%`);
