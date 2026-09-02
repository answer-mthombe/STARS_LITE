-- Allow ONLY lecturers and tutors to manually update attendance records (for checkouts)
CREATE POLICY "Lecturers and tutors can update attendance records" 
ON public.attendance_records 
FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 
    FROM public.user_profiles 
    WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role IN ('lecturer', 'tutor')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.user_profiles 
    WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role IN ('lecturer', 'tutor')
  )
);