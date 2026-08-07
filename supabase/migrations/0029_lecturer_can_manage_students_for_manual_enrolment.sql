-- ==========================================================
-- M4 JOB-024
-- Lecturers (and tutors) need to be able to:
--   1. SELECT a student row by id (to look them up when
--      manually adding them to a module)
--   2. UPDATE a student's `registered_modules` (to reflect
--      the manual enrolment)
--
-- Without these, moduleEnrollmentService.manualAddStudent()
-- can update public.modules.enrolled_students (lecturers
-- already have UPDATE there via migration 0015) but the
-- write to public.students.registered_modules is silently
-- dropped by RLS, leaving the module and the student's own
-- record out of sync.
-- ==========================================================

DROP POLICY IF EXISTS "Lecturers and tutors can read students" ON public.students;

CREATE POLICY "Lecturers and tutors can read students"
ON public.students
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid()
      AND role IN ('lecturer', 'tutor')
  )
);

DROP POLICY IF EXISTS "Lecturers and tutors can update students" ON public.students;

CREATE POLICY "Lecturers and tutors can update students"
ON public.students
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid()
      AND role IN ('lecturer', 'tutor')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid()
      AND role IN ('lecturer', 'tutor')
  )
);