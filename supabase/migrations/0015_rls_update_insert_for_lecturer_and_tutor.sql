-- 1. Allow Tutors and Lecturers to UPDATE the active_session_id on modules
DROP POLICY IF EXISTS "Only lecturers can update modules" ON public.modules;

CREATE POLICY "Lecturers and Tutors can update modules"
ON public.modules
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

-- 2. Allow Tutors and Lecturers to INSERT new attendance sessions
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecturers and Tutors can start sessions" ON public.attendance_sessions;

CREATE POLICY "Lecturers and Tutors can start sessions"
ON public.attendance_sessions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() 
    AND role IN ('lecturer', 'tutor')
  )
);