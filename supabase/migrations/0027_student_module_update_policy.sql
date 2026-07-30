-- ==========================================================
-- M4 JOB-024
-- Allow authenticated students to update module enrolment
-- (used by joinByClassCode)
-- ==========================================================

-- Remove the policy if it already exists
DROP POLICY IF EXISTS "Students can update module enrolment"
ON public.modules;

-- Create the policy
CREATE POLICY "Students can update module enrolment"
ON public.modules
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.user_profiles up
        WHERE up.id = auth.uid()
          AND up.role = 'student'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.user_profiles up
        WHERE up.id = auth.uid()
          AND up.role = 'student'
    )
);

