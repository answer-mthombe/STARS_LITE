-- 1. Hard drop the view
DROP VIEW IF EXISTS attendance_heatmap;

-- 2. Create it fresh with only the columns you need
CREATE VIEW attendance_heatmap AS
SELECT 
    (EXTRACT(WEEK FROM timestamp) - EXTRACT(WEEK FROM DATE_TRUNC('month', timestamp))) AS week_index,
    EXTRACT(DOW FROM timestamp) AS day_of_week,
    COUNT(*) AS intensity,
    c.department_id
FROM 
    public.attendance_records ar
JOIN 
    public.attendance_sessions asess ON ar.session_id = asess.id
JOIN 
    public.modules m ON asess.module_id = m.id
JOIN 
    public.courses c ON m.course_id = c.id
GROUP BY 
    week_index, day_of_week, c.department_id;