ALTER TABLE open_text_responses
  ADD COLUMN IF NOT EXISTS student_access_id TEXT;

CREATE INDEX IF NOT EXISTS idx_open_text_responses_student_access_id
  ON open_text_responses(student_access_id);
