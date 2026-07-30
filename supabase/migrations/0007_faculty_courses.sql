-- Enable RLS on tables
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculties ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read courses
CREATE POLICY "Allow read courses"
ON public.courses
FOR SELECT
USING (auth.role() = 'authenticated');

-- Allow authenticated users to read faculties
CREATE POLICY "Allow read faculties"
ON public.faculties
FOR SELECT
USING (auth.role() = 'authenticated');

-- Optional: Students can only read their own courses
CREATE POLICY "Students can read their courses"
ON public.courses
FOR SELECT
USING (
  student_ids ? auth.uid()::text
);