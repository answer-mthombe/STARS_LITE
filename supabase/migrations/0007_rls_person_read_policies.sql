-- ==========================================
-- MIGRATION: 0007_rls_person_read_policies
-- PURPOSE: Allow authenticated users to read their own person records to fetch full names.
-- ==========================================

-- 1. Enable RLS on the remaining identity tables
alter table public.lecturers enable row level security;
alter table public.deans enable row level security;
alter table public.hods enable row level security;

-- 2. Clean up the overly permissive M0 placeholder for students
drop policy if exists "M0 Placeholder: Authenticated users can view students" on public.students;

-- 3. Create strict Self-Read Policies

-- STUDENTS
drop policy if exists "Students can read their own record" on public.students;
create policy "Students can read their own record"
  on public.students for select to authenticated
  using (
    id IN (
      select linked_student_id
      from public.user_profiles
      where id = auth.uid()
    )
    OR id IN (
      select linked_person_id
      from public.user_profiles
      where id = auth.uid()
    )
  );

-- LECTURERS
drop policy if exists "Lecturers can read their own record" on public.lecturers;
create policy "Lecturers can read their own record" 
  on public.lecturers for select to authenticated 
  using ( id IN (select linked_person_id from public.user_profiles where id = auth.uid()) );

-- DEANS
drop policy if exists "Deans can read their own record" on public.deans;
create policy "Deans can read their own record" 
  on public.deans for select to authenticated 
  using ( id IN (select linked_person_id from public.user_profiles where id = auth.uid()) );

-- HODS
drop policy if exists "HODs can read their own record" on public.hods;
create policy "HODs can read their own record" 
  on public.hods for select to authenticated 
  using ( id IN (select linked_person_id from public.user_profiles where id = auth.uid()) );