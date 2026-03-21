ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'classrooms'
      AND policyname = 'Anyone can delete classrooms'
  ) THEN
    CREATE POLICY "Anyone can delete classrooms"
      ON classrooms
      FOR DELETE
      USING (true);
  END IF;
END
$$;
