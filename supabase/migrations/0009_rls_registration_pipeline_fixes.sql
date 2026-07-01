-- ==========================================
-- FIX: PIPELINE REGISTRATION POLICIES
-- ==========================================

-- 1. Allow authenticated users to INSERT into the students table
create policy "Allow students to insert their own record"
  on public.students for insert to authenticated
  with check (true);

-- 2. Allow authenticated users to INSERT their own profile
create policy "Allow users to insert their own profile"
  on public.user_profiles for insert to authenticated
  with check ( id = auth.uid() );

-- 3. THE CHICKEN & EGG FIX: 
-- Allow a user to SELECT a student row during Step 2, even before 
-- their user_profile is created, by matching their Auth email.
create policy "Allow students to read own record during registration"
  on public.students for select to authenticated
  using ( email = (select auth.jwt()->>'email') );