# Attendance Challenge System — Full Mechanism Documentation

> ⚠️ **Superseded.** The authoritative attendance design is now
> **[ATTENDANCE_SECURITY_ARCHITECTURE.md](./ATTENDANCE_SECURITY_ARCHITECTURE.md)**
> (mandatory geofencing, server-side rotating code, one-time tokens, atomic
> validation RPC, RLS). This file is kept for historical challenge-gate detail.

## Hard Gates · Visual Game · Five-Tier Input · GPS-Embedded Answer Key · Zero Wasted Submissions

**Implementation stories:** [SUPABASE_INTEGRATION.md](./SUPABASE_INTEGRATION.md#m0--integration-sprint-start-here) (STORY-006 challenge JSON, STORY-004 `attendance_records` migration) · [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) §5.12 · `src/data/challenge-object-library.json`

---

## 1. The Governing Principle

**Nothing is submitted unless every condition is simultaneously true at the moment of submission.**

Not before. Not after. At the exact moment the student confirms their answer, every gate is re-evaluated in a single atomic check. If any one condition fails — even if it passed 3 seconds earlier — no record is written anywhere. Not to Supabase. Not to the local queue. Not to memory. The pipeline produces nothing.

This is not a validation step that happens after submission. It is a precondition that determines whether submission is even possible.

---

## 2. The Conditions Pipeline

Every condition must be GREEN at the moment the student's input is registered. The pipeline runs in this order:

```
CONDITIONS PIPELINE (evaluated on every submission attempt)
═══════════════════════════════════════════════════════════

[1] SESSION ACTIVE
    └─ session_id exists and end_time has not passed
    └─ FAIL → "Session has ended. See your coordinator."

[2] DEVICE NOT ALREADY CHECKED IN
    └─ (session_id, device_id) not in local confirmed records
    └─ FAIL → "Already checked in for this session."

[3] GPS CONFIRMED INSIDE RADIUS
    └─ last GPS poll is within session radius
    └─ poll timestamp is less than 4 seconds old
    └─ GPS accuracy reading is under 30 m (device-reported)
    └─ FAIL → "Location not confirmed. Stay in the room."

[4] GPS CONTINUOUS (no exit during challenge window)
    └─ ALL GPS polls taken during challenge window are inside radius
    └─ No more than 1 unknown/dropped poll during window
    └─ FAIL → "Location left the session area during check-in."

[5] AUDIO TOKEN VERIFIED
    └─ FSK decode produced a PIN that matches current session PIN
    └─ detection happened within this challenge window (not a cached result)
    └─ FAIL → "Session signal not detected. Move closer."

[6] CHALLENGE WINDOW STILL OPEN
    └─ current time_bucket == challenge time_bucket at which screen opened
    └─ FAIL → "Time expired. Open the challenge again."

[7] CORRECT OBJECT SELECTED
    └─ tapped_index == seed mod 6 (computed with live GPS bucket)
    └─ FAIL → "Wrong object. Try again." (2 failures → 60s lockout)

[8] PHYSICAL INTERACTION COMPLETED
    └─ tier-specific action validated against sensor recording
    └─ FAIL → "Action not detected. Try again."

[9] PROOF HASH INTEGRITY
    └─ server recomputes hash and matches client submission
    └─ FAIL → silent reject, flagged for coordinator review

═══════════════════════════════════════════════════════════
ALL GREEN → submission written and synced
ANY RED   → nothing written, appropriate message shown
```

Gates 1–5 are checked before the challenge screen renders. If any of 1–5 fail, the student never even sees a challenge. Gates 6–9 are checked at the moment of submission. All nine must be green simultaneously.

---

## 3. Visual Game — The Challenge Screen

### The object grid

The student sees a 2×3 grid of six rendered objects and a single instruction above it. They must identify and interact with the correct object using the input method assigned by their device tier.

```
┌──────────────────────────────────────────┐
│                                          │
│   Shake to select:   LARGE BLUE STAR     │
│                                          │
│   ┌──────┐  ┌──────┐  ┌──────┐          │
│   │  ◉   │  │  ★   │  │  ◆   │          │
│   │      │  │      │  │      │          │
│   └──────┘  └──────┘  └──────┘          │
│   ┌──────┐  ┌──────┐  ┌──────┐          │
│   │  ▲   │  │  ■   │  │  ●   │          │
│   │      │  │      │  │      │          │
│   └──────┘  └──────┘  └──────┘          │
│                                          │
│   ████████████░░░░░░░░  6.2s left       │
│                                          │
└──────────────────────────────────────────┘
```

The instruction combines two things: which object and how to interact with it. For a Tier 3 student, the instruction says "Shake to select". For a Tier 1 student it says "Tap 3× to select". The object target is the same for both. The physical action differs.

### Object generation

No images. No downloads. Every object is described by parameters and rendered as native primitives:

```
shape   → circle, square, triangle, star, diamond, hexagon, cross, arrow     (8)
color   → red, blue, green, yellow, purple, orange, white, teal               (8)
size    → small, medium, large                                                 (3)
pattern → solid, outline, striped, dotted, half-fill                          (5)
```

Total combinations: 8 × 8 × 3 × 5 = **960 unique objects**
Adding rotation (0°, 45°, 90°, 135°) → **3,840 objects**
Adding border weight (none, thin, thick) → **11,520 objects**

All rendered from four integers. The entire challenge library is under 50 KB as a parameter table.

### The correct object — seed formula

```
seed = hash(session_id + device_id + gps_bucket + time_bucket)

target_index       = seed mod 6              ← which cell is correct
pool_offset        = (seed >> 8)  mod 960    ← which 6 objects appear
distractor_mode    = (seed >> 16) mod 4      ← how similar distractors are
tier_action_index  = (seed >> 24) mod N      ← which action within the device tier
```

The GPS coordinates are part of the seed. A student outside the geofence computes a different `gps_bucket`, gets a different seed, selects the wrong cell, and fails — without knowing this is why.

---

## 4. Five-Tier Input System

### Device capability probe

Run once on first launch, cached, refreshed on app version update. Takes under 500 ms.

```
Probe               Method                              Cache key
────────────────────────────────────────────────────────────────────
Accelerometer       Accelerometer.isAvailableAsync()    cap_accel
Gyroscope           Gyroscope.isAvailableAsync()        cap_gyro
Microphone          Audio.requestPermissionsAsync()     cap_mic
Touch responsive    Register tap within 300 ms          cap_touch
Volume hardware     VolumeManager responds              cap_vol
Screen dead zones   Tap 9 zones, record misses          cap_screen_zones
```

Dead zones are mapped so the grid renderer avoids placing objects there. A cracked screen does not cause a check-in failure — it causes a grid reflow.

### Tier assignment

The highest available tier is used. If a required sensor is unavailable, the device falls to the next tier down. The capability cache determines this at launch and it does not change mid-session.

---

### Tier 1 — Universal (hardware only)

No sensors. No permissions. Every device qualifies.

| Challenge | What the student does | What is validated |
|---|---|---|
| Tap N times | Tap the correct cell N times (N = 2–7, from seed) | Tap count matches N, all taps on same cell |
| Hold screen | Press and hold the correct cell for 2 seconds | Touch duration ≥ 1800 ms on correct cell |
| Hold volume buttons | Hold volume-up + volume-down simultaneously | Both button events registered during 2s window |
| Tap-pause-tap | Tap correct cell, pause 1s, tap again | Two taps with gap > 800 ms and < 1500 ms |
| Sequential taps | Tap cell A then cell B in order (both revealed after first tap) | Both taps in correct order within window |

Tier 1 challenges are the fallback for every other tier. A student whose phone cannot run any sensor challenge always has a Tier 1 challenge available.

---

### Tier 2 — Touch enhanced (responsive touch screen required)

Requires that the touch screen passes the 300 ms responsiveness probe and has no more than 2 dead zones covering the grid area.

| Challenge | What the student does | What is validated |
|---|---|---|
| Swipe through | Swipe from the correct cell across the screen in a given direction | Swipe starts on correct cell, direction matches instruction |
| Rhythm tap | Tap the correct cell in a rhythm shown by a pulse animation (fast-slow-fast etc.) | Inter-tap intervals match the displayed rhythm within ±200 ms |
| Long swipe path | Swipe from cell A to cell B (both highlighted) | Touch path starts on A, ends on B, continuous |
| Draw outline | Trace around the boundary of the correct cell | Touch path covers all four edges within the cell boundary |
| Two-finger tap | Two-finger tap on the correct cell | Both touch events registered simultaneously on correct cell |
| Slide to confirm | Drag the correct object to a target zone at the bottom of the screen | Object dragged from correct cell to drop zone |

---

### Tier 3 — Motion (accelerometer required)

| Challenge | What the student does | What is validated |
|---|---|---|
| Shake to select | Shake device horizontally while correct cell is highlighted | X-axis oscillation: ≥3 crossings of ±2.5G within 1.5s |
| Tilt to confirm | Tilt device toward the correct cell's screen quadrant | Device tilts toward the cell's physical direction |
| Shake vertical | Shake device up and down | Y-axis oscillation: ≥3 crossings of ±2G within 1.5s |
| Flip to lock | Flip device face-down briefly then back while holding correct cell | Y-axis gravity inversion detected and reversed |
| Tap then shake | Tap correct cell, then shake | Both events in sequence within window |
| Double shake | Shake, pause 0.5s, shake again | Two distinct oscillation bursts with gap |
| Tilt-hold | Tilt and hold in one direction for 1.5s | Sustained off-axis gravity for ≥1200 ms |
| Combined axis | Shake X then tilt Y | Sequential axis events validated in order |

---

### Tier 4 — Advanced motion (gyroscope required)

| Challenge | What the student does | What is validated |
|---|---|---|
| Rotate 90° | Rotate device 90° clockwise (Z-axis) | Cumulative rotation ≥ 80° ≤ 110° in correct direction |
| Rotate 180° | Rotate device 180° in instruction direction | Cumulative rotation ≥ 165° |
| Full spin | Rotate device 360° | Cumulative rotation ≥ 340° |
| Yaw then pitch | Rotate left-right, then tilt forward | Two-axis sequence validated in order |
| Tilt spiral | Circular tilting motion (phone traces a cone) | Both X and Y gyro axes show phase-offset oscillation |
| Precision stop | Rotate to exactly 90° and stop — held steady for 1s | Rotation within ±15° of target, gyro delta < 0.1 rad/s for 800 ms |
| Counter-rotate | Rotate clockwise then anti-clockwise same degrees | Two opposite-direction rotations of equal magnitude |
| Hold-and-rotate | Hold correct cell, rotate device 90° | Touch event and gyro event simultaneously confirmed |

---

### Tier 5 — Audio (microphone permission required)

The microphone is already in use for the ultrasonic audio token. Tier 5 challenges extend the mic usage into the challenge itself, extracting additional interaction from the same hardware resource.

| Challenge | What the student does | What is validated |
|---|---|---|
| Single clap | Clap once | Single amplitude spike above threshold (> −20 dBFS) within window |
| Double clap | Clap twice | Two spikes with gap 300–900 ms |
| Triple clap | Clap three times | Three spikes within correct timing pattern |
| Sustained tone | Hum or whistle for 2 seconds | Sustained non-ambient amplitude > −25 dBFS for ≥ 1800 ms |
| Silence-then-clap | Wait for a silence prompt, then clap | No spike for first 3s, then one spike within remaining window |
| Rhythm clap | Clap a 3-beat rhythm shown by a visual pulse | Inter-clap intervals match within ±250 ms |
| Voice presence | Speak any word | Sustained voiced amplitude (not impulse) > −30 dBFS for ≥ 500 ms |

Tier 5 challenges do not require speech recognition. They operate purely on amplitude, duration, and timing — runnable on any device with a functional microphone.

---

## 5. Combined Challenge — One Action, Two Verifications

The tier input and the object selection are not separate steps. They are combined into a single 10-second action. The student performs one gesture that simultaneously:

- Identifies which object they mean (by which cell they touch, hold, or orient toward)
- Proves they performed the required physical action

**Examples:**

```
Tier 1: "Tap the LARGE BLUE STAR 4 times"
  → Student taps cell 3 (the star) four times
  → Validated: correct cell AND tap count = 4

Tier 2: "Swipe from the RED CIRCLE to the YELLOW DIAMOND"
  → Student swipes from cell 1 to cell 5
  → Validated: correct start cell AND correct end cell

Tier 3: "Shake to select the LARGE BLUE STAR"
  → Student holds phone over cell 3 and shakes
  → Validated: last touch-down on correct cell AND shake detected

Tier 4: "Rotate 90° clockwise to lock the GREEN DIAMOND"
  → Student taps and holds cell 4, rotates phone 90° clockwise
  → Validated: correct cell held AND gyro rotation 80°–110° clockwise

Tier 5: "Clap twice to select the SMALL ORANGE TRIANGLE"
  → Student focuses on cell 2 (it pulses briefly to confirm focus) and claps twice
  → Validated: cell 2 focused AND double clap detected in rhythm window
```

Both validations must pass. Completing the gesture correctly on the wrong cell fails. Selecting the correct cell without completing the gesture fails.

---

## 6. Geofence as a Live Condition — Not a Pre-Check

GPS does not check once and trust the result. It is a continuously evaluated condition throughout the challenge window.

```
T+0.0s   Challenge screen opens. Initial GPS reading confirmed GREEN.
T+2.0s   GPS poll 1 — must still be inside radius.
T+4.0s   GPS poll 2 — must still be inside radius.
T+6.0s   GPS poll 3 — must still be inside radius.
T+8.0s   GPS poll 4 — must still be inside radius.
T+Xs     Student submits (X ≤ 10s) — GPS re-evaluated one final time.

If ANY poll returns OUTSIDE radius → challenge window silently locks.
Student sees: "Location left the session area."
No submission. No local write.
```

The GPS polling interval during the window is 2 seconds — not configurable by the client. A student who exits the radius between polls faces a maximum of 2 seconds in which their exit might not be caught. At walking pace (1.4 m/s), a student can travel at most 2.8 m between polls — not enough to meaningfully exit a 60 m radius geofence. The acoustic layer still holds.

---

## 7. What Supabase Stores

One row. No challenge content. No sensor recordings. No object descriptions.

```
attendance_records
──────────────────────────────────────────────────────────────
session_id        uuid        4-byte reference
student_id        uuid        4-byte reference
device_id         char(16)    truncated hardware fingerprint
time_bucket       int4        floor(unix_ts / 10)
gps_bucket_hash   char(8)     first 8 chars of gps_bucket hash
tapped_index      int2        which grid cell (0–5)
tier_used         int2        which tier (1–5)
action_hash       char(12)    fingerprint of physical action data
passed            boolean
──────────────────────────────────────────────────────────────
Row size: ~72 bytes
50,000 students × 1,000 sessions = ~3.6 GB total (fits free-tier Postgres)
```

`action_hash` is a short fingerprint of the physical action outcome (e.g. tap count, shake peak G, clap timing), not the raw sensor stream. It is stored for audit only and cannot reconstruct the original gesture.

### Server-side verification (Supabase Edge Function)

```
On INSERT:
  1. Fetch session → anchor coords, radius, start time
  2. Verify time_bucket is within (session_start / 10) to (session_end / 10)
  3. Recompute expected gps_bucket from anchor ± 1 cell tolerance
     → if gps_bucket_hash not in expected set → mark passed = false, flag = GPS_MISMATCH
  4. Recompute seed from (session_id, device_id, gps_bucket_hash, time_bucket)
  5. Recompute expected tapped_index = seed mod 6
     → if tapped_index ≠ expected → mark passed = false, flag = WRONG_OBJECT
  6. Validate action_hash plausibility for tier_used
     → each tier has known valid ranges; implausible values (e.g. shake of 50G) are flagged
  7. All checks pass → passed = true
```

A client that submits a crafted row with a falsified `tapped_index` will fail step 5 because the server recomputes the expected answer independently. A client that spoofs GPS will fail step 3 because the spoofed `gps_bucket_hash` will not match the anchor's cell or its adjacent cells.

### Uniqueness constraint

```sql
UNIQUE (session_id, device_id)
```

One device, one check-in per session. A second INSERT from the same device in the same session is silently rejected at the database level before the Edge Function runs.

---

## 8. Failure Behaviour — What Is Never Stored

The system never writes a negative record. No "failed attempt" rows. No partial check-ins. If any gate fails:

- Nothing is written to Supabase
- Nothing is written to the local queue
- Nothing is written to `expo-secure-store`
- The student sees a message and can retry (subject to lockout rules below)

**Lockout rules:**

```
Wrong object tapped (condition 7 fails):
  → First failure: retry immediately, new challenge window (new time bucket)
  → Second failure: 60-second lockout before retry
  → Third failure: locked until coordinator manually clears

Location lost mid-challenge (condition 4 fails):
  → No lockout, retry immediately from Gate 1 (GPS must re-confirm)

Audio token not detected (condition 5 fails):
  → No lockout, student moves closer and retries
  → Audio token result is not cached between attempts; must be freshly detected

Session window expired (condition 6 fails):
  → No lockout, new challenge window opens automatically in 10 seconds
```

The lockout on wrong-object is the only punitive restriction. All others are environmental — the student fixes their position or signal and tries again naturally.

---

## 9. Anti-Cheat Coverage Summary

| Attack vector | Gate that blocks it |
|---|---|
| Check in from outside the building | Gate 3: GPS outside radius before challenge |
| Walk in to check in then leave | Gate 4: GPS exits during challenge window |
| Screenshot and share the grid | Gate 6: time bucket rotated by the time friend opens it |
| Tell a friend the correct cell verbally | Friend's device_id changes the seed; same index = different object |
| Spoof GPS to match coordinator | Gate 3 + server step 3: spoofed bucket must exactly match anchor cell; audio token simultaneous spoof is impractical |
| Submit crafted row to Supabase | Server step 5: recomputes expected index independently; client cannot influence this |
| Two students swap phones | Uniqueness constraint: (session_id, device_id) already used |
| One phone, two Supabase accounts | Uniqueness constraint is on device_id, not student_id |
| Replay a previous valid submission | Gate 6: time_bucket is validated server-side; expired bucket rejected |
| Implausible sensor data | Server step 6: action_hash checked against tier-specific plausibility ranges |
| Brute-force correct index (1-in-6) | Gate 7 + lockout: two wrong attempts trigger 60s lockout |
| Audio token pre-recorded and replayed | Gate 5: detection must occur within current challenge window, not cached |
