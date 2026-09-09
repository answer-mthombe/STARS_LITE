# STARS — Performance Test Cases: Speed & Stress (Write-Your-Own Scripts)

Companion to `TEST_CASE_STORIES.md`, `SECURITY_TEST_STORIES.md`, and `AUTHORING_TEST_CASES.md`. Same baby-step
format, same GitHub reporting flow. This one is different in one important way: **there is no ready-made script
for you to run.** You will write your own small Node.js script, run it against the live backend, and report the
numbers it prints. That's the actual skill performance testing teaches — not just running someone else's tool.

You already have one worked example to learn the pattern from: `scripts/stress-test-rpc.mjs` (used in TC-B2).
Everything below builds on that same idea — a script that fires requests and prints timing/success numbers —
just applied to new targets and, for speed testing, a different question.

> **Golden rule:** a speed test asks "how fast is ONE request, normally?" A stress test asks "what happens when
> MANY requests hit at once?" Same tools, different question, different script.

## Who does what

Same split as `TEST_CASE_STORIES.md`: **Basil owns scripts/backend/stress**, **Gugu owns
functional/frontend-facing/UI**. Each of you gets a mix of speed *and* stress cases, so you both practise both
kinds — but the target each case points at matches your usual lane.

| Owner | Speed cases | Stress cases |
|---|---|---|
| **Gugu** | TC-SPEED1, TC-SPEED5, TC-SPEED8, TC-SPEED9, TC-SPEED10 | TC-STRESS3, TC-STRESS6, TC-STRESS8, TC-STRESS10 |
| **Basil** | TC-SPEED2, TC-SPEED3, TC-SPEED4, TC-SPEED6, TC-SPEED7 | TC-STRESS1, TC-STRESS2, TC-STRESS4, TC-STRESS5, TC-STRESS7, TC-STRESS9 |

You can read (and re-run) each other's scripts — pairing up the first time is encouraged, same as always. If a
case doesn't fit your calendar, swap it with your teammate, just say so in the issue.

---

## 1. Two questions, two kinds of test

| Kind | Question it answers | What you vary | What you read off |
|---|---|---|---|
| **Speed test** | Is a single normal request fast enough? | Nothing — you run it *alone*, repeatedly, calmly | min / avg / p50 / p95 latency in milliseconds |
| **Stress test** | Does it still work — and how well — under many *at once*? | Concurrency (how many in parallel) and volume (how many total) | success rate %, throughput (req/s), how latency changes as load rises |

A feature isn't performance-tested until you've asked both questions about it.

---

## 2. Words you'll see (30-second glossary)

- **Latency** — the time from sending one request to getting its response back, in milliseconds.
- **Throughput** — how many requests complete per second, on average, during a run.
- **Concurrency** — how many requests are in flight *at the same time*.
- **p50 (median)** — half of all requests were faster than this number.
- **p95** — 95% of requests were faster than this; the slowest 5% ("the tail") were worse. This is usually the
  number that matters most, because it's what your slowest real users feel.
- **Baseline** — the first timing/success numbers you record for a feature, before you've changed anything. Every
  later run gets compared back to this.
