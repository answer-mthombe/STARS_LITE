-- 0. Enable RLS on all tables
alter table public.faculties enable row level security;
alter table public.departments enable row level security;
alter table public.modules enable row level security;
alter table public.user_profiles enable row level security;
alter table public.students enable row level security;
alter table public.attendance_sessions enable row level security;
alter table public.attendance_records enable row level security;

-- 1. Helper Function: Gets the user's role
create or replace function public.current_profile_role()
returns text 
language sql stable security definer set search_path = public 
as $$
  select role from public.user_profiles where id = auth.uid()
$$;

-- ==========================================
-- 2. GLOBAL POLICIES (Campus Structure)
-- ==========================================
create policy "Anyone authenticated can view faculties"
  on public.faculties for select to authenticated using (true);

create policy "Anyone authenticated can view departments"
  on public.departments for select to authenticated using (true);

create policy "Users can view own profile"
  on public.user_profiles for select to authenticated using ( auth.uid() = id );

-- ==========================================
-- 3. STRICT MATRIX POLICIES
-- ==========================================

-- ------------- STUDENTS TABLE -------------
create policy "Admin: All access to students"
  on public.students for all to authenticated using ( public.current_profile_role() = 'admin' );

create policy "Student: Read self"
  on public.students for select to authenticated 
  using ( public.current_profile_role() = 'student' and id = auth.uid() );

create policy "Lecturer: Read module enrollees"
  on public.students for select to authenticated 
  using ( 
    public.current_profile_role() = 'lecturer' and 
    id in (
      select student_id from public.module_enrollments 
      where module_id in (select module_id from public.module_tutors where lecturer_id = auth.uid())
    )
  );

-- ------------- MODULES TABLE -------------
create policy "Admin: All access to modules"
  on public.modules for all to authenticated using ( public.current_profile_role() = 'admin' );

create policy "Student: Read enrolled modules"
  on public.modules for select to authenticated 
  using ( 
    public.current_profile_role() = 'student' and 
    id in (select module_id from public.module_enrollments where student_id = auth.uid())
  );

create policy "Lecturer: Read taught modules"
  on public.modules for select to authenticated 
  using ( 
    public.current_profile_role() = 'lecturer' and 
    id in (select module_id from public.module_tutors where lecturer_id = auth.uid())
  );

-- -------- ATTENDANCE RECORDS TABLE --------
create policy "Admin: All access to attendance records"
  on public.attendance_records for all to authenticated using ( public.current_profile_role() = 'admin' );

create policy "Student: Select own attendance"
  on public.attendance_records for select to authenticated 
  using ( public.current_profile_role() = 'student' and student_id = auth.uid() );

create policy "Student: Insert own attendance"
  on public.attendance_records for insert to authenticated 
  with check ( public.current_profile_role() = 'student' and student_id = auth.uid() );

create policy "Lecturer: Read module session attendance"
  on public.attendance_records for select to authenticated 
  using ( 
    public.current_profile_role() = 'lecturer' and 
    session_id in (
      select id from public.attendance_sessions 
      where module_id in (select module_id from public.module_tutors where lecturer_id = auth.uid())
    )
  );

-- -------- ATTENDANCE SESSIONS TABLE --------
create policy "Admin: All access to sessions"
  on public.attendance_sessions for all to authenticated using ( public.current_profile_role() = 'admin' );

create policy "Student: Read active sessions"
  on public.attendance_sessions for select to authenticated 
  using ( public.current_profile_role() = 'student' and status = 'active' );

create policy "Lecturer: Create/Read own sessions"
  on public.attendance_sessions for all to authenticated 
  using ( 
    public.current_profile_role() = 'lecturer' and 
    module_id in (select module_id from public.module_tutors where lecturer_id = auth.uid())
  );