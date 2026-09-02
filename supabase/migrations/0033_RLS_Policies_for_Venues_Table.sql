-- ====================================================================
-- MIGRATION: RLS Policies for Venues Table
-- ====================================================================
-- 1. Enable Row Level Security
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;

-- 2. Read Access: All authenticated users (lecturers, tutors, students) can view venues
CREATE POLICY "Venues are viewable by all authenticated users"
  ON public.venues
  FOR SELECT
  TO authenticated
  USING (true);

-- 3. Write Access: Only admins can create, update, or delete venues
CREATE POLICY "Only admins can insert venues"
  ON public.venues
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can update venues"
  ON public.venues
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can delete venues"
  ON public.venues
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );