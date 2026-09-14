# STARS — Test Case Stories (Gugu & Basil)

Welcome! These are **step-by-step testing stories**. You have never done formal testing before — that's fine. Each story tells you, in baby steps: **what you'll need**, **how to do it**, **what the result should look like**, and **what "success" means**. Follow them exactly, then **report each result on GitHub** (see "How to report" below).

> Golden rule of testing: you are not trying to prove the app works — you are trying to **find where it breaks**. Finding a bug is a *win*, not a failure. Write down exactly what you saw.

> 🔐 **Security stories** (RLS, no-forge, route guards, secrets) live in **[SECURITY_TEST_STORIES.md](./SECURITY_TEST_STORIES.md)** — TC-S1…TC-S6. Do the functional stories first, then the security ones.

> ✍️ **Write your own:** once you've run a few of these, learn to author your own in **[AUTHORING_TEST_CASES.md](./AUTHORING_TEST_CASES.md)** — method, template, starter ideas, and a "Test case proposal" issue template. This is part of the learning goal, not optional.

> ⚡ **Performance & accuracy** (speed at large-audience scale + no double-marking) live in **[PERFORMANCE_ACCURACY_TEST_STORIES.md](./PERFORMANCE_ACCURACY_TEST_STORIES.md)** — TC-P1…P3, TC-A1…A3, backed by the attendance load harness and the scaling playbook.

---

## Who does what

| Owner | Stories | Testing types |
|-------|---------|---------------|
| **Gugu** | TC-G1, TC-G2, TC-G3 | Functional · UI/UX · Automation |
| **Basil** | TC-B1, TC-B2, TC-B3 | Script-run · Stress · Automation (CI) |

You can read each other's stories — pairing up the first time is encouraged.

---

## Words you'll see (30-second glossary)

- **Test case** — one specific thing you check (e.g. "a lecturer can log in").
- **Steps** — the exact actions you take, in order.
- **Expected result** — what *should* happen.
- **Actual result** — what *actually* happened (write the truth, even if ugly).
- **Pass / Fail** — Pass = actual matches expected. Fail = it doesn't → that's a bug to report.
- **Evidence** — a screenshot or the text the terminal printed, so others can trust your result.
- **Terminal** — the black text window where you type commands. On Windows use **Git Bash** or **PowerShell**.

---

## One-time setup (do this once)

You'll need: a laptop, **Node 20.19+**, the repo, and the demo passwords (ask the team lead — they are **not** stored in the repo for security).

1. Open a terminal in the project folder (`STARS`).
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create your local `.env` (copy the example, then paste the shared Supabase URL + anon key):
   ```bash
   cp .env.example .env
   ```
   Open `.env` and set:
   ```
   EXPO_PUBLIC_DATA_SOURCE=supabase
   EXPO_PUBLIC_SUPABASE_URL=<shared by lead>
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<shared by lead>
   ```
   > `.env` is git-ignored — never commit it, and never paste keys/passwords into GitHub.
4. Start the app (for the UI stories):
   ```bash
   npx expo start --web
   ```
   A browser tab opens at `http://localhost:8081`. Leave it running while you test.

If a command errors, copy the error text — that itself is a useful bug report.

---

## How to report on GitHub (Project → "Test Cases")

Every story ends with a report. Do it on GitHub in the browser:

1. Go to the repo → **Issues** tab → **New issue**.
2. Choose the **"Test case report"** template.
3. It pre-fills the sections. Set the title like `[Test Case] TC-G1: role logins`.
4. Fill **What / Steps / Expected / Actual / Evidence / Verdict**. Drag screenshots straight into the box.
5. Make sure the **`test-case`** label is on it (the template adds it automatically).
6. Click **Submit new issue**.
7. Go to the **Projects** tab → open the team project board → find your issue (or **+ Add item**) and move its card into the **"Test Cases"** column. Move it to **Done** once it passes.
   - *If there is no project board yet, the lead creates one once: Projects → New project → Board → add a column named `Test Cases`.*

**Never paste passwords, anon keys, or the DB password into an issue.** Blur them in screenshots.

---

# GUGU'S STORIES

## TC-G1 · Functional testing — "Every role can log in and lands in the right place"

**Type:** Functional · **Owner:** Gugu

**Goal (plain):** Prove that each of the six roles can sign in against the live database and sees *their* dashboard with real data — exactly the check that was done during integration.

**What you'll need:** app running (`npx expo start --web`), the six demo passwords from the lead, the browser.

