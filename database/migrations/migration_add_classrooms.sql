CREATE TABLE IF NOT EXISTS classrooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_classrooms_active_sort_order
  ON classrooms(active, sort_order, created_at);

ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'classrooms'
      AND policyname = 'Classrooms are viewable by everyone'
  ) THEN
    CREATE POLICY "Classrooms are viewable by everyone"
      ON classrooms
      FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'classrooms'
      AND policyname = 'Anyone can insert classrooms'
  ) THEN
    CREATE POLICY "Anyone can insert classrooms"
      ON classrooms
      FOR INSERT
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'classrooms'
      AND policyname = 'Anyone can update classrooms'
  ) THEN
    CREATE POLICY "Anyone can update classrooms"
      ON classrooms
      FOR UPDATE
      USING (true);
  END IF;
END
$$;

ALTER TABLE module_attempts
  ADD COLUMN IF NOT EXISTS classroom_id UUID REFERENCES classrooms(id) ON DELETE SET NULL;

ALTER TABLE module_attempts
  ADD COLUMN IF NOT EXISTS classroom_name TEXT;

ALTER TABLE open_text_responses
  ADD COLUMN IF NOT EXISTS classroom_id UUID REFERENCES classrooms(id) ON DELETE SET NULL;

ALTER TABLE open_text_responses
  ADD COLUMN IF NOT EXISTS classroom_name TEXT;
