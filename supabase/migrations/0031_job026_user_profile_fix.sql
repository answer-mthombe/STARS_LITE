-- JOB-026 follow-up fix
-- 0030 added an UPDATE policy letting lecturer/admin/dean/hod write to
-- OTHER users' user_profiles rows (needed for delegated_module_ids /
-- active_proxy_ids sync), but never added a matching SELECT policy.
-- The pre-existing "Users can view own profile" policy only allows seeing
-- your own row, so syncDelegatedModuleIds/syncActiveProxyIds silently found
-- 0 rows when looking up someone else's profile by linked_student_id /
-- linked_person_id — not an error, just nothing to update.

DROP POLICY IF EXISTS "Lecturers and admins can view other profiles" ON public.user_profiles;
CREATE POLICY "Lecturers and admins can view other profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING ( public.current_profile_role() IN ('lecturer', 'admin', 'dean', 'hod') );