**How to do it (baby steps):**
1. In the browser tab, on the STARS home, click **Sign in to STARS**.
2. At the top you'll see role tabs: **Admin · Dean · HOD · Lecturer · Tutor · Student**. Click **Student**.
3. The email is pre-filled (e.g. `22001234@live.mut.ac.za`). In the **Password** box type the **student** password from the lead.
4. Click **Sign in**. Watch what screen appears.
5. Write down: did it open the **student dashboard** ("Hello, …" + a "My classes" list)? Yes/No.
6. Click the **logout** icon (top-right). You're back at the home screen.
7. Repeat steps 1–6 for each role, using that role's password:

   | Role | Log in as… | Expected screen |
   |------|-----------|-----------------|
   | Student | Student tab | "Hello, <name>" + My classes |
   | Tutor | Tutor tab | "Tutor hub" |
   | Lecturer | Lecturer tab | "Lecturer" hub + Your modules |
   | Dean | Dean tab | "Faculty overview" |
   | HOD | HOD tab | "Department overview" |
   | Admin | Admin tab | "University overview" |

8. **Bonus check (finds real bugs):** while logged in as Lecturer, click the **Analytics** tab — it should show "Overall attendance", stat cards, and a "Participation by module" chart with numbers (not blank).

**What the result will look like:** a filled version of the table above with ✅/❌ in each row, plus one screenshot per role showing the dashboard.

**What success looks like:** **all six** rows are ✅ — each role reaches its own dashboard and no red error message appears. Any ❌ row is a bug → describe exactly what appeared instead.

**Report:** open a `[Test Case] TC-G1` issue, paste the table + screenshots, set the verdict.

---

## TC-G2 · UI/UX testing — "Does it look and feel right?"

**Type:** UI/UX · **Owner:** Gugu

**Goal:** Check the app is clear, readable, and comfortable to use — on both a wide screen and a phone-sized screen.

**What you'll need:** app running, the browser. You'll use the browser's device toolbar to fake a phone.

**How to do it (baby steps):**
1. Log in as a **Student** (from TC-G1).
2. **Desktop look** — go through this checklist, marking ✅/❌:
   - [ ] Cards (the class boxes) stand out from the grey background (they should look white with a soft shadow).
   - [ ] The **Sign in** / primary buttons look "pressable" (solid colour, slight shadow).
   - [ ] Text is easy to read; nothing overlaps.
   - [ ] While a screen loads, you see a spinner or "Loading…", not a frozen blank.
   - [ ] Empty areas explain themselves (e.g. "No modules yet"), they aren't just blank.
3. **Phone look** — press **F12** to open developer tools, then click the little **phone/tablet icon** (top-left of that panel) to switch to a mobile view (pick "iPhone 12" or width ~390).
4. Re-check the same list on the narrow screen: does anything get cut off, overlap, or become too small to tap?
5. Take a screenshot of anything that looks wrong.

**What the result will look like:** the checklist with ✅/❌, plus screenshots of any problem (say which screen + desktop or phone).

**What success looks like:** every item ✅ on both desktop and phone widths. Each ❌ becomes a short bug note ("On phone, the login button is hidden behind the footer" + screenshot).

**Report:** `[Test Case] TC-G2`, attach the checklist + screenshots.

---

## TC-G3 · Automation testing — "Let the computer test the code for you"

**Type:** Automation (unit tests with Vitest) · **Owner:** Gugu

**Goal:** Run an automated test suite, understand its output, then **write one new test yourself**. Automated tests re-run in seconds and catch breakages before users do.

**What you'll need:** the terminal. (No app or browser needed — automated unit tests run the code directly.) A ready example already exists at `src/utils/rotatingCode.test.ts`.

**How to do it (baby steps):**
1. In the terminal, run:
   ```bash
   npm test
   ```
2. Read the output. Each line with a check mark is one passing test.
3. Now write your own. Open `src/utils/rotatingCode.test.ts` and copy this new block to the bottom of the file:
   ```ts
   it("gives different codes for different seeds", () => {
     expect(attendanceCodeForWindow("seedA", 1)).not.toBe(attendanceCodeForWindow("seedB", 1));
   });
   ```
4. Save, then run `npm test` again — your new test should appear and pass.
5. **See a failure on purpose** (so you know what red looks like): temporarily change `not.toBe` to `toBe`, run `npm test`, watch it fail, then change it back.

**What the result will look like:**
```
 Test Files  1 passed (1)
      Tests  7 passed (7)
```
(6 originally + your new one.)

**What success looks like:** `npm test` ends with **all tests passed**, the count went up by one (your test), and you saw what a failing test looks like. Paste the terminal output as evidence.

**Report:** `[Test Case] TC-G3`, paste the passing output and the one line of test you added.

---

# BASIL'S STORIES

## TC-B1 · Script testing — "Run the quality gates"

**Type:** Testing by running scripts · **Owner:** Basil

**Goal:** Run the project's automated quality checks and one live-backend probe, and confirm they all come back clean — the same gates that guard every merge.

**What you'll need:** the terminal, a working `.env` (Supabase mode).

