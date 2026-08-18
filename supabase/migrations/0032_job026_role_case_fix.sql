-- JOB-026 follow-up fix #2
-- Role values in user_profiles.role are inconsistently capitalized in the
-- existing data (e.g. 'Dean' instead of 'dean'). SQL string comparison is
-- case-sensitive, so every policy from 0030/0031 that checked
-- role IN ('dean','hod','admin',...) silently rejected accounts whose role
-- wasn't stored in exactly that case. Wrapping both sides in lower(...)
-- makes the checks case-insensitive regardless of how each row was seeded.

-- ============================================================
-- MODULE_DELEGATIONS
-- ============================================================
DROP POLICY IF EXISTS "Lecturers and admins can insert module delegations" ON public.module_delegations;
CREATE POLICY "Lecturers and admins can insert module delegations"
ON public.module_delegations
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid()
    AND lower(role) IN ('lecturer', 'admin')
  )
);

DROP POLICY IF EXISTS "Lecturers and admins can update module delegations" ON public.module_delegations;
CREATE POLICY "Lecturers and admins can update module delegations"
ON public.module_delegations
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid()
    AND lower(role) IN ('lecturer', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid()
    AND lower(role) IN ('lecturer', 'admin')
  )
);

-- ============================================================
-- PROXY_ASSIGNMENTS
-- ============================================================
DROP POLICY IF EXISTS "Dean HOD admin can insert proxy assignments" ON public.proxy_assignments;
CREATE POLICY "Dean HOD admin can insert proxy assignments"
ON public.proxy_assignments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid()
    AND lower(role) IN ('dean', 'hod', 'admin')
  )
);

DROP POLICY IF EXISTS "Dean HOD admin can update proxy assignments" ON public.proxy_assignments;
CREATE POLICY "Dean HOD admin can update proxy assignments"
ON public.proxy_assignments
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid()
    AND lower(role) IN ('dean', 'hod', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid()
    AND lower(role) IN ('dean', 'hod', 'admin')
  )
);

-- ============================================================
-- USER_PROFILES (sync read/write policies from 0030/0031)
-- ============================================================
DROP POLICY IF EXISTS "Lecturers and admins can update delegated module ids" ON public.user_profiles;
CREATE POLICY "Lecturers and admins can update delegated module ids"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING ( lower(public.current_profile_role()) IN ('lecturer', 'admin', 'dean', 'hod') )
WITH CHECK ( lower(public.current_profile_role()) IN ('lecturer', 'admin', 'dean', 'hod') );

DROP POLICY IF EXISTS "Lecturers and admins can view other profiles" ON public.user_profiles;
CREATE POLICY "Lecturers and admins can view other profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING ( lower(public.current_profile_role()) IN ('lecturer', 'admin', 'dean', 'hod') );
