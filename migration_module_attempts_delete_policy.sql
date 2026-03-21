ALTER TABLE module_attempts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'module_attempts'
      AND policyname = 'Anyone can delete module attempts'
  ) THEN
    CREATE POLICY "Anyone can delete module attempts"
      ON module_attempts
      FOR DELETE
      USING (true);
  END IF;
END
$$;
