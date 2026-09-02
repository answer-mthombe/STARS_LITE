-- Repair the missing module relationship used by test invigilation queries.

GRANT SELECT ON TABLE public.test_attendance_records TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'test_attendance_records'
      AND policyname = 'Authenticated users can read test attendance records'
  ) THEN
    CREATE POLICY "Authenticated users can read test attendance records"
      ON public.test_attendance_records
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_test_sessions_module'
      AND conrelid = 'public.test_sessions'::regclass
  ) THEN
    ALTER TABLE public.test_sessions
      ADD CONSTRAINT fk_test_sessions_module
      FOREIGN KEY (module_id)
      REFERENCES public.modules (id)
      ON DELETE RESTRICT;
  END IF;
END
$$;
