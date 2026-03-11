-- ==========================================
-- GramQuest — Database Schema
-- Cole tudo no SQL Editor do Supabase e clique RUN
-- ==========================================

-- Limpa tabelas anteriores (se existirem)
DROP TRIGGER IF EXISTS set_updated_at ON modules;
DROP FUNCTION IF EXISTS update_updated_at();
DROP TABLE IF EXISTS challenges CASCADE;
DROP TABLE IF EXISTS modules CASCADE;

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
  type TEXT NOT NULL CHECK (type IN ('drag_drop', 'multiple_choice', 'true_false', 'ordering')),
  prompt TEXT NOT NULL,
  difficulty SMALLINT NOT NULL DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 3),
  data JSONB NOT NULL DEFAULT '{}',
  sort_order SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index para busca rápida por módulo
CREATE INDEX idx_challenges_module_id ON challenges(module_id);

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
-- ==========================================
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Modules are viewable by everyone" ON modules FOR SELECT USING (true);
CREATE POLICY "Challenges are viewable by everyone" ON challenges FOR SELECT USING (true);
CREATE POLICY "Anyone can insert modules" ON modules FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update modules" ON modules FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete modules" ON modules FOR DELETE USING (true);
CREATE POLICY "Anyone can insert challenges" ON challenges FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update challenges" ON challenges FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete challenges" ON challenges FOR DELETE USING (true);

-- ==========================================
-- Dados de exemplo
-- ==========================================
INSERT INTO modules (id, title, author) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Ortografia - Acentuação e Escrita', 'Prof. Silva');

INSERT INTO challenges (module_id, type, prompt, difficulty, data, sort_order) VALUES
  ('00000000-0000-0000-0000-000000000001', 'drag_drop', 'O menino fez a _____ do trabalho escolar.', 2,
   '{"correctAnswer": "correção", "hint": "Pense no verbo corrigir", "monster": {"name": "Gram-Monstro", "sprite": "monster_01"}, "loot": [{"text": "correção", "correct": true}, {"text": "correçao", "correct": false}, {"text": "corresão", "correct": false}, {"text": "correcão", "correct": false}]}', 1),
  ('00000000-0000-0000-0000-000000000001', 'multiple_choice', 'Qual frase está escrita corretamente?', 1,
   '{"monster": {"name": "Err-Ogro", "sprite": "monster_02"}, "options": [{"text": "A professora corrigiu as provas.", "correct": true, "feedback": "Correto! corrigiu é do verbo corrigir."}, {"text": "A profesora corrijiu as provas.", "correct": false, "feedback": "Professora tem dois S, e corrigiu com G."}, {"text": "A professora corrijiu as provas.", "correct": false, "feedback": "Quase! Corrigiu se escreve com G, não J."}, {"text": "A profesora corrigiu as provas.", "correct": false, "feedback": "Professora tem dois S."}]}', 2),
  ('00000000-0000-0000-0000-000000000001', 'true_false', 'A palavra exceção está escrita corretamente.', 1,
   '{"correctAnswer": true, "explanation": "Sim! Exceção vem do latim exceptio. O X antes de C tem som de S.", "monster": {"name": "Falsi-Fera", "sprite": "monster_03"}}', 3),
  ('00000000-0000-0000-0000-000000000001', 'true_false', 'A palavra ancioso está escrita corretamente.', 1,
   '{"correctAnswer": false, "explanation": "Não! O correto é ansioso, com S. Vem de ânsia.", "monster": {"name": "Falsi-Fera", "sprite": "monster_03"}}', 4),
  ('00000000-0000-0000-0000-000000000001', 'ordering', 'Arraste as palavras para formar a frase correta:', 3,
   '{"fragments": ["Os", "alunos", "estudaram", "para", "a", "prova"], "shuffled": true, "monster": {"name": "Caos-Cobra", "sprite": "monster_04"}}', 5),
  ('00000000-0000-0000-0000-000000000001', 'drag_drop', 'A _____ da escola é muito simpática.', 2,
   '{"correctAnswer": "diretora", "monster": {"name": "Gram-Monstro", "sprite": "monster_01"}, "loot": [{"text": "diretora", "correct": true}, {"text": "diretóra", "correct": false}, {"text": "diritora", "correct": false}, {"text": "deretora", "correct": false}]}', 6),
  ('00000000-0000-0000-0000-000000000001', 'multiple_choice', 'Em qual alternativa todas as palavras estão acentuadas corretamente?', 3,
   '{"monster": {"name": "Acento-Rex", "sprite": "monster_02"}, "options": [{"text": "café, sofá, dominó", "correct": true, "feedback": "Correto! Todas são oxítonas terminadas em vogal aberta."}, {"text": "café, sofá, domino", "correct": false, "feedback": "Dominó é oxítona terminada em O aberto — precisa de acento."}, {"text": "cafe, sofá, dominó", "correct": false, "feedback": "Café é oxítona terminada em E aberto — precisa de acento."}, {"text": "café, sofa, dominó", "correct": false, "feedback": "Sofá é oxítona terminada em A aberto — precisa de acento."}]}', 7);
