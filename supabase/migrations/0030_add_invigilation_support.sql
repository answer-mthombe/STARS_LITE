-- ====================================================================
-- MIGRATION: Add multi-venue test invigilation support
-- ====================================================================

-- 1. Upgrade the Sessions Table
ALTER TABLE public.attendance_sessions
  ADD COLUMN session_type text DEFAULT 'lecture',
  ADD COLUMN parent_session_id text REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
  ADD COLUMN venue_name text;

ALTER TABLE public.attendance_sessions
  ADD CONSTRAINT valid_session_type CHECK (session_type IN ('lecture', 'test', 'exam'));

-- 2. Upgrade the Records Table
ALTER TABLE public.attendance_records
  ADD COLUMN checkout_time timestamp with time zone,
  ADD COLUMN exam_status text DEFAULT 'present'; 

ALTER TABLE public.attendance_records
  ADD CONSTRAINT valid_exam_status CHECK (exam_status IN ('present', 'seated', 'submitted'));