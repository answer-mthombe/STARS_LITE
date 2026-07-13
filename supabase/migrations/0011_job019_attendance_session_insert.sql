-- ==========================================================
-- JOB-019
-- Allow authenticated lecturers to create attendance sessions
-- ==========================================================

-- Generate IDs automatically if one is not supplied
create extension if not exists pgcrypto;

alter table public.attendance_sessions
  alter column id set default gen_random_uuid()::text;

-- Remove the policy if it already exists
drop policy if exists "Lecturers can create attendance sessions"
on public.attendance_sessions;

-- Allow authenticated users to insert attendance sessions
create policy "Lecturers can create attendance sessions"
on public.attendance_sessions
for insert
to authenticated
with check (
    auth.uid() is not null
);