# STARS — Security Test Stories (Gugu & Basil)

Companion to **[TEST_CASE_STORIES.md](./TEST_CASE_STORIES.md)** — same baby-step format (what you'll need · how · expected · success), same GitHub reporting flow. These focus on **security**: can someone who is *not* allowed do something they shouldn't?

> Security mindset: assume an attacker has the **public anon key** (it ships in the app — that's normal and fine). The database and Edge Functions — not the app UI — must be the thing that says "no". Your job is to poke the backend directly (bypassing the UI) and the UI guards, and prove the "no" holds.

---

## Who does what

| Owner | Stories | Angle |
|-------|---------|-------|
| **Basil** | TC-S1, TC-S2, TC-S3 | Backend — run scripts against the live API (RLS + Edge) |
| **Gugu** | TC-S4, TC-S6 | Frontend — route guards & auth negatives |
| **Either** | TC-S5 | Secrets hygiene (script) |

Setup is the same as the main stories (`.env` in Supabase mode, `npx expo start --web`). For the script stories, keep your anon URL + key in `.env`.

---

## ⚠️ Live findings already on the board

Security testing during setup already found real issues — use these as **worked examples** of what a good report looks like, and re-test after they're fixed:

| ID | Severity | Finding | Status |
|----|----------|---------|--------|
| **SEC-001** | 🔴 Critical | `audit_logs` had **RLS disabled** and the **anon** role had full `SELECT/INSERT/UPDATE/DELETE/TRUNCATE` — anyone with the public key could read, forge, or **wipe the audit trail**. Caught by TC-S1 & TC-S2. | Fix written: `supabase/migrations/20260907093000_secure_audit_logs.sql` — **pending apply** by the team. Re-run TC-S1/TC-S2 after it's applied; anon must then get `permission denied`. |

---

# BASIL'S STORIES (backend / scripts)

## TC-S1 · Anonymous read boundaries — "What can a stranger read?"

**Type:** Security · Backend · **Owner:** Basil

**Goal:** With only the public anon key (no login), try to read private tables directly from the REST API. Confirm the database hands back **nothing** for private data.

**What you'll need:** terminal, `.env` (URL + anon key).

**How to do it (baby steps):** run each line and note the output.
```bash
# helper: reads your .env, prints HTTP status + first bit of body
probe(){ node --env-file=.env -e "const u=process.env.EXPO_PUBLIC_SUPABASE_URL,k=process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;fetch(u+'/rest/v1/'+process.argv[1],{headers:{apikey:k,Authorization:'Bearer '+k}}).then(async r=>console.log(process.argv[1],'=>',r.status,(await r.text()).slice(0,80)))" "$1"; }

probe "user_profiles?select=*&limit=2"
probe "students?select=id,full_name&limit=2"
probe "attendance_records?select=*&limit=2"
probe "audit_logs?select=*&limit=2"
```

**What the result will look like (expected / secure):**
```
user_profiles => 200 []
students => 200 []
attendance_records => 200 []
audit_logs => 200 []          <-- MUST be empty or 401 once SEC-001 is fixed
```

**What success looks like:** every private table returns `[]` (or `401`). **Today, `audit_logs` returns real rows → that is SEC-001 (a FAIL).** After the fix migration is applied it must return `permission denied` / `[]`. Any table leaking real rows to anon is a bug.

**Report:** `[Test Case] TC-S1`, paste the four lines. If a table leaks, mark ❌ and link the finding.

---

## TC-S2 · Write protection — "A stranger must not be able to write or forge"

**Type:** Security · Backend · **Owner:** Basil

**Goal:** Prove the anon key cannot insert rows into protected tables — attendance can't be forged, audit logs can't be planted.

**What you'll need:** terminal, `.env`.

**How to do it (baby steps):**
```bash
# 1) try to forge an attendance record (should be REJECTED)
node --env-file=.env -e "const u=process.env.EXPO_PUBLIC_SUPABASE_URL,k=process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;fetch(u+'/rest/v1/attendance_records',{method:'POST',headers:{apikey:k,Authorization:'Bearer '+k,'Content-Type':'application/json'},body:JSON.stringify({id:'hack_DELETE_ME',session_id:'x',student_id:'x',device_id:'x',passed:true})}).then(async r=>console.log('insert record =>',r.status,(await r.text()).slice(0,90)))"

# 2) try to plant an audit log (should be REJECTED once SEC-001 is fixed)
node --env-file=.env -e "const u=process.env.EXPO_PUBLIC_SUPABASE_URL,k=process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;fetch(u+'/rest/v1/audit_logs',{method:'POST',headers:{apikey:k,Authorization:'Bearer '+k,'Content-Type':'application/json'},body:JSON.stringify({id:'hack_DELETE_ME',action:'session.started',actor_role:'admin',actor_person_id:'attacker'})}).then(async r=>console.log('insert audit =>',r.status,(await r.text()).slice(0,90)))"
```

**What the result will look like (expected / secure):**
```
insert record => 401 {"code":"42501", ... "violates row-level security policy" ...}
insert audit  => 401 {"code":"42501", ... }      <-- after SEC-001 fix
```

**What success looks like:** both inserts are **rejected** (401/403, an RLS/permission error) and **no row is created**. Today insert #1 correctly fails (✅) but insert #2 **succeeds** → SEC-001 (❌). If any insert returns `201`, that is a serious bug — report it and note the fake id so it can be removed.

**Report:** `[Test Case] TC-S2`, paste both statuses.

---

## TC-S3 · No-forge on the Edge Function — "The server does the maths, not the phone"

**Type:** Security · Backend · **Owner:** Basil

**Goal:** Confirm the `verify-attendance-record` Edge Function rejects a tampered submission (wrong object / forged seed / wrong GPS), so a hacked client can't fake a pass.

**What you'll need:** terminal, `.env`.

**How to do it (baby steps):**
```bash
node --env-file=.env -e "const u=process.env.EXPO_PUBLIC_SUPABASE_URL,k=process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;fetch(u+'/functions/v1/verify-attendance-record',{method:'POST',headers:{apikey:k,Authorization:'Bearer '+k,'Content-Type':'application/json'},body:JSON.stringify({session_id:'x',device_id:'x',gps_bucket_hash:'x',time_bucket:1,client_seed:'FORGED',tapped_index:0,expected_object:5,latitude:0,longitude:0,target_latitude:50,target_longitude:50})}).then(async r=>console.log(r.status,await r.text()))"
```

**What the result will look like (expected / secure):**
```
200 {"passed":false,"checks":{"seed_valid":false,"object_valid":false,"within_radius":false, ...}}
```

**What success looks like:** `passed` is **false** and the individual checks explain why (seed mismatch, wrong object, out of radius). If the server ever returns `passed:true` for obviously-forged input, that is a critical bug.

**Report:** `[Test Case] TC-S3`, paste the JSON.

---

# GUGU'S STORIES (frontend)

## TC-S4 · Role-guard isolation — "You can't reach a room you're not allowed in"

**Type:** Security · Frontend · **Owner:** Gugu

**Goal:** Confirm a logged-in user cannot open another role's screens by typing the URL directly (the app's `useRoleGuard` must bounce them).

**What you'll need:** app running, a **student** login.

**How to do it (baby steps):**
1. Log in as a **Student**.
2. In the browser address bar, type each of these and press Enter, one at a time:
   - `http://localhost:8081/admin/dashboard`
   - `http://localhost:8081/lecturer/dashboard`
   - `http://localhost:8081/dean/dashboard`
   - `http://localhost:8081/hod/dashboard`
3. For each, note: were you **redirected away** (back to the student area / login), or did the admin/lecturer/dean/HOD screen actually render?
4. Repeat the idea logged in as **Lecturer** trying `/admin/dashboard`.

**What the result will look like:** a small table — URL → "redirected ✅" or "showed the page ❌", plus a screenshot of anything that wrongly rendered.

**What success looks like:** every out-of-role URL **redirects you away** and never shows another role's data. Any screen that renders for the wrong role is a serious access-control bug.

**Report:** `[Test Case] TC-S4`, paste the table + any screenshot.

---

## TC-S6 · Auth negatives — "Wrong keys don't open the door"

**Type:** Security · Frontend · **Owner:** Gugu

**Goal:** Confirm bad logins fail cleanly and protected pages aren't reachable when logged out.

**What you'll need:** app running.

**How to do it (baby steps):**
1. On the login screen, pick **Student**, keep the email, type a **wrong** password (e.g. `wrongwrong`). Click **Sign in**.
2. Note: do you get a **clear error message** (e.g. "Invalid email or password"), and do you **stay** on the login screen (not let in)?
3. Try an empty password → should be blocked / show a message, not crash.
4. Now **log out**. With no session, type `http://localhost:8081/student/dashboard` in the address bar.
5. Note: are you sent to onboarding/login instead of seeing a dashboard?

**What the result will look like:** notes for each step (message shown, stayed out / redirected) + a screenshot of the error message.

**What success looks like:** wrong/empty passwords are rejected with a friendly message and no access; a logged-out user hitting a protected URL is redirected to login/onboarding. A crash, a blank white screen, or getting in with a wrong password are all bugs.

**Report:** `[Test Case] TC-S6`, paste notes + screenshot.

---

# EITHER OWNER

## TC-S5 · Secrets hygiene — "No keys or passwords in the repo"

**Type:** Security · Script · **Owner:** Gugu or Basil

**Goal:** Make sure no real secret (DB password, service-role key, private tokens) is committed to git, and that the local secret files are ignored.

**What you'll need:** terminal, at the repo root.

**How to do it (baby steps):**
```bash
# 1) the local secret files must be git-ignored (both should print "ignored")
git check-ignore env .env && echo "ignored" || echo "NOT IGNORED - problem"

# 2) search tracked files for tell-tale secrets (should find NOTHING)
git grep -nE "service_role|DB_PASSWORD *[:=]|-----BEGIN|sb_secret_" -- . ':!*.md' || echo "no secrets in tracked files"

# 3) search the whole git history too (should find NOTHING)
git log -p -S "service_role" -- . | head -5
```

**What the result will look like:**
- Step 1: `env` and `.env` → `ignored`.
- Step 2: prints **nothing** (then your `no secrets...` echo).
- Step 3: prints **nothing**.

> Note: the **anon / publishable** key (`sb_publishable_…`) is designed to be public and may appear in client config — that is expected and safe. You're hunting for the **service-role key** and the **database password**, which must never be committed.

**What success looks like:** secret files are ignored and steps 2–3 find nothing sensitive. If a real secret shows up, that's a high-severity finding — report it and tell the lead to rotate that credential immediately.

**Report:** `[Test Case] TC-S5`, paste the three outputs.

---

## Appendix — how to file a security bug

If a security test FAILS, it's usually higher priority than a normal bug:
1. Open a `[Test Case]` issue as usual and set the verdict to ❌.
2. Open a **separate bug issue**, add labels **`security`** and **`priority:high`**, describe exactly how you reproduced it (the command + output), and **do not** paste secrets.
3. Link the two issues and move the card to the **Test Cases** column so the whole team can see it.
