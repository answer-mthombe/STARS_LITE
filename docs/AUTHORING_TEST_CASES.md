# STARS — Write Your Own Test Cases (learning exercise)

Running the ready-made stories (TC-G1…, TC-B1…, TC-S1…) teaches you the **tools**. Writing your own teaches you to **think like a tester** — which is the real skill. This guide walks you from "I've never written a test case" to filing your own on GitHub.

> You don't need to know the code. A great test case comes from asking three questions about a feature: *what should happen? what should NOT be allowed? what weird input might break it?*

---

## 1. What a good test case is (the rules)

- **One thing per case.** "Student logs in" is one case; "login works for all roles" is six.
- **Specific & repeatable.** Someone else can follow your steps and get the same result without asking you.
- **A concrete expected result.** Not "it works" — say *what* ("a red message: 'Invalid email or password' appears and I stay on the login screen").
- **Independent.** It stands alone, or it lists **preconditions** (e.g. "logged in as a student").
- **Traceable.** Note which requirement or story it checks (the app's requirements are the **FR-…** table in [README](../README.md#functional-requirements); backend jobs are **JOB-…** in [SUPABASE_INTEGRATION.md](./SUPABASE_INTEGRATION.md)).

**Your IDs:** so yours never clash with the ready-made ones, number them from **TC-G4** upward (Gugu) and **TC-B4** upward (Basil). Security ones: **TC-SG1+ / TC-SB1+**.

---

## 2. The three kinds of case (with tiny examples)

| Kind | Question it answers | Example (join a class) |
|------|--------------------|------------------------|
| **Positive** (happy path) | Does the allowed thing work? | Valid class code → I'm enrolled, module appears |
| **Negative** | Is the disallowed thing refused? | Made-up class code → clear error, not enrolled |
| **Edge / boundary** | What about weird input? | Empty code, code with spaces/lowercase, joining a class I'm already in |

A feature isn't "tested" until you've thought about all three.

---

## 3. How to invent cases from a feature (the method)

1. **Pick one feature** (a requirement, a screen, or a button).
2. Write **one positive** case: the normal successful use.
3. Write **one negative** case: someone does the wrong/disallowed thing.
4. Write **one edge** case: empty / huge / zero / duplicate / offline / slow / odd characters.
5. For each, fill the template below and decide **what success looks like**.

**Worked example — requirement FR-S2 "Students join a class using a class code":**
- **Positive:** enter the correct code → the module shows under "My classes".
- **Negative:** enter `ZZZ-999` → "class not found" style error; My classes unchanged.
- **Edge:** enter a code I'm already enrolled in → no duplicate module appears.

---

## 4. The template — copy this for every case

```md
### TC-__: <short title>
- Type: functional / ui-ux / security / performance
- Owner: <you>
- Checks (requirement/story): FR-__ / JOB-__
- Preconditions: <e.g. logged in as student; app running>
- Test data: <the exact inputs you'll use>

Steps:
1.
2.
3.

Expected result: <specific — a value / screen / message / HTTP status>
Success criteria: <when do you call it PASS?>

--- fill after you run it ---
Actual result:
Verdict: ✅ PASS / ❌ FAIL / ⚠️ BLOCKED
Evidence: <screenshot or terminal output>
```

A GitHub version exists too: **Issues → New issue → "Test case proposal"**.

---

## 5. Your assignment (baby steps)

Each of you: **author at least 3 new test cases** — one positive, one negative, one edge — for a feature **not already covered** by TC-G1…/TC-B1…/TC-S1….

1. Pick a feature from the "ideas" list below (or your own).
2. Fill the template for all three cases.
3. File each on GitHub with the **"Test case proposal"** template → label `test-case` + `proposed` → add the card to the **Test Cases** column.
4. **Now run your own case.** Update the issue with Actual result + Verdict + Evidence, and move it to **Done** (or file a `bug` if it fails).
5. **Peer review:** read at least **2 of your teammate's** proposals. Ask yourself: *could I run this without asking them anything?* If not, comment with what's missing.

### Idea list (uncovered areas)

**Gugu — frontend / functional / UI-UX**
- Student **join a class** (FR-S2) — positive/negative/edge on the class code.
- **Attendance history** screen (FR-S6) — does it list past check-ins correctly / show an empty state?
- **Profile** screen — correct student number, faculty, course shown.
- **Notifications** & **Settings** shared screens (FR-X1) — open, read, no crash.
- **Module detail** navigation from a class card.
- **Responsiveness** — landscape phone, very narrow width, long names not clipped.
- **Accessibility** — can you tab through the login form with the keyboard? Are tap targets big enough?

**Basil — backend / script / security**
- **Enrolment writes** (JOB-024) — request to join creates a pending row; accept/reject updates it.
- **Class register finalisation** (JOB-025) — ending a class writes a register + `ended_at`.
- **Pagination / limits** — does `?limit=` behave; what happens at `limit=0` or a huge limit?
- **Cross-student read** (security) — signed in as student A, can you read student B's `attendance_records`? (should be no)
- **Duplicate attendance** (JOB-031) — a second record for the same `session_id` + `device_id` is rejected.
- **Heavier RPC load** — run `scripts/stress-test-rpc.mjs` against a different function; compare p95.
- **Seed integrity** — do the collection counts on the admin dashboard match the DB (`select count(*)`)?

---

## 6. Self-review checklist (before you file)

- [ ] Unique ID + one-line title
- [ ] Someone else could follow the steps with no help from me
- [ ] Expected result is a **specific** value / screen / status
- [ ] I wrote what **success** looks like
- [ ] Independent, or preconditions are listed
- [ ] Positive **and** negative **and** edge covered for the feature
- [ ] No passwords / keys anywhere in it

---

## 7. Definition of done (for this exercise)

You're done when **each of you** has:
- ✅ **3+ authored** cases filed (1 positive, 1 negative, 1 edge),
- ✅ **run** each once and recorded a verdict + evidence,
- ✅ **peer-reviewed 2+** of your teammate's cases with useful comments.

That's the loop real QA teams run every sprint — you'll have done it end to end.
