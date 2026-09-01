-- JOB-026 — Delegation & proxy writes
-- module_delegations and proxy_assignments have existed since 0003 but never
-- had RLS enabled, unlike every other matrix table (see 0005/0008/0015).
-- This closes that gap using the same "role via user_profiles" pattern.

-- ============================================================
-- MODULE_DELEGATIONS
-- ============================================================
ALTER TABLE public.module_delegations ENABLE ROW LEVEL SECURITY;

-- Read: any authenticated user (matches the M0 placeholder style used for
-- modules/students/sessions — permissions are enforced app-side via
-- delegationPermissions.ts). Tighten post-pilot if needed.
DROP POLICY IF EXISTS "Authenticated users can view module delegations" ON public.module_delegations;
CREATE POLICY "Authenticated users can view module delegations"
ON public.module_delegations
FOR SELECT
TO authenticated
USING ( auth.role() = 'authenticated' );

-- Write: only lecturers/admins can create or edit delegation grants.
DROP POLICY IF EXISTS "Lecturers and admins can insert module delegations" ON public.module_delegations;
CREATE POLICY "Lecturers and admins can insert module delegations"
ON public.module_delegations
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid()
    AND role IN ('lecturer', 'admin')
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
    AND role IN ('lecturer', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid()
    AND role IN ('lecturer', 'admin')
  )
);

-- ============================================================
-- PROXY_ASSIGNMENTS
-- ============================================================
ALTER TABLE public.proxy_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view proxy assignments" ON public.proxy_assignments;
CREATE POLICY "Authenticated users can view proxy assignments"
ON public.proxy_assignments
FOR SELECT
TO authenticated
USING ( auth.role() = 'authenticated' );

-- Write: only deans/HODs/admins grant or revoke acting proxies.
DROP POLICY IF EXISTS "Dean HOD admin can insert proxy assignments" ON public.proxy_assignments;
CREATE POLICY "Dean HOD admin can insert proxy assignments"
ON public.proxy_assignments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid()
    AND role IN ('dean', 'hod', 'admin')
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
    AND role IN ('dean', 'hod', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid()
    AND role IN ('dean', 'hod', 'admin')
  )
);

-- ============================================================
-- USER_PROFILES — allow the sync helpers (delegationService) to patch
-- delegated_module_ids / active_proxy_ids on OTHER users' profiles.
-- The existing "Users can view own profile" policy only covers SELECT of
-- one's own row; without this, syncDelegatedModuleIds/syncActiveProxyIds
-- (which update a *different* user's profile) will be blocked by RLS.
-- ============================================================
-- Uses the existing `current_profile_role()` helper (security definer, from
-- 0005) rather than a raw EXISTS subquery on user_profiles, which would
-- otherwise recurse into this same policy.
DROP POLICY IF EXISTS "Lecturers and admins can update delegated module ids" ON public.user_profiles;
CREATE POLICY "Lecturers and admins can update delegated module ids"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING ( public.current_profile_role() IN ('lecturer', 'admin', 'dean', 'hod') )
WITH CHECK ( public.current_profile_role() IN ('lecturer', 'admin', 'dean', 'hod') );
