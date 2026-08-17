-- 1. Completely remove the old view definition
DROP VIEW IF EXISTS public.module_performance;

-- 2. Re-create the view from scratch with the correct data types
CREATE VIEW public.module_performance AS
SELECT 
  m.id AS module_id,
  m.module_name,
  c.department_id,
  -- This will now be an INTEGER because jsonb_array_length returns an int
  COALESCE(jsonb_array_length(m.enrolled_students), 0) AS enrolled_count,
  AVG(
    CASE 
      WHEN ar.passed = true THEN 100.0 
      ELSE 0.0 
    END
  ) AS avg_attendance
FROM
  modules m
  JOIN courses c ON m.course_id = c.id
  LEFT JOIN attendance_sessions asess ON m.id = asess.module_id
  LEFT JOIN attendance_records ar ON asess.id = ar.session_id
GROUP BY
  m.id,
  m.module_name,
  m.enrolled_students,
  c.department_id;