import { supabase } from './client.js';

/**
 * Salva uma resposta aberta para correcao posterior.
 * @param {{
 *   module_id: string,
 *   challenge_id: string,
 *   student_name: string,
 *   response_text: string,
 *   status: string
 * }} response
 */
export async function createOpenTextResponse(response) {
  const { error } = await supabase
    .from('open_text_responses')
    .insert(response);

  if (error) {
    throw new Error(`Erro ao salvar resposta aberta: ${error.message}`);
  }
}

/**
 * Lista respostas abertas de um modulo para revisao do professor.
 * @param {string} moduleId
 */
export async function fetchModuleOpenTextResponses(moduleId) {
  const { data: responseRows, error: responseError } = await supabase
    .from('open_text_responses')
    .select('id, challenge_id, student_name, response_text, status, teacher_feedback, reviewed_at, created_at')
    .eq('module_id', moduleId)
    .order('created_at', { ascending: false });

  if (responseError) {
    throw new Error(`Erro ao carregar respostas abertas: ${responseError.message}`);
  }

  const challengeIds = [...new Set((responseRows || []).map((row) => row.challenge_id).filter(Boolean))];
  let promptById = new Map();

  if (challengeIds.length > 0) {
    const { data: challengeRows, error: challengeError } = await supabase
      .from('challenges')
      .select('id, prompt')
      .in('id', challengeIds);

    if (challengeError) {
      throw new Error(`Erro ao carregar perguntas das respostas abertas: ${challengeError.message}`);
    }

    promptById = new Map((challengeRows || []).map((challenge) => [challenge.id, challenge.prompt]));
  }

  return (responseRows || []).map((row) => ({
    ...row,
    prompt: promptById.get(row.challenge_id) || 'Pergunta removida ou indisponivel',
  }));
}

/**
 * Salva a revisao do professor para uma resposta aberta.
 * @param {string} responseId
 * @param {{ status: string, teacher_feedback?: string }} review
 */
export async function updateOpenTextResponseReview(responseId, review) {
  const reviewedAt = new Date().toISOString();

  const { error } = await supabase
    .from('open_text_responses')
    .update({
      status: review.status,
      teacher_feedback: review.teacher_feedback || '',
      reviewed_at: reviewedAt,
    })
    .eq('id', responseId);

  if (error) {
    throw new Error(`Erro ao salvar correcao: ${error.message}`);
  }

  return { reviewed_at: reviewedAt };
}
