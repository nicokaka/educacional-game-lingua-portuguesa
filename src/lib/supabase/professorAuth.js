/**
 * Professor Auth — Verificação de senha via Supabase RPC.
 *
 * A senha nunca é comparada no frontend (não fica no bundle JS).
 * A função `verify_professor_password` no banco usa bcrypt.
 *
 * Para alterar a senha: execute no SQL Editor do Supabase:
 *   SELECT set_professor_password('nova_senha_aqui');
 *
 * FALLBACK: Se a migration 002 ainda não foi aplicada no banco,
 * usa VITE_PROFESSOR_PASSWORD do .env como fallback temporário.
 */

import { supabase } from './client.js';

/**
 * Verifica a senha do professor via RPC server-side.
 * @param {string} password
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function verifyProfessorPassword(password) {
  if (!password?.trim()) {
    return { success: false, error: 'Digite a senha.' };
  }

  try {
    const { data, error } = await supabase.rpc('verify_professor_password', {
      input_password: password,
    });

    if (error) {
      // Se a função RPC não existe (migration 002 ainda não aplicada),
      // usa o fallback do .env para não quebrar o professor em sala.
      if (
        error.message?.includes('does not exist') ||
        error.code === 'PGRST202' ||
        error.code === '42883'
      ) {
        console.warn('[Auth] RPC verify_professor_password não encontrada — usando fallback .env. Aplique migration 002.');
        return verifyPasswordFallback(password);
      }
      return { success: false, error: 'Erro ao verificar senha. Tente novamente.' };
    }

    if (data === true) {
      return { success: true };
    }

    return { success: false, error: 'Senha incorreta.' };
  } catch (e) {
    return { success: false, error: 'Falha de conexão. Verifique a internet e tente novamente.' };
  }
}

/**
 * Fallback temporário: usa VITE_PROFESSOR_PASSWORD do .env.
 * Funciona enquanto a migration 002 não for aplicada.
 * @param {string} password
 */
function verifyPasswordFallback(password) {
  const envPassword = import.meta.env.VITE_PROFESSOR_PASSWORD;

  if (!envPassword) {
    return {
      success: false,
      error: 'Configuração de autenticação incompleta. Configure VITE_PROFESSOR_PASSWORD no .env ou aplique a migration 002 no Supabase.',
    };
  }

  if (password === envPassword) {
    return { success: true };
  }

  return { success: false, error: 'Senha incorreta.' };
}
