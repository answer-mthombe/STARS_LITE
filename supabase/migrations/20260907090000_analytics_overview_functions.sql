-- ====================================================================
-- MIGRATION: Add missing scoped analytics RPC — get_faculty_overview
-- ====================================================================
-- Investigation (2026-09-07) against the live DB found:
--   * get_university_overview()            -> EXISTS (json)      [Admin]
--   * get_department_overview(text)        -> EXISTS (json)      [HOD]  (created by remote
--                                             migrations 0042-0044 not in this local checkout)
--   * get_faculty_overview(text)           -> MISSING            [Dean]
--
-- Only get_faculty_overview is created here. The client
-- (src/services/institutionAnalytics.ts -> facultyOverview) consumes the JSON
-- directly, so keys are camelCase and match the mock-fallback shape. Return type
-- is `json` to stay consistent with the two existing overview functions.
--   * facultyAttendancePct is a percentage (0-100); avgAttendance is a fraction [0,1].
--   * A student belongs to a department via its course (students.course_id -> courses.department_id).
-- ====================================================================

CREATE OR REPLACE FUNCTION public.get_faculty_overview(target_faculty_id text)
RETURNS json AS $$
DECLARE
  v_rate            numeric;
  v_dept_stats      jsonb;
  v_low             jsonb;
  v_lect_perf       jsonb;
  v_active_sessions int;
BEGIN
  -- Faculty-wide attendance index: average of students.attendance_stats.attendanceRate
  SELECT COALESCE(AVG(COALESCE((s.attendance_stats->>'attendanceRate')::numeric, 0)), 0)
    INTO v_rate
  FROM public.students s
  WHERE s.faculty_id = target_faculty_id;

  -- Per-department student count + average attendance (students matched via course)
  SELECT COALESCE(jsonb_agg(row_obj ORDER BY row_name), '[]'::jsonb)
    INTO v_dept_stats
  FROM (
    SELECT
      d.department_name AS row_name,
      jsonb_build_object(
        'departmentId',  d.id,
        'name',          d.department_name,
        'avgAttendance', COALESCE(AVG(COALESCE((s.attendance_stats->>'attendanceRate')::numeric, 0)), 0),
        'studentCount',  COUNT(s.id)
      ) AS row_obj
    FROM public.departments d
    LEFT JOIN public.courses  c ON c.department_id = d.id
    LEFT JOIN public.students s ON s.course_id = c.id
    WHERE d.faculty_id = target_faculty_id
    GROUP BY d.id, d.department_name
  ) dept;

  -- Low-performing departments (< 65% and at least one student)
  SELECT COALESCE(jsonb_agg(e), '[]'::jsonb)
    INTO v_low
  FROM jsonb_array_elements(v_dept_stats) e
  WHERE (e->>'avgAttendance')::numeric < 0.65
    AND (e->>'studentCount')::int > 0;

  -- Lecturer performance: modules taught + attendance marks recorded on their modules
  SELECT COALESCE(jsonb_agg(
           jsonb_build_object(
             'lecturerId',    l.id,
             'name',          l.full_name,
             'modulesTaught', (SELECT COUNT(*) FROM public.modules m WHERE m.lecturer_id = l.id),
             'marksRecorded', (
               SELECT COUNT(*)
               FROM public.attendance_records r
               JOIN public.attendance_sessions ses ON ses.id = r.session_id
               JOIN public.modules m ON m.id = ses.module_id
               WHERE m.lecturer_id = l.id
             )
           )
         ), '[]'::jsonb)
    INTO v_lect_perf
  FROM public.lecturers l
  WHERE l.faculty_id = target_faculty_id;

  -- Active (live, non-expired) sessions owned by lecturers in this faculty
  SELECT COUNT(*)
    INTO v_active_sessions
  FROM public.attendance_sessions ses
  JOIN public.lecturers l ON l.id = ses.lecturer_id
  WHERE l.faculty_id = target_faculty_id
    AND ses.active = true
    AND ses.expires_at > now();

  RETURN (jsonb_build_object(
    'facultyId',                target_faculty_id,
    'facultyAttendancePct',     v_rate * 100,
    'departmentStats',          v_dept_stats,
    'lecturerPerformance',      v_lect_perf,
    'activeSessions',           v_active_sessions,
    'lowPerformingDepartments', v_low
  ))::json;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_faculty_overview(text) TO authenticated, anon;

-- Ask PostgREST to reload its schema cache so the RPC is immediately callable.
NOTIFY pgrst, 'reload schema';
