-- 0. Enable RLS on matrix tables only
alter table public.user_profiles enable row level security;
alter table public.students enable row level security;
alter table public.modules enable row level security;
alter table public.attendance_records enable row level security;
alter table public.attendance_sessions enable row level security;

-- 1. Helper Function (Prepped for M2 logic)
create or replace function public.current_profile_role()
returns text 
language sql stable security definer set search_path = public 
as $$
  select role from public.user_profiles where id = auth.uid()
$$;

-- ==========================================
-- 2. FOUNDATION POLICIES (M0 SCOPE)
-- ==========================================

-- USER PROFILES
-- Matrix: Read self
create policy "Users can view own profile"
  on public.user_profiles for select to authenticated using ( id = auth.uid() );

-- STUDENTS
-- Matrix: Read self | Read module enrollees | All access
-- TODO for M2: Implement strict profile joins for lecturer/admin visibility.
create policy "M0 Placeholder: Authenticated users can view students"
  on public.students for select to authenticated using ( auth.role() = 'authenticated' );

-- MODULES
-- Matrix: Read enrolled | Read taught | All access
-- TODO for M2: Restrict to module_enrollments (student) or module_tutors (lecturer).
create policy "M0 Placeholder: Authenticated users can view modules"
  on public.modules for select to authenticated using ( auth.role() = 'authenticated' );

-- ATTENDANCE RECORDS
-- Matrix: Insert/Select own | Read module session | All access
create policy "Users can insert own attendance"
  on public.attendance_records for insert to authenticated with check ( student_id = auth.uid() );

-- TODO for M2: Implement strict profile joins for lecturer module session visibility.
create policy "M0 Placeholder: Authenticated users can view attendance records"
  on public.attendance_records for select to authenticated using ( auth.role() = 'authenticated' );

-- ATTENDANCE SESSIONS
-- Matrix: Read active | Create/Read own | All access
-- TODO for M2: Restrict to active status (student) or ownership (lecturer).
create policy "M0 Placeholder: Authenticated users can view sessions"
  on public.attendance_sessions for select to authenticated using ( auth.role() = 'authenticated' );