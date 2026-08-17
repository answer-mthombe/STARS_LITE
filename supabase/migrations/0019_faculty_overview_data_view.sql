DROP VIEW IF EXISTS faculty_overview_data;

CREATE VIEW faculty_overview_data AS
SELECT 
    d.id AS department_id,
    d.department_name,
    d.faculty_id,
    -- Get count of students in this department
    (SELECT COUNT(*) FROM public.students s WHERE s.department_id = d.id) AS student_count,
    -- Get average attendance for this department
    (
        SELECT AVG(CASE WHEN ar.passed = true THEN 100.0 ELSE 0.0 END)
        FROM public.attendance_records ar
        JOIN public.attendance_sessions asess ON ar.session_id = asess.id
        JOIN public.modules m ON asess.module_id = m.id
        JOIN public.courses c ON m.course_id = c.id
        WHERE c.department_id = d.id
    ) AS avg_attendance,
    -- Count of currently active sessions for this department
    (
        SELECT COUNT(*)
        FROM public.attendance_sessions asess
        JOIN public.modules m ON asess.module_id = m.id
        JOIN public.courses c ON m.course_id = c.id
        WHERE c.department_id = d.id AND asess.active = true
    ) AS active_sessions
FROM public.departments d;