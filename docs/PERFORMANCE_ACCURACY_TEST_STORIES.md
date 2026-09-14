# STARS — Performance & Accuracy Test Stories (Devs)

Goal: prove the attendance system is **fast even for a large audience** (a full lecture hall marking at once) **and accurate** (nobody double-marked, no false PRESENT, geofence always enforced). Companion to [TEST_CASE_STORIES.md](./TEST_CASE_STORIES.md) / [SECURITY_TEST_STORIES.md](./SECURITY_TEST_STORIES.md); implements the testing section of [ATTENDANCE_SECURITY_ARCHITECTURE.md](./ATTENDANCE_SECURITY_ARCHITECTURE.md) §18–19.

## Baseline already proven (2026-09-14)

The server-side attendance authority (`begin_attendance` / `submit_attendance`, migration `20260914090000`) was tested live: **16/16 functional checks**, including **10 concurrent submits on one token → exactly 1 row** (atomic race handling), and the `begin_attendance` burst harness hit **100% success, p50 ~250 ms, p95 ~565 ms at 10 concurrent**. These stories let devs re-run and push harder.

## Who does what

| Owner | Stories | Focus |
|-------|---------|-------|
| **Basil** | TC-P1, TC-P2, TC-P3 | Performance & scaling (read load, submit-burst, EXPLAIN/index audit) |
| **Gugu** | TC-A1, TC-A2, TC-A3 | Accuracy (exactly-once, geofence boundary, code-window boundary) |

Pair up on the first run of each. Both use the terminal + the harness scripts.

## The scaling rule (read this first)

From the database-scaling-playbook: **scale in order of cost, and only climb a rung when a *measured* bottleneck demands it.** Never reach for sharding / partitioning / multi-region "just in case."

**Where each rung applies to STARS attendance:**

| Concern | STARS reality | Right rung |
|---------|---------------|-----------|
| Lecturer code display + dashboards | reads; the rotating code is *derived*, not stored per tick (no per-tick writes) | vertical + indexes; **cache** the hot read only if measured hot; **read replicas** far later |
| **Attendance submit burst** (session start) | the real load: a hall submits within ~30 s | short atomic RPC + **indexes**; all hot lookups are PK/unique-index; one-row token lock held microseconds |
| Analytics / audit side-effects | non-critical writes | **async queue** them off the submit path if they ever slow it |
| "We might get huge" | not measured | **do nothing** — keep the clean seams; don't shard without a measured write-throughput ceiling on the primary |

---

## TC-P1 · Read-path load (code polling + analytics)

**Type:** Performance · reads · **Owner:** Basil

**Goal:** confirm the read hot paths stay fast under many simultaneous callers.

**What you'll need:** `.env`, terminal.

**How:**
```bash
# analytics read (anon RPC) — 500 requests, 50 concurrent
node scripts/stress-test-rpc.mjs get_university_overview 500 50
```
(For the authed lecturer code path `get_active_session_code`, use the attendance harness pattern with a lecturer JWT.)

**Expected result:** a summary with success rate + p50/p95 latency.

**Success:** 100% success, **p95 under ~1000 ms** at 50 concurrent.

**Scaling verdict:** if p95 is comfortable, reads are fine as-is. If a specific read becomes hot later, add **cache-aside with explicit invalidation** (not just a TTL) before considering replicas. Do **not** add replicas/sharding here.

---

## TC-P2 · Attendance submit burst — the large-audience test

**Type:** Performance · writes (the important one) · **Owner:** Basil

**Goal:** simulate a hall marking at once and confirm speed **and** exactly-once accuracy under that burst.

**What you'll need:** an **active test session** the test student is enrolled in (create one in staging), the demo student password from your lead.

**How (token-issue burst, safe, runnable now):**
```bash
export STARS_TEST_EMAIL=22001234@live.mut.ac.za
export STARS_TEST_PASSWORD=...            # from your lead — never commit
node scripts/load-test-attendance.mjs <session_id> 300 50
```
**How (full submit burst — do in STAGING):** seed N test students (auth users + `user_profiles` + enrolment), then fire `begin_attendance`→`submit_attendance` for each concurrently against one session (extend `scratch: test_attendance` pattern). Assert exactly N rows for N distinct students, zero duplicates.

**Expected result:**
```
Succeeded  : 300/300  (100.0%)
Throughput : ~30 req/s
Latency ms : min .. p50 ~250  p95 <1000  max ..
```

