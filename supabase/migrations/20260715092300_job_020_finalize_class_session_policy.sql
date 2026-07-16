-- Enable Row Level Security (if not already enabled)
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;

-- Drop the policy if it already exists to ensure the migration runs cleanly
DROP POLICY IF EXISTS "Lecturers can update their own sessions" ON public.attendance_sessions;

-- Create the policy
CREATE POLICY "Lecturers can update their own sessions"
ON public.attendance_sessions
FOR UPDATE
TO authenticated
USING (
  auth.uid()::text = lecturer_id
)
WITH CHECK (
  auth.uid()::text = lecturer_id
);