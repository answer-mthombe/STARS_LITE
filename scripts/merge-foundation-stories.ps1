$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$header = @"
# STARS — Supabase (Auth + Postgres) integration

**Audience:** Brightman, Gugulethu, Basil — and anyone new to the codebase.

This document ties **milestones**, **user stories**, and **file ownership** together. **Start with [M0 — Foundation sprint](#m0--foundation-sprint-start-here)** (step-by-step stories for first-time Supabase work). Later sections cover M1–M6 app wiring.

"@

$foundation = Get-Content -Path "FOUNDATION_STORIES.md" -Raw
$foundation = $foundation -replace '# STARS — Foundation sprint user stories \(M0\)', '## M0 — Foundation sprint (start here)'
$foundation = $foundation -replace '\[SUPABASE_INTEGRATION\.md\]\(\./SUPABASE_INTEGRATION\.md\) \| Milestones M0–M6 and JOB register', 'Sections below (M1–M6) | JOB register and app wiring'
$foundation = $foundation -replace 'FOUNDATION_STORIES\.md \(env section\)', 'SUPABASE_INTEGRATION.md (STORY-002)'
$foundation = $foundation -replace 'Link \*\*Foundation sprint:\*\* ``FOUNDATION_STORIES\.md``\.', 'Link **M0 foundation sprint:** [SUPABASE_INTEGRATION.md](./SUPABASE_INTEGRATION.md#m0--foundation-sprint-start-here).'
$foundation = $foundation -replace '# User stories \(detailed\)', '### Foundation user stories (detailed)'

$tailLines = Get-Content -Path "SUPABASE_INTEGRATION.md" | Select-Object -Skip 10
$tail = $tailLines -join "`n"

$m0Replacement = @"
## User stories (detail)

### M0 — Foundation

> **Full step-by-step stories:** see **[M0 — Foundation sprint (start here)](#m0--foundation-sprint-start-here)** above (STORY-000 through STORY-010). Summaries below map to JOB-001 through JOB-005.

#### JOB-001 — Supabase project
*As a developer, I want a Supabase project with Auth (email/password) and Postgres enabled so the app has a real backend.*

**Detailed steps:** [STORY-001](#story-001--create-supabase-project-auth--postgres)

**Acceptance**
- Project created; Auth provider enabled.
- API URL + anon key documented in team wiki (not committed).

**Files:** Supabase Dashboard · ``supabase/README.md``

---

#### JOB-002 — Local env + client init
*As a developer, I want ``.env`` with public Supabase keys so Expo loads config at build time.*

**M0:** [STORY-002](#story-002--local-env-file--envexample-no-app-connection-test) only. **M1:** verify ``tryGetSupabaseClient()``.

**Acceptance (M0)**
- ``.env.example`` updated; local ``.env`` gitignored; ``EXPO_PUBLIC_DATA_SOURCE=mock``.

**Acceptance (M1)**
- ``tryGetSupabaseClient()`` returns client when vars set.

**Files:** ``.env.example`` · ``src/supabase/client.ts``

---

#### JOB-003 — Schema agreement
*As a developer, I want table names and field shapes aligned between Postgres, RLS docs, and ``TABLES``.*

**Detailed steps:** [STORY-003](#story-003--schema-agreement-contract-before-sql)

**Acceptance**
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) sign-off completed.

**Files:** ``src/supabase/tables.ts`` · ``DATABASE_SCHEMA.md`` · ``src/models/*``

---

#### JOB-004 — Migrations folder
*As a developer, I want versioned SQL migrations so schema changes are reviewable in git.*

**Detailed steps:** [STORY-004](#story-004--postgres-tables-via-versioned-migrations-split-by-lane)

**Acceptance**
- ``supabase/migrations/0002`` through ``0005`` applied in order.

**Files:** ``supabase/migrations/`` · ``supabase/README.md``

---

#### JOB-005 — Seed strategy
*As a developer, I want seed data in Postgres mirroring mock JSON so live and mock demos match.*

**Detailed steps:** [STORY-005](#story-005--seed-data-from-mock-json--sql) · [STORY-006](#story-006--challenge-object-parameter-library-json)

**Acceptance**
- ``supabase/seed.sql`` loads; ``src/data/challenge-object-library.json`` committed.

**Files:** ``supabase/seed.sql`` · ``src/data/challenge-object-library.json``

---

"@

$pattern = '(?s)## User stories \(detail\)\r?\n\r?\n### M0 — Foundation\r?\n.*?(?=### M1 — Authentication)'
$tail = [regex]::Replace($tail, $pattern, $m0Replacement)

$out = $header + "`n" + $foundation + "`n---`n`n" + $tail
[System.IO.File]::WriteAllText((Join-Path $root "SUPABASE_INTEGRATION.md"), $out)
Write-Host "Wrote SUPABASE_INTEGRATION.md"
