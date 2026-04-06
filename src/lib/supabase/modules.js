/**
 * Modules API - CRUD de modulos e desafios no Supabase.
 *
 * Funcoes usadas tanto pelo jogo (leitura) quanto pelo editor (escrita).
 */

import { supabase } from './client.js';

/**
 * Lista todos os modulos (para o menu do aluno).
 * @returns {Promise<Array>} lista de modulos com contagem de desafios
 */
export async function fetchModules() {
  const { data, error } = await supabase
    .from('modules')
    .select('*, challenges(count)')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Erro ao carregar modulos: ${error.message}`);

  return data.map((moduleRow) => ({
    id: moduleRow.id,
    title: moduleRow.title,
    author: moduleRow.author,
    createdAt: moduleRow.created_at,
    challengeCount: moduleRow.challenges?.[0]?.count || 0,
  }));
}

/**
 * Busca um modulo completo com seus desafios (para jogar).
 * @param {string} moduleId - UUID do modulo
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<object>} modulo no formato esperado pelo engine
 */
export async function fetchModuleWithChallenges(moduleId, options = {}) {
  const { signal } = options;

  let moduleQuery = supabase
    .from('modules')
    .select('*')
    .eq('id', moduleId)
    .single();

  if (signal) {
    moduleQuery = moduleQuery.abortSignal(signal);
  }

  const { data: moduleRow, error: moduleError } = await moduleQuery;

  if (moduleError) {
    throw new Error(`Modulo nao encontrado: ${moduleError.message}`);
  }

  let challengesQuery = supabase
    .from('challenges')
    .select('*')
    .eq('module_id', moduleId)
    .order('sort_order');

  if (signal) {
    challengesQuery = challengesQuery.abortSignal(signal);
  }

  const { data: challengeRows, error: challengesError } = await challengesQuery;

  if (challengesError) {
    throw new Error(`Erro ao carregar desafios: ${challengesError.message}`);
  }

  return {
    id: moduleRow.id,
    module: moduleRow.title,
    author: moduleRow.author,
    updatedAt: moduleRow.updated_at,
    challenges: challengeRows.map((challengeRow, index) =>
      normalizeChallenge({
        ...challengeRow.data,
        id: challengeRow.data?.id || challengeRow.id || (Date.now() + index),
        challengeRecordId: challengeRow.id,
        type: challengeRow.type,
        prompt: challengeRow.prompt,
        difficulty: challengeRow.difficulty,
      })
    ),
  };
}

/**
 * Salva um modulo novo com seus desafios.
 * @param {{ title: string, author: string }} moduleData
 * @param {Array} challenges - array de desafios
 * @returns {Promise<string>} ID do modulo criado
 */
export async function createModule(moduleData, challenges) {
  const { data: moduleRow, error: moduleError } = await supabase
    .from('modules')
    .insert({ title: moduleData.title, author: moduleData.author })
    .select()
    .single();

  if (moduleError) throw new Error(`Erro ao criar modulo: ${moduleError.message}`);

  if (challenges.length > 0) {
    const rows = challenges.map((challenge, index) => ({
      module_id: moduleRow.id,
      type: challenge.type,
      prompt: challenge.prompt,
      difficulty: challenge.difficulty || 1,
      data: extractChallengeData(challenge),
      sort_order: index + 1,
    }));

    const { error: challengesError } = await supabase
      .from('challenges')
      .insert(rows);

    if (challengesError) throw new Error(`Erro ao salvar desafios: ${challengesError.message}`);
  }

  return moduleRow.id;
}

/**
 * Atualiza um modulo existente e seus desafios.
 * @param {string} moduleId
 * @param {{ title: string, author: string }} moduleData
 * @param {Array} challenges
 */
export async function updateModule(moduleId, moduleData, challenges) {
  const { error: moduleError } = await supabase
    .from('modules')
    .update({ title: moduleData.title, author: moduleData.author })
    .eq('id', moduleId);

  if (moduleError) throw new Error(`Erro ao atualizar modulo: ${moduleError.message}`);

  const { data: existingChallengeRows, error: existingChallengesError } = await supabase
    .from('challenges')
    .select('id')
    .eq('module_id', moduleId);

  if (existingChallengesError) {
    throw new Error(`Erro ao carregar desafios existentes: ${existingChallengesError.message}`);
  }

  const existingIds = new Set((existingChallengeRows || []).map((row) => row.id));
  const keptIds = new Set();
  const rowsToUpdate = []; // { id, payload }
  const rowsToInsert = [];

  for (const [index, challenge] of challenges.entries()) {
    const rowPayload = buildChallengeRowPayload(moduleId, challenge, index + 1);
    const existingRowId = resolveExistingChallengeRowId(challenge, existingIds);

    if (existingRowId) {
      keptIds.add(existingRowId);
      rowsToUpdate.push({ id: existingRowId, payload: rowPayload });
    } else {
      rowsToInsert.push(rowPayload);
    }
  }

  // Executa updates em paralelo (Promise.all) — de N round-trips sequenciais para 1
  if (rowsToUpdate.length > 0) {
    const updateResults = await Promise.all(
      rowsToUpdate.map(({ id, payload }) =>
        supabase.from('challenges').update(payload).eq('id', id)
      )
    );

    const updateError = updateResults.find((r) => r.error)?.error;
    if (updateError) throw new Error(`Erro ao atualizar desafio: ${updateError.message}`);
  }

  if (rowsToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from('challenges')
      .insert(rowsToInsert);

    if (insertError) throw new Error(`Erro ao salvar novos desafios: ${insertError.message}`);
  }

  const removedIds = [...existingIds].filter((id) => !keptIds.has(id));

  if (removedIds.length > 0) {
    const { error: deleteError } = await supabase
      .from('challenges')
      .delete()
      .in('id', removedIds);

    if (deleteError) throw new Error(`Erro ao remover desafios excluidos: ${deleteError.message}`);
  }
}

/**
 * Deleta um modulo (CASCADE deleta os desafios).
 * @param {string} moduleId
 */
export async function deleteModule(moduleId) {
  const { error } = await supabase
    .from('modules')
    .delete()
    .eq('id', moduleId);

  if (error) throw new Error(`Erro ao deletar modulo: ${error.message}`);
}

/**
 * Extrai os dados especificos do tipo de desafio.
 */
function extractChallengeData(challenge) {
  const { type, prompt, difficulty, id, challengeRecordId, ...data } = challenge;

  if (type === 'multiple_choice' && Array.isArray(data.options)) {
    data.options = data.options.map((option, index) => ({
      ...option,
      id: option.id || `${id || prompt || 'option'}_opt${index}`,
    }));
  }

  return data;
}

function buildChallengeRowPayload(moduleId, challenge, sortOrder) {
  return {
    module_id: moduleId,
    type: challenge.type,
    prompt: challenge.prompt,
    difficulty: challenge.difficulty || 1,
    data: extractChallengeData(challenge),
    sort_order: sortOrder,
  };
}

function resolveExistingChallengeRowId(challenge, existingIds) {
  const candidateIds = [challenge?.challengeRecordId, challenge?.id]
    .map((value) => String(value || '').trim())
    .filter(Boolean);

  return candidateIds.find((value) => existingIds.has(value)) || null;
}

function normalizeChallenge(challenge) {
  const normalized = { ...challenge };

  if (normalized.type === 'multiple_choice') {
    normalized.options = Array.isArray(normalized.options)
      ? normalized.options.map((option, index) => ({
          ...option,
          id: option.id || `${normalized.id}_opt${index}`,
        }))
      : [];
  }

  if (normalized.type === 'true_false' && Array.isArray(normalized.statements)) {
    normalized.statements = normalized.statements.map((statement) => ({
      text: statement.text || '',
      correctAnswer: typeof statement.correctAnswer === 'boolean'
        ? statement.correctAnswer
        : undefined,
    }));
  }

  if (!normalized.hint && normalized.explanation) {
    normalized.hint = normalized.explanation;
  }

  if (normalized.type === 'drag_drop') {
    normalized.loot = Array.isArray(normalized.loot) ? [...normalized.loot] : [];

    const correctAnswer = normalized.correctAnswer?.trim?.();
    const hasCorrectOption = normalized.loot.some(
      (item) => item?.text?.trim?.().toLowerCase() === correctAnswer?.toLowerCase()
    );

    if (correctAnswer && !hasCorrectOption) {
      normalized.loot.unshift({ text: normalized.correctAnswer, correct: true });
    }
  }

  return normalized;
}
