/**
 * Supabase Client — Singleton de conexão com o banco.
 *
 * Variáveis obrigatórias no .env:
 *   VITE_SUPABASE_URL=https://...supabase.co
 *   VITE_SUPABASE_ANON_KEY=eyJ...
 *
 * Nota: variáveis VITE_ ficam visíveis no bundle JS (by design do Vite).
 * A anon key do Supabase é segura para expor publicamente.
 * O controle de acesso é feito via RLS no banco de dados.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '[GramQuest] Configuração incompleta: VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY ' +
    'são obrigatórios no arquivo .env. Consulte o .env.example para referência.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

