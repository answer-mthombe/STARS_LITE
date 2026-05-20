# Supabase backend (STARS)

SQL migrations, RLS policies, Edge Functions, and seed data for the live backend.

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

All backend integration jobs (**JOB-001** … **JOB-034**) are in **[SUPABASE_INTEGRATION.md](../SUPABASE_INTEGRATION.md)**.

Table definitions, ER diagrams, and FK connections: **[DATABASE_SCHEMA.md](../DATABASE_SCHEMA.md)**.
