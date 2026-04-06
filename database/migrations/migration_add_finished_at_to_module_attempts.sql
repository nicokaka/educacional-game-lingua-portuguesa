ALTER TABLE module_attempts
  ADD COLUMN IF NOT EXISTS finished_at TIMESTAMPTZ;

UPDATE module_attempts
SET finished_at = created_at
WHERE finished_at IS NULL;

ALTER TABLE module_attempts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'module_attempts'
      AND policyname = 'Anyone can update module attempts'
  ) THEN
    CREATE POLICY "Anyone can update module attempts"
      ON module_attempts
      FOR UPDATE
      USING (true);
  END IF;
END
$$;