- **Regression** — a later run that is meaningfully slower or less reliable than the baseline.
- **Cold vs warm** — the very first request after the server/function has been idle is often slower ("cold
  start"). Always run a few warm-up requests you throw away before you start timing.
- **Ramp-up** — increasing load in steps (e.g. 10 → 50 → 100 concurrent) instead of jumping straight to the
  highest number, so you can see *where* things start to degrade, not just *whether* they do.

---

## 3. How to build a SPEED test script (method, baby steps)

**Goal of a speed test:** send the *same* single request many times, one after another (not in parallel), and
learn how fast it normally is and how much it varies.

1. **Pick one target.** One button, one screen load, one RPC, one query, one Edge Function call. Not "the app" —
   one specific thing (e.g. "logging in as a student", or "the `get_university_overview` RPC").
2. **Decide what a normal request looks like.** What URL / RPC name / payload would a real user actually trigger?
   Use realistic test data, not something huge or fake.
3. **Write a tiny Node.js script** that:
   - reads your `.env` for the Supabase URL + anon key (same pattern as `TC-B1`/`TC-B2`),
   - sends the request **N times in a row** (start with N = 30),
   - times each one with `performance.now()`,
   - throws away the first 3 results (warm-up / cold start),
   - sorts the remaining timings and prints **min, avg, p50, p95, max**.
4. **Run it, then run it again a few minutes later.** Numbers should be roughly similar — if they swing wildly,
   note that too.
5. **Record your first run as the baseline** in your report. Every future run for that same feature gets compared
   back to it.

### Copy-paste script skeleton (speed test)

Save this as e.g. `scripts/speed-test-login.mjs`, then edit the one line marked `// EDIT ME`.

```javascript
// scripts/speed-test-<name>.mjs
// Usage: node --env-file=.env scripts/speed-test-<name>.mjs [count]

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const count = Number(process.argv[2] || 30);

async function oneRequest() {
  const start = performance.now();
  // EDIT ME: replace with the actual request you're timing, e.g.
  // await fetch(`${URL}/rest/v1/rpc/get_university_overview`, {
  //   method: "POST",
  //   headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
  //   body: "{}",
  // });
  const res = await fetch(`${URL}/rest/v1/`, { headers: { apikey: KEY } });
  await res.text();
  const ms = performance.now() - start;
  return { ok: res.ok, status: res.status, ms };
}

function percentile(sorted, p) {
  const idx = Math.floor((p / 100) * (sorted.length - 1));
  return sorted[idx];
}

async function main() {
  console.log(`Warming up (3 throwaway requests)...`);
  for (let i = 0; i < 3; i++) await oneRequest();

  console.log(`Timing ${count} requests, one at a time...`);
  const timings = [];
  let failed = 0;
  for (let i = 0; i < count; i++) {
    const r = await oneRequest();
    if (!r.ok) failed++;
    timings.push(r.ms);
  }

  const sorted = [...timings].sort((a, b) => a - b);
  const avg = timings.reduce((a, b) => a + b, 0) / timings.length;

  console.log(`\nRequests   : ${count}   Failed: ${failed}`);
  console.log(`Latency ms : min ${sorted[0].toFixed(0)}  avg ${avg.toFixed(0)}  ` +
    `p50 ${percentile(sorted, 50).toFixed(0)}  p95 ${percentile(sorted, 95).toFixed(0)}  ` +
    `max ${sorted[sorted.length - 1].toFixed(0)}`);
}

main();
```

Run it with:
```
node --env-file=.env scripts/speed-test-<name>.mjs 30
```

---

## 4. How to build a STRESS test script (method, baby steps)

**Goal of a stress test:** fire *many* requests **at the same time** (in batches) and see whether the backend
keeps up — how many succeed, how fast, and whether it gets worse as load rises.

`scripts/stress-test-rpc.mjs` already does this for one RPC — read it first, it's the pattern to copy.

1. **Pick one target**, same as for a speed test (one RPC, one query, one Edge Function).
2. **Pick a starting load**: total requests and how many run in parallel at once (e.g. 200 total, 20 at a time).
3. **Write a script** that:
   - splits the total into batches of the concurrency size,
   - fires each batch with `Promise.all`, waits for it to finish, then fires the next batch,
   - records success/failure and latency for every single request,
   - at the end prints: total, succeeded, failed, success rate %, throughput (req/s), min/p50/p95/max latency.
4. **Ramp up**, don't jump.** Run it at a light load first (e.g. 200/20), record the result, then push harder
   (e.g. 500/50, then 1000/100). Note the load level where things start to get worse — that's the useful finding,
   not just the final number.
5. **Repeat each load level 2–3 times.** One bad run could be a fluke; a pattern across repeats is a real finding.
6. **Decide PASS/FAIL up front**, before you run it (e.g. "PASS = success rate ≥ 99% and p95 < 2000ms"), so you
   aren't tempted to move the goalposts after seeing the numbers.

### Copy-paste script skeleton (stress test)

Save this as e.g. `scripts/stress-test-<name>.mjs`, then edit the line marked `// EDIT ME`.

```javascript
// scripts/stress-test-<name>.mjs
// Usage: node --env-file=.env scripts/stress-test-<name>.mjs [total] [concurrency]

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const total = Number(process.argv[2] || 200);
const concurrency = Number(process.argv[3] || 20);

async function oneRequest() {
  const start = performance.now();
  // EDIT ME: replace with the actual request you're stressing, e.g.
  // const res = await fetch(`${URL}/rest/v1/rpc/get_faculty_overview`, {
  //   method: "POST",
  //   headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
  //   body: JSON.stringify({ p_faculty: "ENG" }),
  // });
  const res = await fetch(`${URL}/rest/v1/`, { headers: { apikey: KEY } });
  await res.text();
  const ms = performance.now() - start;
  return { ok: res.ok, status: res.status, ms };
}

function percentile(sorted, p) {
  const idx = Math.floor((p / 100) * (sorted.length - 1));
  return sorted[idx];
}

async function main() {
  const results = [];
  const runStart = performance.now();

  for (let sent = 0; sent < total; sent += concurrency) {
    const batchSize = Math.min(concurrency, total - sent);
    const batch = await Promise.all(Array.from({ length: batchSize }, oneRequest));
    results.push(...batch);
  }

  const runMs = performance.now() - runStart;
  const succeeded = results.filter((r) => r.ok).length;
  const failed = results.length - succeeded;
  const sorted = results.map((r) => r.ms).sort((a, b) => a - b);
  const successRate = (succeeded / results.length) * 100;

  console.log(`Requests   : ${total}`);
  console.log(`Succeeded  : ${succeeded}   Failed: ${failed}   Success rate: ${successRate.toFixed(1)}%`);
  console.log(`Throughput : ${(results.length / (runMs / 1000)).toFixed(1)} req/s over ${(runMs / 1000).toFixed(1)}s`);
  console.log(`Latency ms : min ${sorted[0].toFixed(0)}  p50 ${percentile(sorted, 50).toFixed(0)}  ` +
    `p95 ${percentile(sorted, 95).toFixed(0)}  max ${sorted[sorted.length - 1].toFixed(0)}`);
  console.log(successRate >= 99 ? "PASS — success rate ≥ 99%" : "FAIL — success rate below 99%");
}

main();
```

Run it with:
```
node --env-file=.env scripts/stress-test-<name>.mjs 200 20
```
Then push harder:
```
node --env-file=.env scripts/stress-test-<name>.mjs 500 50
```

---

## 5. The template — copy this for every case you author

```
### TC-SPEED__ / TC-STRESS__: <short title>
- Type: performance-speed / performance-stress
- Owner: <you>
- Target: <exact RPC / endpoint / screen / query being tested>
- Checks (requirement/story): FR-__ / JOB-__
- Script: scripts/<your-script-name>.mjs
- Load (stress only): <total requests> total, <concurrency> at a time

Steps:
1. Write the script from the skeleton in section 3 or 4 above, editing the EDIT ME line.
2. Run: node --env-file=.env scripts/<name>.mjs <args>
3. Record the printed summary.

Expected result: <a number or range — e.g. "p95 under 2000ms", "success rate ≥ 99%">
Success criteria: <when do you call it PASS?>

--- fill after you run it ---
Actual result (paste terminal output):
Verdict: ✅ PASS / ❌ FAIL / ⚠️ BLOCKED
Evidence: terminal output pasted into the issue
```

Your IDs: number speed cases from **TC-SPEED1** upward and stress cases from **TC-STRESS1** upward (either of
you can pick any idea below — just don't duplicate one your teammate already claimed).

---

## 6. Ten SPEED test case ideas (write & run one script each)

Each of these is "how fast is this one thing, normally?" — run alone, 20–30 times, report min/avg/p50/p95.

1. **TC-SPEED1 — Student login round-trip.** *(Owner: Gugu)* Time a full sign-in POST to Supabase Auth with the
   student credentials. Expected: p95 well under 2–3 seconds; a login that takes 10s+ is a real UX problem.
2. **TC-SPEED2 — `get_university_overview` RPC (admin dashboard).** *(Owner: Basil)* Time the same RPC TC-B1
   probes, but alone and repeated, not just "does it return 200". Compare your baseline against the one recorded
   in the QA report.
3. **TC-SPEED3 — `get_department_overview` RPC (HOD dashboard).** *(Owner: Basil)* Same idea, different RPC —
   this one takes a `text` argument, so make sure your script sends a real department code.
4. **TC-SPEED4 — `get_faculty_overview` RPC (Dean dashboard).** *(Owner: Basil)* This one was newly created
   during integration (see QA report, JOB-016) — a fresh function is exactly the kind of thing worth a speed
   baseline on day one.
5. **TC-SPEED5 — Student's attendance history read.** *(Owner: Gugu)* Time the query the student
   dashboard/history screen uses to list past check-ins (FR-S6). Try it for a student with a lot of history vs a
   student with almost none.
6. **TC-SPEED6 — `verify-attendance-record` Edge Function.** *(Owner: Basil)* Time a single call with realistic
   (even if failing) input, same shape as TC-S3's forged-input probe. Edge Functions can have their own
   cold-start delay — that's worth noting separately from a "warm" timing.
7. **TC-SPEED7 — Tutor's delegated-modules fetch.** *(Owner: Basil)* This was rewritten as a two-step fetch to
   fix I-4 in the QA report; time it now that it's fixed, so there's a baseline if it's ever touched again.
8. **TC-SPEED8 — Anonymous read of a private table (e.g. `attendance_records`).** *(Owner: Gugu)* Yes, it should
   return `[]` per TC-S1 — but *how fast* does the database say no, as experienced from the app? A slow "no" can
   still feel like a frozen screen to a real user.
9. **TC-SPEED9 — Class-join write (JOB-024, enrolment).** *(Owner: Gugu)* Time the request that creates a
   pending enrolment row when a student joins a class with a valid code — this is the speed half of your own
   TC-G1/FR-S2 territory.
10. **TC-SPEED10 — Session persistence check on reload.** *(Owner: Gugu)* Time how long it takes for a logged-in
    session to rehydrate (JOB-007: AsyncStorage + `getSession`) after a simulated page reload. This one is
    closer to a stopwatch-on-the-browser test than a pure script — note in your report how you measured it if it
    isn't a plain HTTP call.

---

## 7. Ten STRESS test case ideas (write & run one script each)

Each of these is "what happens under many at once?" — ramp up load in at least two steps, report success rate,
throughput, and how p95 changes as load rises.

1. **TC-STRESS1 — `get_university_overview` under exam-time load.** *(Owner: Basil)* Simulate the whole
   university checking the admin dashboard at once. Start 200/20, then 500/50, then 1000/100. Note where
   success rate first drops below 99% or p95 first crosses ~2s.
2. **TC-STRESS2 — `get_faculty_overview` under load.** *(Owner: Basil)* The newest RPC (JOB-016) — no existing
   baseline exists for it under load, so this is genuinely new ground, not a repeat of TC-B2.
3. **TC-STRESS3 — Concurrent logins, same role.** *(Owner: Gugu)* Instead of hitting an RPC, fire many
   simultaneous Auth sign-in requests using the *same* demo student password. Does the auth endpoint hold up,
   and do responses stay correct (not mixed up between "sessions")?
4. **TC-STRESS4 — Concurrent enrolment writes to the same class code (JOB-024).** *(Owner: Basil)* Many
   students "joining" the same class code at once — check whether the count of pending rows created matches the
   number of requests sent (no lost writes, no duplicates from a race condition).
5. **TC-STRESS5 — Duplicate-attendance race (JOB-031).** *(Owner: Basil)* Fire two (or more) attendance
   submissions for the *same* `session_id` + `device_id` at the exact same moment. Expected: only one is
   accepted, the rest are rejected — confirm the rejection still holds when the requests arrive simultaneously,
   not one after another.
6. **TC-STRESS6 — `verify-attendance-record` Edge Function under load.** *(Owner: Gugu)* A whole class tapping
   "check in" in the same 10-second window. Watch for the success rate *and* whether `passed:true/false` results
   stay accurate under load (not just fast) — this is the load-side of the check-in flow you already test the
   feel of in TC-G1/TC-G2.
7. **TC-STRESS7 — Anonymous reads at volume (RLS under pressure).** *(Owner: Basil)* Hammer a protected table
   (e.g. `user_profiles`) with the anon key at high concurrency. Expected: it should still return `[]`/401 for
   every single request, even the 500th one arriving in the same second — a security guarantee that must hold
   under load, not just at rest.
8. **TC-STRESS8 — Mixed-role concurrent dashboard loads.** *(Owner: Gugu)* Instead of one RPC, fire a mix of
   `get_university_overview`, `get_department_overview`, and `get_faculty_overview` calls together, simulating
   admin + HOD + Dean all opening dashboards during the same busy morning.
9. **TC-STRESS9 — Pagination under load.** *(Owner: Basil)* Combine the `?limit=` idea from
   `AUTHORING_TEST_CASES.md`'s idea list with load: fire many paginated reads at once (e.g.
   `?limit=20&offset=0..N`) and check both correctness (right rows, no gaps/dupes across pages) and speed under
   concurrency.
10. **TC-STRESS10 — Sustained load, not just a burst.** *(Owner: Gugu)* Instead of one batch, run your script
    in a loop for 5 minutes at a moderate, steady concurrency (e.g. 10 at a time, continuously) rather than one
    short spike. Watch whether latency creeps up over time (a sign of something not releasing resources) even
    if a single burst test looked fine.

---

## 8. How to report on GitHub

Same flow as the other stories:

1. Issues → New issue → "Test case report" (or "Test case proposal" if you're proposing before running it).
2. Title it `[Test Case] TC-SPEED3: ...` or `[Test Case] TC-STRESS6: ...`.
3. Fill Target / Script / Steps / Expected / Actual / Verdict. Paste the full terminal output as evidence —
   don't summarize the numbers away, the raw output is the proof.
4. Attach or link your script file (commit it under `scripts/`, don't just paste it in the issue).
5. Move the card to the **Test Cases** column on the project board; move to Done once it has a recorded verdict.
6. If a run is a genuine FAIL (missed your own success criteria), open a linked `bug` issue and note the exact
   load level / target where it broke — that's the useful part for whoever fixes it.

Never paste the anon key or DB password in an issue, even inside pasted terminal output — blur it if it appears.

---

## 9. Self-review checklist (before you file)

- [ ] Unique ID (`TC-SPEED_` or `TC-STRESS_`) + one-line title
- [ ] Script is committed under `scripts/`, not just pasted in the issue
- [ ] Speed test: warm-up requests excluded, ≥20 timed requests, min/avg/p50/p95 reported
- [ ] Stress test: at least two load levels (ramp-up), success rate + throughput + p95 reported at each
- [ ] Success criteria was written down *before* you ran it, not after
- [ ] Actual terminal output pasted as evidence
- [ ] No passwords / keys anywhere in the script or the report

## 10. Definition of done (for this exercise)

You're done when each of you has:

- ✅ 3+ authored performance cases filed (mix of speed and stress — your choice which),
- ✅ a working script committed for each, run at least once with a recorded verdict + pasted evidence,
- ✅ for any stress case, at least two load levels run and compared,
- ✅ peer-reviewed at least 1 of your teammate's performance cases — could you re-run their script with no
  help from them?
