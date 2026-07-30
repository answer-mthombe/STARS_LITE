CREATE OR REPLACE VIEW faculty_lecturer_performance AS
SELECT 
    l.id AS lecturer_id,
    l.full_name AS lecturer_name,
    -- If 'modules' is a JSONB array, we count the length or join to a modules table
    -- Assuming a standard relational modules table exists based on previous HOD logic
    COUNT(DISTINCT m.id) AS modules_taught,
    COUNT(ar.id) AS marks_recorded
FROM public.lecturers l
LEFT JOIN public.modules m ON m.lecturer_id = l.id
LEFT JOIN public.attendance_sessions asess ON m.id = asess.module_id
LEFT JOIN public.attendance_records ar ON asess.id = ar.session_id
GROUP BY l.id, l.full_name;