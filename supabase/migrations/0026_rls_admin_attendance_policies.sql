
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

create policy "Anyone authenticated can view departments"
  on public.departments for select to authenticated using (true);

-- ==========================================
-- 3. STRICT MATRIX POLICIES
-- ==========================================

-- ------------- STUDENTS TABLE -------------
create policy "Admin: All access to students"
  on public.students for all to authenticated using ( public.current_profile_role() = 'admin' );

-- create policy "Student: Read self"
--   on public.students for select to authenticated 
--   using ( public.current_profile_role() = 'student' and id = auth.uid() );



-- ------------- MODULES TABLE -------------
create policy "Admin: All access to modules"
  on public.modules for all to authenticated using ( public.current_profile_role() = 'admin' );



-- -------- ATTENDANCE RECORDS TABLE --------
create policy "Admin: All access to attendance records"
  on public.attendance_records for all to authenticated using ( public.current_profile_role() = 'admin' );



-- -------- ATTENDANCE SESSIONS TABLE --------
create policy "Admin: All access to sessions"
  on public.attendance_sessions for all to authenticated using ( public.current_profile_role() = 'admin' );
  
create policy "Student: Read active sessions"
  on public.attendance_sessions for select to authenticated 
  using ( public.current_profile_role() = 'student' and active = true );