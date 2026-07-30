-- ==============================================================================
-- TARGETED PATCH: Policies for Student Registration & Class Registers (Job 025)
-- ==============================================================================

-- 1. FACULTIES & COURSES (Needed for Student Registration dropdowns)
ALTER TABLE public.faculties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read faculties" ON public.faculties;
CREATE POLICY "Allow public read faculties" ON public.faculties
FOR SELECT TO authenticated, anon USING (true);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read courses" ON public.courses;
CREATE POLICY "Allow public read courses" ON public.courses
FOR SELECT TO authenticated, anon USING (true);


-- 2. STUDENTS & PROFILES (Needed to create student accounts and link auth)
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow student registration insert" ON public.students;
CREATE POLICY "Allow student registration insert" ON public.students
FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow student self read" ON public.students;
CREATE POLICY "Allow student self read" ON public.students
FOR SELECT TO authenticated USING (
  id = (SELECT linked_student_id FROM public.user_profiles WHERE id = auth.uid())
  OR id = (SELECT linked_person_id FROM public.user_profiles WHERE id = auth.uid())
  OR email = (auth.jwt() ->> 'email')
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow profile management" ON public.user_profiles;
CREATE POLICY "Allow profile management" ON public.user_profiles
FOR ALL TO authenticated 
USING (id = auth.uid()) 
WITH CHECK (id = auth.uid());


-- 3. MODULES & LECTURERS (Needed for session tracking and lecturer dashboard)
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read modules" ON public.modules;
CREATE POLICY "Allow read modules" ON public.modules
FOR SELECT TO authenticated USING (true);

ALTER TABLE public.lecturers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read lecturers" ON public.lecturers;
CREATE POLICY "Allow read lecturers" ON public.lecturers
FOR SELECT TO authenticated USING (true);


-- 4. CLASS REGISTERS (Critical for Job 025 to save/read PDFs)
ALTER TABLE public.class_registers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read class registers" ON public.class_registers;
CREATE POLICY "Allow authenticated read class registers" ON public.class_registers
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert/update class registers" ON public.class_registers;
CREATE POLICY "Allow authenticated insert/update class registers" ON public.class_registers
FOR ALL TO authenticated 
USING (true) 
WITH CHECK (true);