import { supabase } from './client.js';

/**
 * Salva uma resposta aberta para correcao posterior.
 * @param {{
 *   module_id: string,
 *   challenge_id: string,
 *   classroom_id?: string,
 *   classroom_name?: string,
 *   student_access_id?: string,
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
    .select('id, challenge_id, classroom_id, classroom_name, student_name, response_text, status, teacher_feedback, reviewed_at, created_at')
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
      console.error('Erro ao carregar perguntas das respostas abertas:', challengeError);
    } else {
      promptById = new Map((challengeRows || []).map((challenge) => [challenge.id, challenge.prompt]));
    }
  }

  return (responseRows || []).map((row) => ({
    ...row,
    status: row.status || 'pending',
    teacher_feedback: row.teacher_feedback || '',
    classroom_name: row.classroom_name || (row.classroom_id ? 'Turma removida ou indisponivel' : 'Turma antiga ou nao informada'),
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

/**
 * Exclui uma resposta aberta.
 * @param {string} responseId
 */
export async function deleteOpenTextResponse(responseId) {
  const { error } = await supabase
    .from('open_text_responses')
    .delete()
    .eq('id', responseId);

  if (error) {
    throw new Error(`Erro ao excluir resposta aberta: ${error.message}`);
  }
}

/**
 * Busca respostas abertas do aluno com enriquecimento de modulo e pergunta.
 * @param {{ studentAccessId?: string, studentName?: string, classroomId?: string }} filters
 */
async function fetchStudentResponseRows(studentAccessId, studentName, classroomId = '') {
  const trimmedAccessId = studentAccessId?.trim?.() || '';
  const trimmedName = studentName?.trim?.() || '';
  const trimmedClassroomId = classroomId?.trim?.() || '';

  if (!trimmedAccessId && !trimmedName) return [];

  let query = supabase
    .from('open_text_responses')
    .select('id, module_id, challenge_id, classroom_id, classroom_name, student_name, student_access_id, response_text, status, teacher_feedback, created_at, reviewed_at')
    .order('created_at', { ascending: false });

  if (trimmedAccessId) {
    query = query.eq('student_access_id', trimmedAccessId);
  } else {
    query = query.eq('student_name', trimmedName);
  }

  if (!trimmedAccessId && trimmedClassroomId) {
    query = query.or(`classroom_id.eq.${trimmedClassroomId},classroom_id.is.null`);
  }

  const { data: responseRows, error: responseError } = await query;

  if (responseError) {
    throw new Error(`Erro ao carregar suas respostas: ${responseError.message}`);
  }

  return responseRows || [];
}

export async function fetchStudentOpenTextResponses(filters = {}) {
  const trimmedAccessId = filters?.studentAccessId?.trim?.() || '';
  const trimmedName = filters?.studentName?.trim?.() || '';
  const trimmedClassroomId = filters?.classroomId?.trim?.() || '';

  if (!trimmedAccessId && !trimmedName) return [];

  let responseRows = await fetchStudentResponseRows(trimmedAccessId, trimmedName, trimmedClassroomId);

  // Compatibilidade com respostas antigas que ainda nao possuem student_access_id.
  if (trimmedAccessId && responseRows.length === 0 && trimmedName) {
    responseRows = await fetchStudentResponseRows('', trimmedName, trimmedClassroomId);
  }

  const challengeIds = [...new Set((responseRows || []).map((row) => row.challenge_id).filter(Boolean))];
  const moduleIds = [...new Set((responseRows || []).map((row) => row.module_id).filter(Boolean))];

  let promptById = new Map();
  let moduleTitleById = new Map();

  if (challengeIds.length > 0) {
    const { data: challengeRows, error: challengeError } = await supabase
      .from('challenges')
      .select('id, prompt')
      .in('id', challengeIds);

    if (challengeError) {
      console.error('Erro ao carregar perguntas das respostas do aluno:', challengeError);
    } else {
      promptById = new Map((challengeRows || []).map((challenge) => [challenge.id, challenge.prompt]));
    }
  }

  if (moduleIds.length > 0) {
    const { data: moduleRows, error: moduleError } = await supabase
      .from('modules')
      .select('id, title')
      .in('id', moduleIds);

    if (moduleError) {
      console.error('Erro ao carregar modulos das respostas do aluno:', moduleError);
    } else {
      moduleTitleById = new Map((moduleRows || []).map((module) => [module.id, module.title]));
    }
  }

  return (responseRows || []).map((row) => ({
    ...row,
    status: row.status || 'pending',
    teacher_feedback: row.teacher_feedback || '',
    classroom_name: row.classroom_name || (row.classroom_id ? 'Turma removida ou indisponivel' : 'Turma antiga ou nao informada'),
    prompt: promptById.get(row.challenge_id) || 'Pergunta removida ou indisponivel',
    module_title: moduleTitleById.get(row.module_id) || 'Modulo removido ou indisponivel',
  }));
}