**How to do it (baby steps):**
1. **TypeScript check** (finds broken types before they crash the app):
   ```bash
   npm run typecheck
   ```
2. **Challenge library check** (validates the attendance-challenge data file):
   ```bash
   npm run validate:challenge-library
   ```
3. **Live RPC probe** (confirms the analytics function the app calls is reachable). Paste this exactly — it reads your `.env`:
   ```bash
   node --env-file=.env -e "const u=process.env.EXPO_PUBLIC_SUPABASE_URL,k=process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;fetch(u+'/rest/v1/rpc/get_university_overview',{method:'POST',headers:{apikey:k,Authorization:'Bearer '+k,'Content-Type':'application/json'},body:'{}'}).then(async r=>console.log('HTTP',r.status,(await r.text()).slice(0,120)))"
   ```

**What the result will look like:**
- Step 1 prints nothing and returns to the prompt = **0 errors**.
- Step 2 prints `Challenge library valid.`
- Step 3 prints `HTTP 200 {"students": …}`.

**What success looks like:** step 1 = no errors, step 2 = "valid", step 3 = **HTTP 200** with JSON. Any non-zero errors or a non-200 status is a bug → paste the full output.

**Report:** `[Test Case] TC-B1`, paste all three command outputs (blur the key if it appears).

---

## TC-B2 · Stress testing — "How does the backend behave under load?"

**Type:** Stress / load · **Owner:** Basil

**Goal:** Fire many requests at an analytics endpoint at once and measure success rate and speed, so we know it holds up when a whole faculty logs in at exam time.

**What you'll need:** the terminal, a working `.env`. A ready script exists at `scripts/stress-test-rpc.mjs`.

**How to do it (baby steps):**
1. Run a light load first:
   ```bash
   npm run stress:rpc
   ```
   (This sends 200 requests, 20 at a time, to `get_university_overview`.)
2. Read the summary it prints.
3. Now push harder — 500 requests, 50 at a time:
   ```bash
   node scripts/stress-test-rpc.mjs get_university_overview 500 50
   ```
4. Run it 2–3 times and note whether the numbers stay steady or get worse.

**What the result will look like:**
```
Requests   : 200
Succeeded  : 200   Failed: 0   Success rate: 100.0%
Throughput : 17.1 req/s over 1.8s
Latency ms : min 206  p50 249  p95 1244  max 1256
PASS — success rate 100.0% ≥ 99%
```
- **p50** = half the requests were faster than this. **p95** = 95% were faster than this (the "slow tail").

**What success looks like:** the script prints **PASS** (success rate ≥ 99%). Also note the **p95 latency** — flag it if p95 is above ~2000 ms, and flag **any** failed requests. If it prints **FAIL**, that's an important bug → paste the whole summary.

**Report:** `[Test Case] TC-B2`, paste the summaries from the light and heavy runs, and call out p95 + any failures.

---

## TC-B3 · Automation testing — "Trust the robots: the CI pipeline"

**Type:** Automation (Continuous Integration) · **Owner:** Basil

**Goal:** Learn to run the whole automated gate locally, and to read the automated results GitHub produces on every push/PR — so a red pipeline never reaches `main` unnoticed.

**What you'll need:** the terminal, and the repo open in the browser.

**How to do it (baby steps):**
1. **Run the local unit tests:**
   ```bash
   npm test
   ```
2. **Run the full merge gate** (this is what CI runs — typecheck, challenge library, expo doctor, web build). It takes a few minutes:
   ```bash
   npm run ci
   ```
3. **Read GitHub's automated results:** in the browser, open the repo → **Actions** tab. Click the most recent **CI** run for `main`.
4. You'll see jobs: *Verify TypeScript, Verify Challenge library, Verify Expo doctor, Verify Web export*. A green ✔ = passed, a red ✖ = failed. Click a job to read its log.

**What the result will look like:**
- Step 1: `Tests  6 passed (6)` (or more).
- Step 2: each check finishes without error and the command returns to the prompt.
- Step 3–4: the latest CI run shows **all green checks**.

**What success looks like:** `npm test` passes, `npm run ci` finishes with no error, and the latest GitHub **Actions → CI** run is **all green**. If any CI job is red, open the job log, copy the failing lines, and that's your bug report.

**Report:** `[Test Case] TC-B3`, paste the `npm test` result and a screenshot of the green (or red) Actions run.

---

## Appendix — quick command reference

| Do this | Command |
|---------|---------|
| Start the app (web) | `npx expo start --web` |
| Type check | `npm run typecheck` |
| Challenge data check | `npm run validate:challenge-library` |
| Unit tests (automation) | `npm test` |
| Full CI gate | `npm run ci` |
| Stress test an RPC | `npm run stress:rpc` |

**Bug found?** Open a normal issue (label `bug`), link it from your test-case issue, and set that test case's verdict to ❌. Transparent > tidy.
