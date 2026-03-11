/**
 * Supabase Client — Inicializa a conexão com o banco.
 * 
 * Usa variáveis de ambiente do Vite (VITE_ prefix).
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('⚠️ Supabase: variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórias no .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
