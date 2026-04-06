ALTER TABLE open_text_responses ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'open_text_responses'
      AND policyname = 'Anyone can delete open text responses'
  ) THEN
    CREATE POLICY "Anyone can delete open text responses"
      ON open_text_responses
      FOR DELETE
      USING (true);
  END IF;
END
$$;
