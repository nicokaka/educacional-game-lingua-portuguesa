-- ==========================================
-- GramQuest — Database Schema (v1 — inicial)
-- Cole tudo no SQL Editor do Supabase e clique RUN
-- ==========================================

-- Limpa tabelas anteriores (se existirem)
DROP TRIGGER IF EXISTS set_updated_at ON modules;
DROP FUNCTION IF EXISTS update_updated_at();
DROP TABLE IF EXISTS classrooms CASCADE;
DROP TABLE IF EXISTS open_text_responses CASCADE;
DROP TABLE IF EXISTS module_attempts CASCADE;
DROP TABLE IF EXISTS challenges CASCADE;
DROP TABLE IF EXISTS modules CASCADE;

-- Tabela: classrooms (turmas cadastradas pelo professor)
CREATE TABLE classrooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela: modules (módulos do professor)
CREATE TABLE modules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL DEFAULT 'Professor',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela: challenges (desafios de cada módulo)
CREATE TABLE challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('drag_drop', 'multiple_choice', 'true_false', 'ordering', 'open_text')),
  prompt TEXT NOT NULL,
  difficulty SMALLINT NOT NULL DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 3),
  data JSONB NOT NULL DEFAULT '{}',
  sort_order SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela: open_text_responses (respostas dissertativas dos alunos)
CREATE TABLE open_text_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  classroom_id UUID REFERENCES classrooms(id) ON DELETE SET NULL,
  classroom_name TEXT,
  student_access_id TEXT,
  student_name TEXT NOT NULL,
  response_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  teacher_feedback TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela: module_attempts (tentativas dos alunos por modulo)
CREATE TABLE module_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  classroom_id UUID REFERENCES classrooms(id) ON DELETE SET NULL,
  classroom_name TEXT,
  student_name TEXT NOT NULL,
  score INTEGER NOT NULL,
  max_score INTEGER NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para busca rápida
CREATE INDEX idx_classrooms_active_sort_order ON classrooms(active, sort_order, created_at);
CREATE INDEX idx_challenges_module_id ON challenges(module_id);
CREATE INDEX idx_module_attempts_module_id ON module_attempts(module_id);
CREATE INDEX idx_open_text_responses_student_access_id ON open_text_responses(student_access_id);

-- Trigger para auto-update de updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON modules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ==========================================
-- Row Level Security (RLS)
-- Política: leitura pública, escrita aberta (acesso via professor verificado no frontend)
-- ==========================================
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE open_text_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;

-- SELECT: todos podem ler
CREATE POLICY "Classrooms are viewable by everyone"          ON classrooms          FOR SELECT USING (true);
CREATE POLICY "Modules are viewable by everyone"             ON modules             FOR SELECT USING (true);
CREATE POLICY "Challenges are viewable by everyone"          ON challenges          FOR SELECT USING (true);
CREATE POLICY "Module attempts are viewable by everyone"     ON module_attempts     FOR SELECT USING (true);
CREATE POLICY "Open text responses are viewable by everyone" ON open_text_responses FOR SELECT USING (true);

-- INSERT: aberto (alunos precisam registrar tentativas e respostas sem conta)
CREATE POLICY "Anyone can insert classrooms"           ON classrooms          FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can insert modules"              ON modules             FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can insert challenges"           ON challenges          FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can insert module attempts"      ON module_attempts     FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can insert open text responses"  ON open_text_responses FOR INSERT WITH CHECK (true);

-- UPDATE: aberto (professor sem auth JWT atualiza via anon key)
CREATE POLICY "Anyone can update classrooms"           ON classrooms          FOR UPDATE USING (true);
CREATE POLICY "Anyone can update modules"              ON modules             FOR UPDATE USING (true);
CREATE POLICY "Anyone can update challenges"           ON challenges          FOR UPDATE USING (true);
CREATE POLICY "Anyone can update module attempts"      ON module_attempts     FOR UPDATE USING (true);
CREATE POLICY "Anyone can update open text responses"  ON open_text_responses FOR UPDATE USING (true);

-- DELETE: aberto (professor gerencia via editor)
CREATE POLICY "Anyone can delete classrooms"           ON classrooms          FOR DELETE USING (true);
CREATE POLICY "Anyone can delete modules"              ON modules             FOR DELETE USING (true);
CREATE POLICY "Anyone can delete challenges"           ON challenges          FOR DELETE USING (true);
CREATE POLICY "Anyone can delete module attempts"      ON module_attempts     FOR DELETE USING (true);
CREATE POLICY "Anyone can delete open text responses"  ON open_text_responses FOR DELETE USING (true);

-- ==========================================
-- Dados de exemplo
-- ==========================================
INSERT INTO modules (id, title, author) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Ortografia - Acentuação e Escrita', 'Prof. Silva');

INSERT INTO challenges (module_id, type, prompt, difficulty, data, sort_order) VALUES
  ('00000000-0000-0000-0000-000000000001', 'drag_drop',
   'O menino fez a _____ do trabalho escolar.', 2,
   '{"correctAnswer":"correção","hint":"Pense no verbo corrigir","monster":{"name":"Gram-Monstro","sprite":"monstro1"},"loot":[{"text":"correção","correct":true},{"text":"correçao","correct":false},{"text":"corresão","correct":false},{"text":"correcão","correct":false}]}',
   1),
  ('00000000-0000-0000-0000-000000000001', 'multiple_choice',
   'Qual frase está escrita corretamente?', 1,
   '{"monster":{"name":"Err-Ogro","sprite":"monstro2"},"options":[{"text":"A professora corrigiu as provas.","correct":true,"feedback":"Correto! corrigiu é do verbo corrigir."},{"text":"A profesora corrijiu as provas.","correct":false,"feedback":"Professora tem dois S, e corrigiu com G."},{"text":"A professora corrijiu as provas.","correct":false,"feedback":"Quase! Corrigiu se escreve com G, não J."},{"text":"A profesora corrigiu as provas.","correct":false,"feedback":"Professora tem dois S."}]}',
   2);
