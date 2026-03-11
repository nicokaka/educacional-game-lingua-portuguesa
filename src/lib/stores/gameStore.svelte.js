/**
 * Game Store — State management genérico com Svelte 5 Runes.
 *
 * O submitAnswer() é genérico — delega pro validator correto via challengeRegistry.
 * Funciona com QUALQUER tipo de desafio sem precisar de if/else por tipo.
 */

import { getValidator } from '../engine/challengeRegistry.js';
import { dispatchFeedback } from '../engine/feedbackEngine.js';

// ── State ─────────────────────────────────────────────

let state = $state({
  phase: 'menu',            // 'menu' | 'playing' | 'victory' | 'defeat' | 'error'
  currentChallenge: null,    // Challenge atual (qualquer tipo)
  playerAnswer: null,        // Resposta do jogador (formato depende do tipo)
  backpack: [],              // Mochila (WordItems — só drag_drop)
  score: 0,
  streak: 0,                 // Combo de acertos consecutivos
  monsterHp: 100,            // HP do monstro atual
  maxMonsterHp: 100,
  progress: { current: 0, total: 0, percent: 0 },
  moduleName: '',
  errorMessage: '',
});

// ── Getters ───────────────────────────────────────────

export function getState() {
  return state;
}

// ── Actions ───────────────────────────────────────────

/**
 * Inicia uma partida com os dados carregados.
 * @param {object} moduleData - dados do módulo (output do dataLoader)
 * @param {object} manager - challengeManager
 */
export function startGame(moduleData, manager) {
  state.moduleName = moduleData.module;
  state.score = 0;
  state.streak = 0;
  state.phase = 'playing';
  state.errorMessage = '';
  loadNextChallenge(manager);
}

/**
 * Carrega o próximo desafio.
 * @param {object} manager - challengeManager
 */
export function loadNextChallenge(manager) {
  const next = manager.next();

  if (!next) {
    state.phase = 'victory';
    state.currentChallenge = null;
    return;
  }

  state.currentChallenge = next;
  state.playerAnswer = null;
  state.progress = manager.progress();

  // Calcula HP do monstro baseado na dificuldade
  const difficulty = next.difficulty || 1;
  const baseHp = 60 + difficulty * 20; // 80, 100, 120
  state.monsterHp = baseHp;
  state.maxMonsterHp = baseHp;

  // Se é drag_drop, popula a mochila
  if (next.type === 'drag_drop' && next.loot) {
    state.backpack = [...next.loot];
  } else {
    state.backpack = [];
  }
}

/**
 * Submete uma resposta — genérico pra qualquer tipo.
 * @param {any} answer - formato depende do tipo do desafio
 * @param {object} manager - challengeManager (pra carregar o próximo)
 * @returns {{ correct: boolean, feedback?: string }}
 */
export function submitAnswer(answer, manager) {
  const challenge = state.currentChallenge;
  if (!challenge) return { correct: false };

  const validate = getValidator(challenge.type);
  if (!validate) return { correct: false };

  const isCorrect = validate(challenge, answer);
  const difficulty = challenge.difficulty || 1;

  if (isCorrect) {
    // Scoring com multiplicador de dificuldade e streak
    state.score += 10 * difficulty * (1 + state.streak);
    state.streak++;

    // Dano no monstro
    const damage = 20 + state.streak * 5;
    state.monsterHp = Math.max(0, state.monsterHp - damage);

    dispatchFeedback('correct');

    // Monstro morreu → próximo desafio (com delay pra animação)
    if (state.monsterHp <= 0) {
      setTimeout(() => loadNextChallenge(manager), 1200);
    }

    return { correct: true };
  } else {
    // Errou
    state.streak = 0;
    state.monsterHp = Math.min(state.maxMonsterHp, state.monsterHp + 10);

    dispatchFeedback('wrong');

    // Feedback específico do multiple_choice
    let feedback = '';
    if (challenge.type === 'multiple_choice') {
      const selected = challenge.options.find(o => o.id === answer);
      feedback = selected?.feedback || '';
    } else if (challenge.type === 'true_false') {
      feedback = challenge.explanation || '';
    }

    return { correct: false, feedback };
  }
}

/**
 * Seta estado de erro.
 * @param {string} message
 */
export function setError(message) {
  state.phase = 'error';
  state.errorMessage = message;
}

/**
 * Reseta tudo pra menu.
 */
export function resetToMenu() {
  state.phase = 'menu';
  state.currentChallenge = null;
  state.playerAnswer = null;
  state.backpack = [];
  state.score = 0;
  state.streak = 0;
  state.monsterHp = 100;
  state.maxMonsterHp = 100;
  state.progress = { current: 0, total: 0, percent: 0 };
  state.errorMessage = '';
}
