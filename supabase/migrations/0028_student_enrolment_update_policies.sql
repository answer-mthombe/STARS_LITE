-- ==========================================================
-- M4 JOB-024
-- Allow students to update their own student record
-- (registered_modules during module enrolment)
-- ==========================================================

-- Remove the policy if it already exists
DROP POLICY IF EXISTS "Students can update their own record"
ON public.students;

-- Create the policy
CREATE POLICY "Students can update their own record"
ON public.students
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.user_profiles up
        WHERE up.id = auth.uid()
          AND up.role = 'student'
          AND up.linked_student_id = students.id
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.user_profiles up
        WHERE up.id = auth.uid()
          AND up.role = 'student'
          AND up.linked_student_id = students.id
    )
);