**Success:** 100% success, **p95 under target** (set your SLA, e.g. < 1.5 s end-to-end), and in the full submit test **exactly one row per student, zero duplicates**. A failed/slow tail or any duplicate is a finding.

**Scaling verdict:** measure **write throughput on the primary**. If it isn't maxed, you're done — the indexed schema + short RPC is the correct architecture. Only if a measured write ceiling is hit do you consider async-queueing side effects, then partitioning `attendance_records` by term/date. **Sharding is not on the table without that measurement.**

---

## TC-P3 · Index / EXPLAIN audit at scale

**Type:** Performance · scaling audit · **Owner:** Basil

**Goal:** confirm the hot-path queries use indexes once the tables are big (they choose seq scans on tiny demo data — that's correct, not a bug).

**What you'll need:** a staging DB where you can seed volume; `psql`/SQL editor.

**How:**
1. Seed scale into staging (e.g. 50k `attendance_records`, 5k `attendance_tokens`).
2. `EXPLAIN ANALYZE` the hot lookups:
   ```sql
   explain analyze select 1 from attendance_tokens where token = 'x';
   explain analyze select 1 from attendance_records where session_id='s' and student_id='y';
   explain analyze select 1 from attendance_sessions where id='s';
   ```

**Expected result:** **Index Scan / Index Only Scan** on all three at volume (token PK, `attendance_records_session_student_unique`, session PK).

**Success:** no **Seq Scan** on a large table in the submit path. If one appears, add/adjust the index — that's the cheapest rung and the right fix.

---

## TC-A1 · Exactly-once under concurrency

**Type:** Accuracy · **Owner:** Gugu

**Goal:** a student can never be double-marked, even with parallel taps or two devices.

**How:**
1. Re-run the race section of the attendance test (10 parallel `submit_attendance` on one token) → assert **exactly 1** `PRESENT` and **1** row.
2. Two-device variant: same student, two `device_id`s, two tokens, submit both → the **second** must fail `DUPLICATE_ATTENDANCE` (the `UNIQUE(session_id, student_id)` constraint).

**Expected result:** one row per student per session, always.

**Success:** 0 duplicates in every run. Any second row is a critical accuracy bug.

---

## TC-A2 · Geofence boundary accuracy

**Type:** Accuracy · **Owner:** Gugu

**Goal:** the mandatory geofence accepts inside, rejects outside, and the server distance is right.

**How:** against a point venue (lat/lng, `radius_meters`):
- submit a GPS fix **just inside** the radius → `PRESENT`, `distance_m` < radius.
- submit **just outside** → `GEOFENCE_FAILED`.
- (polygon venue) a point inside vs outside the polygon.
- denied/absent location → cannot submit; missing/`accuracy > 100` → `GPS_INVALID`; stale fix → `GPS_STALE`.

**Expected result:** inside PRESENT with a plausible `distance_m`; every outside/invalid case rejected with **no row**.

**Success:** no PRESENT is ever produced outside the radius or without a valid, fresh location. (Geofence is mandatory — there is no bypass.)

---

## TC-A3 · Rotating-code window accuracy

**Type:** Accuracy · **Owner:** Gugu

**Goal:** only the current (and one previous, for skew) window's code is accepted.

**How:**
1. Read the current code (`session_code(seed, attendance_window())`).
2. Submit it → `PRESENT` (fresh token).
3. Submit a code from **two windows ago** (`attendance_window()-2`) → `INVALID_CODE`.
4. Across a window rollover (~20 s), confirm the just-previous code still works but older ones don't.

**Expected result:** current/previous accepted, older rejected.

**Success:** an expired code never marks a student present.

---

## Reporting

Use the **"Test case report"** issue template (label `test-case`), attach the harness output / EXPLAIN plans / percentiles, add a **scaling verdict** line (which rung, and why nothing further is needed yet), and move the card to the **Test Cases** column. Performance regressions or any duplicate → also file a `bug` (+ `priority:high` for accuracy bugs).

## Command reference

| Do this | Command |
|---------|---------|
| Read-path load | `node scripts/stress-test-rpc.mjs <rpc> <total> <concurrency>` |
| Attendance burst | `node scripts/load-test-attendance.mjs <session_id> <total> <concurrency>` |
| Functional/accuracy suite (pattern) | see `scratchpad`/`test_attendance` flow in ATTENDANCE_SECURITY_ARCHITECTURE.md §18 |
