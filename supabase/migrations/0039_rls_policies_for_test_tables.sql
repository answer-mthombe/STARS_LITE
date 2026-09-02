ALTER TABLE public.test_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_registers ENABLE ROW LEVEL SECURITY;
-- ==========================================
-- ARCHITECTURE-AWARE POLICIES: test_sessions
-- ==========================================

CREATE POLICY "Enable insert for owning lecturer or admin" 
ON public.test_sessions FOR INSERT 
TO authenticated WITH CHECK (
  lecturer_id = (SELECT linked_person_id FROM public.user_profiles WHERE id = auth.uid()) OR
  (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY "Enable update for owning lecturer or admin" 
ON public.test_sessions FOR UPDATE 
TO authenticated USING (
  lecturer_id = (SELECT linked_person_id FROM public.user_profiles WHERE id = auth.uid()) OR
  (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'admin'
);

-- ==========================================
-- ARCHITECTURE-AWARE POLICIES: test_attendance_records
-- ==========================================

CREATE POLICY "Enable insert for tutors, owning lecturer, or admin" 
ON public.test_attendance_records FOR INSERT 
TO authenticated WITH CHECK (
  -- 1. Is it the tutor marking them?
  marked_by_tutor_id = (SELECT linked_person_id FROM public.user_profiles WHERE id = auth.uid()) OR 
  -- 2. Is it the lecturer who owns the test?
  test_session_id IN (
    SELECT id FROM public.test_sessions 
    WHERE lecturer_id = (SELECT linked_person_id FROM public.user_profiles WHERE id = auth.uid())
  ) OR
  -- 3. Is it an admin?
  (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY "Enable update for tutors, owning lecturer, or admin" 
ON public.test_attendance_records FOR UPDATE 
TO authenticated USING (
  marked_by_tutor_id = (SELECT linked_person_id FROM public.user_profiles WHERE id = auth.uid()) OR 
  test_session_id IN (
    SELECT id FROM public.test_sessions 
    WHERE lecturer_id = (SELECT linked_person_id FROM public.user_profiles WHERE id = auth.uid())
  ) OR
  (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'admin'
);

-- ==========================================
-- ARCHITECTURE-AWARE POLICIES: test_registers
-- ==========================================

CREATE POLICY "Enable insert for owning lecturer or admin" 
ON public.test_registers FOR INSERT 
TO authenticated WITH CHECK (
  lecturer_id = (SELECT linked_person_id FROM public.user_profiles WHERE id = auth.uid()) OR
  (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY "Enable update for owning lecturer or admin" 
ON public.test_registers FOR UPDATE 
TO authenticated USING (
  lecturer_id = (SELECT linked_person_id FROM public.user_profiles WHERE id = auth.uid()) OR
  (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'admin'
);