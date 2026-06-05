# Supabase backend (STARS)

SQL migrations, RLS policies, Edge Functions, and seed data for the live backend.

## Project Refs (STORY-001)
* **Project Name:** STARS-MUT-Innovation Lab 
* **Region:** South Africa (af-south-1)
* **Ref ID:** [xwobsbanrcafjgxjjnxd]
* ⚠️ **Keys live in: The lead developers' WhatsApp direct messages. (Do not commit secrets!)

## Layout

```
supabase/
  README.md           ← this file
  migrations/         ← versioned schema (JOB-004)
  policies.md         ← RLS matrix (JOB-023) — add when ready
  seed.sql            ← demo data (JOB-005) — add when ready
  functions/          ← Edge Functions e.g. verify-attendance-record (JOB-032)
```

## Apply schema

**Option A — Supabase CLI** (recommended for teams)

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

**Option B — SQL editor**

Run scripts from `migrations/` in order in the Supabase Dashboard → SQL.

## Env (Expo app)

Copy repo `.env.example` → `.env`:

```
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
EXPO_PUBLIC_DATA_SOURCE=supabase
```

## User stories

- **M0 integration sprint (start here):** **[SUPABASE_INTEGRATION.md](../SUPABASE_INTEGRATION.md#m0--integration-sprint-start-here)** — Supabase setup, service wiring, remove mock/dummy data; UI already built.
- **Full milestone register:** **[SUPABASE_INTEGRATION.md](../SUPABASE_INTEGRATION.md)** — **JOB-001** … **JOB-034**.

Table definitions, ER diagrams, and FK connections: **[DATABASE_SCHEMA.md](../DATABASE_SCHEMA.md)**.

Challenge mechanism (gates + record shape): **[full-challenge-mechanism.md](../full-challenge-mechanism.md)**.

Challenge parameter JSON (not in Postgres): **`../src/data/challenge-object-library.json`**.

## Database Setup

### Run Order
1. **Migrations first**  
   Apply all SQL migrations to ensure the schema is up to date:
   ```bash
   supabase db push
