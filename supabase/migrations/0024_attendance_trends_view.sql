CREATE OR REPLACE VIEW attendance_trends AS
SELECT 
    student_id,
    DATE(timestamp) as trend_date,
    COUNT(*) as sessions_attended
FROM public.attendance_records
GROUP BY student_id, DATE(timestamp);