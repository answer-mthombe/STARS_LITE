-- 1. Add lifecycle, venue, and type tracking to test_sessions
ALTER TABLE public.test_sessions
ADD COLUMN title text NULL,
ADD COLUMN session_type text NULL DEFAULT 'test',
ADD COLUMN active boolean NULL DEFAULT true,
ADD COLUMN ended_at timestamp with time zone NULL,
ADD COLUMN venue_id text NULL;

ALTER TABLE public.test_sessions 
ADD CONSTRAINT fk_test_sessions_venue 
FOREIGN KEY (venue_id) REFERENCES public.venues (id) ON DELETE SET NULL;

-- 2. Create the staging table for live exam tracking (concurrency safe)
CREATE TABLE public.test_attendance_records (
  id text NOT NULL,
  test_session_id text NOT NULL,
  student_id text NOT NULL,
  exam_status text NULL DEFAULT 'seated',
  marked_by_tutor_id text NULL,
  checkout_time timestamp with time zone NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  
  CONSTRAINT test_attendance_records_pkey PRIMARY KEY (id),
  CONSTRAINT unique_test_session_student UNIQUE (test_session_id, student_id),
  CONSTRAINT fk_test_records_session FOREIGN KEY (test_session_id) REFERENCES public.test_sessions (id) ON DELETE CASCADE,
  CONSTRAINT fk_test_records_student FOREIGN KEY (student_id) REFERENCES public.students (id) ON DELETE RESTRICT,
  
  CONSTRAINT valid_test_exam_status CHECK (
    (exam_status = ANY (ARRAY['seated'::text, 'submitted'::text]))
  )
) TABLESPACE pg_default;

-- 3. Add final snapshot columns to test_registers
ALTER TABLE public.test_registers
ADD COLUMN title text NULL,
ADD COLUMN lecturer_id text NULL,
ADD COLUMN venue_id text NULL,
ADD COLUMN ended_at timestamp with time zone NULL;

ALTER TABLE public.test_registers
ADD CONSTRAINT fk_test_register_lecturer FOREIGN KEY (lecturer_id) REFERENCES public.lecturers (id) ON DELETE RESTRICT,
ADD CONSTRAINT fk_test_register_venue FOREIGN KEY (venue_id) REFERENCES public.venues (id) ON DELETE SET NULL;