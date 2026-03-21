import { supabase } from './client.js';

/**
 * Salva uma tentativa finalizada de modulo.
 * @param {{
 *   module_id: string,
 *   student_name: string,
 *   score: number,
 *   max_score: number,
 *   completed: boolean
 * }} attempt
 */
export async function createModuleAttempt(attempt) {
  const { error } = await supabase
    .from('module_attempts')
    .insert(attempt);

  if (error) {
    throw new Error(`Erro ao salvar tentativa: ${error.message}`);
  }
}
