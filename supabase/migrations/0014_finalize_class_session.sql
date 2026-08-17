CREATE OR REPLACE FUNCTION public.finalize_class_session(
  p_session_id text,
  p_role text,
  p_person_id text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session record;
  v_module record;
  v_lecturer record;
  v_register record;
  v_tutor_ids jsonb;
  v_confirmations jsonb;
  v_all_tutors_confirmed boolean := true;
  v_pending integer := 0;
  v_students_payload jsonb;
  v_tutor_names jsonb := '[]'::jsonb;
  v_register_id text;
  v_ended_at timestamptz;
  v_duration_minutes integer;
BEGIN
  -- 1. Fetch Session
  SELECT * INTO v_session FROM public.attendance_sessions WHERE id = p_session_id;
  IF v_session IS NULL THEN
    RETURN json_build_object('is_finalized', false, 'message', 'Session not found.');
  END IF;

  -- 2. If already finalized, return the existing register
  IF v_session.class_register_id IS NOT NULL THEN
    SELECT * INTO v_register FROM public.class_registers WHERE id = v_session.class_register_id;
    RETURN json_build_object('is_finalized', true, 'register', row_to_json(v_register));
  END IF;

  -- 3. Fetch Module details
  SELECT * INTO v_module FROM public.modules WHERE id = v_session.module_id;
  IF v_module IS NULL THEN
    RETURN json_build_object('is_finalized', false, 'message', 'Module not found.');
  END IF;

  v_tutor_ids := COALESCE(v_module.tutor_ids, '[]'::jsonb);
  v_confirmations := COALESCE(v_session.tutor_end_confirmations, '[]'::jsonb);

  -- 4. Tutor Confirmation Logic
  IF p_role = 'tutor' THEN
    IF NOT (v_tutor_ids ? p_person_id) THEN
      RETURN json_build_object('is_finalized', false, 'message', 'You are not a tutor on this module.');
    END IF;
    IF NOT (v_confirmations ? p_person_id) THEN
      v_confirmations := v_confirmations || to_jsonb(p_person_id);
    END IF;
  END IF;

  -- 5. Check if all tutors have confirmed
  IF jsonb_array_length(v_tutor_ids) > 0 THEN
    SELECT COUNT(*) INTO v_pending
    FROM jsonb_array_elements_text(v_tutor_ids) AS t(id)
    WHERE NOT (v_confirmations ? t.id);

    IF v_pending > 0 THEN
      v_all_tutors_confirmed := false;
    END IF;
  END IF;

  -- 6. Awaiting Tutors? Save confirmations and exit early
  IF p_role != 'lecturer' AND NOT v_all_tutors_confirmed THEN
    UPDATE public.attendance_sessions
    SET tutor_end_confirmations = v_confirmations, active = false
    WHERE id = p_session_id;

    RETURN json_build_object(
      'is_finalized', false,
      'message', 'Awaiting ' || v_pending || ' more tutor confirmation(s) before the register is generated.'
    );
  END IF;

  -- ==========================================
  -- 7. READY TO FINALIZE: Build the Register!
  -- ==========================================
  v_ended_at := now();
  v_duration_minutes := GREATEST(1, EXTRACT(EPOCH FROM (v_ended_at - v_session.created_at)) / 60);
  v_register_id := 'reg_' || replace(gen_random_uuid()::text, '-', '');

  -- Fetch Lecturer Name
  SELECT * INTO v_lecturer FROM public.lecturers WHERE id = v_session.lecturer_id;

  -- Fetch Tutor Names
  IF jsonb_array_length(v_tutor_ids) > 0 THEN
    SELECT COALESCE(jsonb_agg(full_name), '[]'::jsonb) INTO v_tutor_names
    FROM public.students
    WHERE id IN (SELECT jsonb_array_elements_text(v_tutor_ids));
  END IF;

  -- Bundle ALL students (Enrolled left-joined with Records) to mark Absentees
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'studentId', s.id,
      'studentNumber', COALESCE(s.student_number, s.id),
      'fullName', COALESCE(s.full_name, 'Unknown'),
      'present', (ar.id IS NOT NULL),
      'markedAt', ar.timestamp
    )
  ), '[]'::jsonb) INTO v_students_payload
  FROM jsonb_array_elements_text(COALESCE(v_module.enrolled_students, '[]'::jsonb)) AS enrol(sid)
  LEFT JOIN public.students s ON s.id = enrol.sid
  LEFT JOIN public.attendance_records ar ON ar.student_id = s.id AND ar.session_id = p_session_id;

  -- Insert the Final Register
  INSERT INTO public.class_registers (
    id, session_id, module_id, module_code, module_name,
    tutor_student_ids, tutor_names, lecturer_id, lecturer_name,
    started_at, ended_at, duration_minutes, students,
    confirmed_by_tutor_student_ids, confirmed_by_lecturer,
    pdf_uri, html_snapshot, created_at
  ) VALUES (
    v_register_id, p_session_id, v_module.id, v_module.module_code, v_module.module_name,
    v_tutor_ids, v_tutor_names, v_session.lecturer_id, COALESCE(v_lecturer.full_name, 'Lecturer'),
    v_session.created_at, v_ended_at, v_duration_minutes, v_students_payload,
    v_confirmations, (p_role = 'lecturer'),
    null, null, v_ended_at
  ) RETURNING * INTO v_register;

  -- Lock the Session
  UPDATE public.attendance_sessions
  SET active = false, ended_at = v_ended_at,
      tutor_end_confirmations = v_confirmations,
      class_register_id = v_register_id
  WHERE id = p_session_id;

  -- Clear the Module's Active Session Pointer
  IF v_module.active_session_id = p_session_id THEN
    UPDATE public.modules SET active_session_id = null WHERE id = v_module.id;
  END IF;

  -- Return the payload in the exact format the frontend expects
  RETURN json_build_object(
    'is_finalized', true,
    'message', 'Class finalized successfully',
    'register', row_to_json(v_register)
  );
END;
$$;