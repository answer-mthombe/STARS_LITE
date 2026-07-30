CREATE OR REPLACE VIEW faculty_department_summary AS
SELECT 
    d.id AS department_id,
    d.department_name,
    d.faculty_id,
    
    -- Ensure 0 is returned instead of NULL if no students exist
    COALESCE(COUNT(DISTINCT s.id), 0) AS student_count,
    
    -- Ensure 0 is returned instead of NULL if no attendance exists
    COALESCE(AVG(CASE WHEN ar.passed = true THEN 100.0 ELSE 0.0 END), 0) AS avg_attendance

-- 1. Anchor strictly on the departments table so we NEVER lose a department
FROM public.departments d

-- 2. Use LEFT JOIN for everything else. 
-- "Give me the courses, but if there are none, keep the department anyway."
LEFT JOIN public.courses c ON d.id = c.department_id

-- "Give me the modules, but if there are none, keep the department anyway."
LEFT JOIN public.modules m ON c.id = m.course_id

-- "Give me the sessions, but if there are none, keep the department anyway."
LEFT JOIN public.attendance_sessions asess ON m.id = asess.module_id

-- "Give me the records, but if there are none, keep the department anyway."
LEFT JOIN public.attendance_records ar ON asess.id = ar.session_id

-- "Give me the students, but if there are none, keep the department anyway."
LEFT JOIN public.students s ON c.id = s.course_id 

-- 3. Group by the department table's fields
GROUP BY 
    d.id, 
    d.department_name, 
    d.faculty_id;