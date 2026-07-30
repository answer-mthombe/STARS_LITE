-- 0. Drop the permissive M0 placeholders
DROP POLICY IF EXISTS "M0 Placeholder: Authenticated users can view students" ON public.students;
DROP POLICY IF EXISTS "M0 Placeholder: Authenticated users can view modules" ON public.modules;
DROP POLICY IF EXISTS "M0 Placeholder: Authenticated users can view attendance records" ON public.attendance_records;
DROP POLICY IF EXISTS "M0 Placeholder: Authenticated users can view sessions" ON public.attendance_sessions;

-- 1. STUDENTS: Read own record
CREATE POLICY "Students can read own record" ON public.students
FOR SELECT TO authenticated USING (
  id IN (SELECT linked_person_id FROM public.user_profiles WHERE id = auth.uid())
);

-- 2. MODULES: Enrollment/Teaching visibility
-- CREATE POLICY "Users can read own modules" ON public.modules
-- FOR SELECT TO authenticated USING (
--   id IN (SELECT module_id FROM public.module_enrollments WHERE student_id IN (SELECT linked_person_id FROM public.user_profiles WHERE id = auth.uid()))
--   OR id IN (SELECT module_id FROM public.lecturers WHERE id IN (SELECT linked_person_id FROM public.user_profiles WHERE id = auth.uid()))
-- );

-- 3. ATTENDANCE RECORDS: Insert/Select own + Lecturer view
CREATE POLICY "Students can insert/select own attendance" ON public.attendance_records
FOR ALL TO authenticated USING (
  student_id = (SELECT linked_person_id::text FROM public.user_profiles WHERE id = auth.uid())
);

CREATE POLICY "Lecturers can read records for own module sessions" ON public.attendance_records
FOR SELECT TO authenticated USING (
  session_id IN (SELECT id FROM public.attendance_sessions WHERE lecturer_id IN (SELECT linked_person_id FROM public.user_profiles WHERE id = auth.uid()))
);

-- 4. ATTENDANCE SESSIONS: Read/Write access
CREATE POLICY "Lecturers can manage own sessions" ON public.attendance_sessions
FOR ALL TO authenticated USING (
  lecturer_id = (SELECT linked_person_id FROM public.user_profiles WHERE id = auth.uid())
);

-- CREATE POLICY "Students can read sessions for enrolled modules" ON public.attendance_sessions
-- FOR SELECT TO authenticated USING (
--   module_id IN (SELECT module_id FROM public.module_enrollments WHERE student_id IN (SELECT linked_person_id FROM public.user_profiles WHERE id = auth.uid()))
-- );

-- 5. INTEGRITY: Reject duplicate session/device pairs
-- Note: Ensure table is cleaned of duplicates before running this
ALTER TABLE public.attendance_records 
ADD CONSTRAINT unique_session_device UNIQUE (session_id, device_id);