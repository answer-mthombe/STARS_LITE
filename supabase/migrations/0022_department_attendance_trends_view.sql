CREATE OR REPLACE VIEW department_attendance_trends AS
SELECT 
    c.department_id,
    DATE(ar.timestamp) as trend_date,
    COUNT(*) as total_scans,
    (SUM(CASE WHEN ar.passed = true THEN 1 ELSE 0 END)::decimal / COUNT(*)) * 100 as attendance_rate
FROM 
    public.attendance_records ar
JOIN 
    public.attendance_sessions asess ON ar.session_id = asess.id
JOIN 
    public.modules m ON asess.module_id = m.id
JOIN 
    public.courses c ON m.course_id = c.id
WHERE 
    c.department_id IS NOT NULL
GROUP BY 
    c.department_id, DATE(ar.timestamp);