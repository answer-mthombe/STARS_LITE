# Challenge data (`src/data/`)

## `challenge-object-library.json`

This file is the **vocabulary** for the visual attendance challenge described in [full-challenge-mechanism.md](../../docs/full-challenge-mechanism.md).

| Stored here | Stored in Supabase (`attendance_records`) |
|-------------|-------------------------------------------|
| Shape, color, size, pattern enums | `tapped_index` (0–5) |
| Tier action names (documentation) | `tier_used` (1–5) |
| Seed formula reference | `gps_bucket_hash`, `time_bucket`, `action_hash`, `passed` |

The app **generates** six on-screen objects from the seed using the same logic as `src/services/attendanceChallengeService.ts` (`makeObjectPool`, `objFromIndex`). Postgres never stores object parameters — only the student's outcome row (~72 bytes per check-in).

## When to update

1. Change enums in `attendanceChallengeService.ts` **and** this JSON together.
2. Bump `"version"` in the JSON when enums change.
3. Document the change in `README.md` version changelog (integration sprint STORY-006 / STORY-010).

## Related code

- `src/utils/challengeBuckets.ts` — `time_bucket`, `gps_bucket_hash`, `computeChallengeSeed`
- `src/components/attendance/AttendanceChallengeGrid.tsx` — renders primitives from `ChallengeObject`
- [DATABASE_SCHEMA.md](../../docs/DATABASE_SCHEMA.md) §5.12 — `attendance_records` columns




## Version changelog

- **v1 (STORY-006)** — Initial vocabulary committed:
  - Shapes: circle, square, triangle, star, diamond, hexagon, cross, arrow
  - Colors: red, blue, green, yellow, purple, orange, white, teal
  - Sizes: small, medium, large
  - Patterns: solid, outline, striped, dotted, half
  - Tiers 1–5 defined (Universal, Touch enhanced, Motion, Advanced motion, Audio)

- **v2 (future STORY-010)** — Any changes to enums or tier actions must:
  1. Update `challenge-object-library.json`
  2. Bump `"version"` field
  3. Document changes here (added/removed enums, new tier actions, etc.)
  4. Ensure `attendanceChallengeService.ts` stays in sync