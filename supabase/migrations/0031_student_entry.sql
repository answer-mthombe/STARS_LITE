-- ====================================================================
-- MIGRATION: RPC for Invigilator Manual Student Entry
-- ====================================================================

CREATE OR REPLACE FUNCTION add_student_to_exam(
  p_session_id text,
  p_student_number text,
  p_invigilator_device_id text
) RETURNS jsonb AS $$
DECLARE
  v_student_id text;
  v_parent_session_id text;
  v_existing_record_id text;
  v_new_record_id text;
BEGIN
  -- 1. Find the internal student ID using the typed student number
  -- (Assumes your 'students' table has a 'student_number' column)
  SELECT id INTO v_student_id FROM public.students WHERE student_number = p_student_number;
  
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Student number % not found in the system.', p_student_number;
  END IF;

  -- 2. Find the parent session ID to check all linked venues
  SELECT parent_session_id INTO v_parent_session_id 
  FROM public.attendance_sessions 
  WHERE id = p_session_id;

  -- 3. Check for duplicates across ALL venues linked to this test
  IF v_parent_session_id IS NOT NULL THEN
    SELECT r.id INTO v_existing_record_id
    FROM public.attendance_records r
    JOIN public.attendance_sessions s ON r.session_id = s.id
    WHERE r.student_id = v_student_id
      AND (s.id = v_parent_session_id OR s.parent_session_id = v_parent_session_id);
  ELSE
    -- Fallback for single-venue tests
    SELECT id INTO v_existing_record_id
    FROM public.attendance_records
    WHERE student_id = v_student_id AND session_id = p_session_id;
  END IF;

  IF v_existing_record_id IS NOT NULL THEN
    RAISE EXCEPTION 'Duplicate: Student % is already checked into this test.', p_student_number;
  END IF;

  -- 4. Generate ID and Insert the record as "seated"
  v_new_record_id := gen_random_uuid()::text;
  
  INSERT INTO public.attendance_records (
    id, session_id, student_id, device_id, passed, verified, exam_status, timestamp
  ) VALUES (
    v_new_record_id, p_session_id, v_student_id, p_invigilator_device_id, true, true, 'seated', now()
  );

  RETURN jsonb_build_object('success', true, 'record_id', v_new_record_id, 'status', 'seated');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;