-- 1. Clean up attendance_records
ALTER TABLE public.attendance_records
DROP CONSTRAINT IF EXISTS valid_exam_status;

ALTER TABLE public.attendance_records
DROP COLUMN IF EXISTS exam_status,
DROP COLUMN IF EXISTS checkout_time;

-- 2. Clean up attendance_sessions (Restrict to 'lecture' and remove parent link)
ALTER TABLE public.attendance_sessions
DROP CONSTRAINT IF EXISTS valid_session_type;

ALTER TABLE public.attendance_sessions
ADD CONSTRAINT valid_session_type CHECK (
  session_type = 'lecture'::text
);

-- Drop the parent_session_id since breakout groups are not needed
ALTER TABLE public.attendance_sessions
DROP COLUMN IF EXISTS parent_session_id;