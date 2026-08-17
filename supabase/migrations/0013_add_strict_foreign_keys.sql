-- ==============================================================================
-- MIGRATION: 0009_add_strict_foreign_keys
-- PURPOSE: Establish strict referential integrity across all STARS core tables.
-- STRATEGY: Use ON DELETE RESTRICT to prevent accidental deletion of parent records
--           that still have dependent child records.
-- ==============================================================================

-- --------------------------------------------------------
-- 1. INSTITUTIONAL HIERARCHY
-- --------------------------------------------------------
ALTER TABLE public.departments
DROP CONSTRAINT IF EXISTS fk_departments_faculty,
ADD CONSTRAINT fk_departments_faculty FOREIGN KEY (faculty_id) REFERENCES public.faculties(id) ON DELETE RESTRICT;

ALTER TABLE public.courses
DROP CONSTRAINT IF EXISTS fk_courses_faculty,
ADD CONSTRAINT fk_courses_faculty FOREIGN KEY (faculty_id) REFERENCES public.faculties(id) ON DELETE RESTRICT;

ALTER TABLE public.courses
DROP CONSTRAINT IF EXISTS fk_courses_department,
ADD CONSTRAINT fk_courses_department FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE RESTRICT;

-- --------------------------------------------------------
-- 2. PEOPLE & ROLES (Linked to Hierarchy)
-- --------------------------------------------------------
ALTER TABLE public.students
DROP CONSTRAINT IF EXISTS fk_students_faculty,
ADD CONSTRAINT fk_students_faculty FOREIGN KEY (faculty_id) REFERENCES public.faculties(id) ON DELETE RESTRICT;

ALTER TABLE public.students
DROP CONSTRAINT IF EXISTS fk_students_course,
ADD CONSTRAINT fk_students_course FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE RESTRICT;

ALTER TABLE public.lecturers
DROP CONSTRAINT IF EXISTS fk_lecturers_faculty,
ADD CONSTRAINT fk_lecturers_faculty FOREIGN KEY (faculty_id) REFERENCES public.faculties(id) ON DELETE RESTRICT;

ALTER TABLE public.lecturers
DROP CONSTRAINT IF EXISTS fk_lecturers_department,
ADD CONSTRAINT fk_lecturers_department FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE RESTRICT;

ALTER TABLE public.deans
DROP CONSTRAINT IF EXISTS fk_deans_faculty,
ADD CONSTRAINT fk_deans_faculty FOREIGN KEY (faculty_id) REFERENCES public.faculties(id) ON DELETE RESTRICT;

ALTER TABLE public.hods
DROP CONSTRAINT IF EXISTS fk_hods_department,
ADD CONSTRAINT fk_hods_department FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE RESTRICT;

ALTER TABLE public.faculty_secretaries
DROP CONSTRAINT IF EXISTS fk_secretaries_faculty,
ADD CONSTRAINT fk_secretaries_faculty FOREIGN KEY (faculty_id) REFERENCES public.faculties(id) ON DELETE RESTRICT;

-- Tutors are a strict sub-profile of a student. If the student is deleted, the tutor profile must go.
ALTER TABLE public.tutors
DROP CONSTRAINT IF EXISTS fk_tutors_student,
ADD CONSTRAINT fk_tutors_student FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;

-- --------------------------------------------------------
-- 3. THE ATTENDIFY ENGINE (Modules & Classes)
-- --------------------------------------------------------
ALTER TABLE public.modules
DROP CONSTRAINT IF EXISTS fk_modules_course,
ADD CONSTRAINT fk_modules_course FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE RESTRICT;

ALTER TABLE public.modules
DROP CONSTRAINT IF EXISTS fk_modules_lecturer,
ADD CONSTRAINT fk_modules_lecturer FOREIGN KEY (lecturer_id) REFERENCES public.lecturers(id) ON DELETE RESTRICT;

ALTER TABLE public.attendance_sessions
DROP CONSTRAINT IF EXISTS fk_sessions_module,
ADD CONSTRAINT fk_sessions_module FOREIGN KEY (module_id) REFERENCES public.modules(id) ON DELETE RESTRICT;

ALTER TABLE public.attendance_sessions
DROP CONSTRAINT IF EXISTS fk_sessions_lecturer,
ADD CONSTRAINT fk_sessions_lecturer FOREIGN KEY (lecturer_id) REFERENCES public.lecturers(id) ON DELETE RESTRICT;

-- Attendance records belong to a session. If a session is cancelled/deleted, its tap-ins are cleared.
ALTER TABLE public.attendance_records
DROP CONSTRAINT IF EXISTS fk_records_session,
ADD CONSTRAINT fk_records_session FOREIGN KEY (session_id) REFERENCES public.attendance_sessions(id) ON DELETE CASCADE;

-- But you CANNOT delete a student if they have attendance records on file.
ALTER TABLE public.attendance_records
DROP CONSTRAINT IF EXISTS fk_records_student,
ADD CONSTRAINT fk_records_student FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE RESTRICT;

-- --------------------------------------------------------
-- 4. SAVED REGISTERS (Job 025 Integration)
-- --------------------------------------------------------
ALTER TABLE public.class_registers
DROP CONSTRAINT IF EXISTS fk_registers_session,
ADD CONSTRAINT fk_registers_session FOREIGN KEY (session_id) REFERENCES public.attendance_sessions(id) ON DELETE RESTRICT;

ALTER TABLE public.class_registers
DROP CONSTRAINT IF EXISTS fk_registers_module,
ADD CONSTRAINT fk_registers_module FOREIGN KEY (module_id) REFERENCES public.modules(id) ON DELETE RESTRICT;

ALTER TABLE public.class_registers
DROP CONSTRAINT IF EXISTS fk_registers_lecturer,
ADD CONSTRAINT fk_registers_lecturer FOREIGN KEY (lecturer_id) REFERENCES public.lecturers(id) ON DELETE RESTRICT;

-- --------------------------------------------------------
-- 5. AUTHENTICATION BRIDGE
-- --------------------------------------------------------
-- If a user is deleted from Supabase Auth, their app profile is cascadingly deleted.
ALTER TABLE public.user_profiles
DROP CONSTRAINT IF EXISTS fk_profiles_auth_user,
ADD CONSTRAINT fk_profiles_auth_user FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;