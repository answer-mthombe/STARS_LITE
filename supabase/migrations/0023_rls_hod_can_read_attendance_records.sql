-- Allow HODs to read attendance records for their department
CREATE POLICY "Allow HODs to read attendance records" ON public.attendance_records
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid() 
    AND up.role = 'hod'
  )
);