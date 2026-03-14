/**
 * Data Loader — Carrega e valida JSONC de conteúdo do professor.
 *
 * Usa json5 para suportar comentários e trailing commas.
 * Valida estrutura básica antes de retornar.
 */

import JSON5 from 'json5';
import { getSupportedTypes } from './challengeRegistry.js';

/**
 * Carrega conteúdo a partir de texto JSONC.
 * @param {string} rawText - conteúdo JSONC como string
 * @returns {{ module: string, author: string, challenges: Array }} dados validados
 * @throws {Error} se o formato for inválido
 */
export function parseContent(rawText) {
  let data;

  try {
    data = JSON5.parse(rawText);
  } catch (e) {
    throw new Error(
      `Erro ao ler o arquivo de conteúdo. Verifique se o JSON está correto.\n` +
      `Detalhe técnico: ${e.message}`
    );
  }

  validateStructure(data);
  return data;
}

/**
 * Valida a estrutura básica do conteúdo.
 * @param {any} data
 */
function validateStructure(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('O arquivo de conteúdo deve ser um objeto JSON.');
  }

  if (!data.module || typeof data.module !== 'string') {
    throw new Error('O campo "module" é obrigatório e deve ser um texto.');
  }

  if (!Array.isArray(data.challenges) || data.challenges.length === 0) {
    throw new Error('O campo "challenges" é obrigatório e deve ter pelo menos 1 desafio.');
  }

  const supportedTypes = getSupportedTypes();

  data.challenges.forEach((challenge, index) => {
    const pos = index + 1;

    if (!challenge.id) {
      throw new Error(`Desafio #${pos}: campo "id" é obrigatório.`);
    }

    if (!challenge.type) {
      throw new Error(`Desafio #${pos} (${challenge.id}): campo "type" é obrigatório.`);
    }

    if (!supportedTypes.includes(challenge.type)) {
      throw new Error(
        `Desafio #${pos} (${challenge.id}): tipo "${challenge.type}" não é suportado.\n` +
        `Tipos válidos: ${supportedTypes.join(', ')}`
      );
    }

    if (!challenge.prompt || typeof challenge.prompt !== 'string') {
      throw new Error(`Desafio #${pos} (${challenge.id}): campo "prompt" é obrigatório.`);
    }

    // Validação por tipo
    validateByType(challenge, pos);
  });
}

/**
 * Validação específica por tipo de desafio.
 * @param {any} challenge
 * @param {number} pos
 */
function validateByType(challenge, pos) {
  const label = `Desafio #${pos} (${challenge.id})`;

  switch (challenge.type) {
    case 'drag_drop': {
      if (!challenge.correctAnswer) {
        throw new Error(`${label}: "correctAnswer" é obrigatório para tipo drag_drop.`);
      }
      if (!Array.isArray(challenge.loot) || challenge.loot.length < 2) {
        throw new Error(`${label}: "loot" deve ter pelo menos 2 opções.`);
      }
      const hasCorrect = challenge.loot.some(l => l.correct === true);
      if (!hasCorrect) {
        throw new Error(`${label}: "loot" deve ter pelo menos 1 opção com correct: true.`);
      }
      break;
    }

    case 'multiple_choice': {
      if (!Array.isArray(challenge.options) || challenge.options.length < 2) {
        throw new Error(`${label}: "options" deve ter pelo menos 2 alternativas.`);
      }
      const hasCorrectOpt = challenge.options.some(o => o.correct === true);
      if (!hasCorrectOpt) {
        throw new Error(`${label}: "options" deve ter pelo menos 1 alternativa correta.`);
      }
      // Atribui IDs automáticos se o professor não definiu
      challenge.options.forEach((opt, i) => {
        if (!opt.id) opt.id = `${challenge.id}_opt${i}`;
      });
      break;
    }

    case 'true_false': {
      if (Array.isArray(challenge.statements) && challenge.statements.length > 0) {
        challenge.statements.forEach((statement, index) => {
          if (!statement.text || typeof statement.text !== 'string') {
            throw new Error(`${label}: a afirmacao #${index + 1} precisa ter texto.`);
          }
          if (typeof statement.correctAnswer !== 'boolean') {
            throw new Error(`${label}: a afirmacao #${index + 1} precisa ter correctAnswer true ou false.`);
          }
        });
      } else if (typeof challenge.correctAnswer !== 'boolean') {
        throw new Error(`${label}: "correctAnswer" deve ser true ou false.`);
      }
      break;
    }

    case 'ordering': {
      if (!Array.isArray(challenge.fragments) || challenge.fragments.length < 2) {
        throw new Error(`${label}: "fragments" deve ter pelo menos 2 itens.`);
      }
      break;
    }
  }

  // Validação de difficulty (opcional, default = 1)
  if (challenge.difficulty === undefined) {
    challenge.difficulty = 1;
  }
}
