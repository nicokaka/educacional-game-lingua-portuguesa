-- ==========================================
-- GramQuest — Migration 002: Professor Auth via RPC
--
-- OBJETIVO: Mover a verificação da senha do professor
-- para o servidor (banco de dados), eliminando a exposição
-- da senha no bundle JavaScript.
--
-- UX DO PROFESSOR: IDÊNTICO — apenas digita a senha.
-- O frontend chama supabase.rpc('verify_professor_password')
-- em vez de comparar localmente.
--
-- COMO APLICAR:
--   Cole este SQL no Supabase SQL Editor e clique RUN.
--   Em seguida, configure a senha inicial via dashboard:
--   Settings > Database > SQL Editor, rode:
--     SELECT set_professor_password('SUA_SENHA_AQUI');
-- ==========================================

-- Habilita extensão de criptografia (já ativa no Supabase por padrão)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Tabela de configuração do app (sem acesso público direto)
CREATE TABLE IF NOT EXISTS app_config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: ninguém pode ler ou escrever diretamente
-- (acesso apenas via funções SECURITY DEFINER)
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
-- Sem policies = bloqueio total para acesso direto

-- Função pública: verifica a senha do professor
-- Chamada pelo frontend via supabase.rpc('verify_professor_password')
CREATE OR REPLACE FUNCTION verify_professor_password(input_password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  stored_hash TEXT;
BEGIN
  SELECT value INTO stored_hash
  FROM app_config
  WHERE key = 'professor_password_hash';

  IF stored_hash IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Comparação bcrypt (segura contra timing attacks)
  RETURN stored_hash = crypt(input_password, stored_hash);
END;
$$;

-- Função restrita: define/atualiza a senha do professor
-- Só deve ser chamada via SQL Editor do Supabase (não pelo frontend)
CREATE OR REPLACE FUNCTION set_professor_password(new_password TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF length(new_password) < 6 THEN
    RAISE EXCEPTION 'Senha deve ter pelo menos 6 caracteres.';
  END IF;

  INSERT INTO app_config (key, value, updated_at)
  VALUES ('professor_password_hash', crypt(new_password, gen_salt('bf', 10)), now())
  ON CONFLICT (key) DO UPDATE
    SET value = crypt(new_password, gen_salt('bf', 10)),
        updated_at = now();
END;
$$;

-- Senha padrão inicial: prof2026
-- IMPORTANTE: Mude via SQL Editor: SELECT set_professor_password('nova_senha');
SELECT set_professor_password('prof2026');
