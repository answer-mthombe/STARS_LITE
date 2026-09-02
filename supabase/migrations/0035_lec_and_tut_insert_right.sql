-- Allow ONLY lecturers and tutors to manually insert attendance records
CREATE POLICY "Lecturers and tutors can insert attendance records" 
ON public.attendance_records 
FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.user_profiles 
    WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role IN ('lecturer', 'tutor')
  )
);