/**
 * Modules API — CRUD de módulos e desafios no Supabase.
 * 
 * Funções usadas tanto pelo jogo (leitura) quanto pelo editor (escrita).
 */

import { supabase } from './client.js';

/**
 * Lista todos os módulos (para o menu do aluno).
 * @returns {Promise<Array>} lista de módulos com contagem de desafios
 */
export async function fetchModules() {
  const { data, error } = await supabase
    .from('modules')
    .select('*, challenges(count)')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Erro ao carregar módulos: ${error.message}`);

  return data.map(m => ({
    id: m.id,
    title: m.title,
    author: m.author,
    createdAt: m.created_at,
    challengeCount: m.challenges?.[0]?.count || 0,
  }));
}

/**
 * Busca um módulo completo com seus desafios (para jogar).
 * @param {string} moduleId - UUID do módulo
 * @returns {Promise<object>} módulo no formato esperado pelo engine
 */
export async function fetchModuleWithChallenges(moduleId) {
  // Busca módulo
  const { data: mod, error: modError } = await supabase
    .from('modules')
    .select('*')
    .eq('id', moduleId)
    .single();

  if (modError) throw new Error(`Módulo não encontrado: ${modError.message}`);

  // Busca desafios
  const { data: challenges, error: chError } = await supabase
    .from('challenges')
    .select('*')
    .eq('module_id', moduleId)
    .order('sort_order');

  if (chError) throw new Error(`Erro ao carregar desafios: ${chError.message}`);

  // Converte pro formato do engine (como o parseContent retornaria)
  return {
    module: mod.title,
    author: mod.author,
    challenges: challenges.map((ch, i) => ({
      ...ch.data, // Espalha os dados específicos do tipo primeiro
      id: ch.data?.id || ch.id || (Date.now() + i), // Força ID único pra interface
      type: ch.type,
      prompt: ch.prompt,
      difficulty: ch.difficulty,
    })),
  };
}

/**
 * Salva um módulo novo com seus desafios.
 * @param {{ title: string, author: string }} moduleData
 * @param {Array} challenges - array de desafios
 * @returns {Promise<string>} ID do módulo criado
 */
export async function createModule(moduleData, challenges) {
  // Insere módulo
  const { data: mod, error: modError } = await supabase
    .from('modules')
    .insert({ title: moduleData.title, author: moduleData.author })
    .select()
    .single();

  if (modError) throw new Error(`Erro ao criar módulo: ${modError.message}`);

  // Insere desafios
  if (challenges.length > 0) {
    const rows = challenges.map((ch, i) => ({
      module_id: mod.id,
      type: ch.type,
      prompt: ch.prompt,
      difficulty: ch.difficulty || 1,
      data: extractChallengeData(ch),
      sort_order: i + 1,
    }));

    const { error: chError } = await supabase
      .from('challenges')
      .insert(rows);

    if (chError) throw new Error(`Erro ao salvar desafios: ${chError.message}`);
  }

  return mod.id;
}

/**
 * Atualiza um módulo existente e seus desafios.
 * @param {string} moduleId
 * @param {{ title: string, author: string }} moduleData
 * @param {Array} challenges
 */
export async function updateModule(moduleId, moduleData, challenges) {
  // Atualiza módulo
  const { error: modError } = await supabase
    .from('modules')
    .update({ title: moduleData.title, author: moduleData.author })
    .eq('id', moduleId);

  if (modError) throw new Error(`Erro ao atualizar módulo: ${modError.message}`);

  // Deleta desafios antigos e insere novos
  const { error: delError } = await supabase
    .from('challenges')
    .delete()
    .eq('module_id', moduleId);

  if (delError) throw new Error(`Erro ao limpar desafios antigos: ${delError.message}`);

  if (challenges.length > 0) {
    const rows = challenges.map((ch, i) => ({
      module_id: moduleId,
      type: ch.type,
      prompt: ch.prompt,
      difficulty: ch.difficulty || 1,
      data: extractChallengeData(ch),
      sort_order: i + 1,
    }));

    const { error: chError } = await supabase
      .from('challenges')
      .insert(rows);

    if (chError) throw new Error(`Erro ao salvar desafios: ${chError.message}`);
  }
}

/**
 * Deleta um módulo (CASCADE deleta os desafios).
 * @param {string} moduleId
 */
export async function deleteModule(moduleId) {
  const { error } = await supabase
    .from('modules')
    .delete()
    .eq('id', moduleId);

  if (error) throw new Error(`Erro ao deletar módulo: ${error.message}`);
}

/**
 * Extrai os dados específicos do tipo de desafio (o que vai na coluna JSONB "data").
 * Separa os campos genéricos (type, prompt, difficulty) dos específicos.
 */
function extractChallengeData(challenge) {
  const { type, prompt, difficulty, id, ...data } = challenge;
  return data;
}
