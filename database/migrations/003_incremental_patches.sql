-- ==========================================
-- GramQuest — Migration 003: Migrations de incrementais
-- aplicadas após o schema inicial
-- ==========================================

-- Adiciona coluna finished_at em module_attempts (se não existir)
ALTER TABLE module_attempts
  ADD COLUMN IF NOT EXISTS finished_at TIMESTAMPTZ;

-- Adiciona student_access_id em open_text_responses (se não existir)
ALTER TABLE open_text_responses
  ADD COLUMN IF NOT EXISTS student_access_id TEXT;

-- Cria tabela classrooms (se não existir — pode ter sido criada antes)
CREATE TABLE IF NOT EXISTS classrooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Policies de DELETE para classrooms (faltavam no schema original)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'classrooms' AND policyname = 'Anyone can delete classrooms'
  ) THEN
    CREATE POLICY "Anyone can delete classrooms" ON classrooms FOR DELETE USING (true);
  END IF;
END $$;

-- Policies de DELETE para open_text_responses (faltavam no schema original)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'open_text_responses' AND policyname = 'Anyone can delete open text responses'
  ) THEN
    CREATE POLICY "Anyone can delete open text responses" ON open_text_responses FOR DELETE USING (true);
  END IF;
END $$;

-- Policies de DELETE para module_attempts (faltavam no schema original)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'module_attempts' AND policyname = 'Anyone can delete module attempts'
  ) THEN
    CREATE POLICY "Anyone can delete module attempts" ON module_attempts FOR DELETE USING (true);
  END IF;
END $$;

-- Índice para open_text_responses por student_access_id (se não existir)
CREATE INDEX IF NOT EXISTS idx_open_text_responses_student_access_id
  ON open_text_responses(student_access_id);

-- Índice para module_attempts por module_id e created_at (para queries de leaderboard)
CREATE INDEX IF NOT EXISTS idx_module_attempts_module_created
  ON module_attempts(module_id, created_at);
