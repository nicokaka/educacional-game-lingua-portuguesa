/**
 * Game Store - state management generico com Svelte 5 Runes.
 *
 * O submitAnswer() delega a validacao para o challengeRegistry.
 */

import { getValidator } from '../engine/challengeRegistry.js';
import { dispatchFeedback } from '../engine/feedbackEngine.js';
import {
  advanceToNextChallengeState,
  applyCorrectAnswerState,
  applyHintPenaltyState,
  applyWrongAnswerState,
  createInitialGameState,
  startGameState,
} from '../engine/gameSession.js';

let state = $state(createInitialGameState());

export function getState() {
  return state;
}

export function startGame(moduleData, manager) {
  startGameState(state, moduleData);
  loadNextChallenge(manager);
}

export function loadNextChallenge(manager) {
  let next;

  try {
    next = manager.next();
  } catch (error) {
    setError(`Erro ao preparar a proxima pergunta: ${error.message}`);
    return;
  }

  if (!next) {
    advanceToNextChallengeState(state, null, state.progress);
    return;
  }

  advanceToNextChallengeState(state, next, manager.progress());

  console.debug('[GramQuest] loadNextChallenge', {
    serial: state.questionSerial,
    progress: state.progress,
    challengeId: next.id,
    challengeType: next.type,
    challengePrompt: next.prompt,
  });
}

function getHintFeedback(challenge, answer, isCorrect) {
  if (isCorrect) return '';

  if (challenge.type === 'multiple_choice') {
    const selected = challenge.options.find((option) => option.id === answer);
    return selected?.feedback || challenge.hint || '';
  }

  return challenge.hint || challenge.explanation || '';
}

export function submitAnswer(answer, manager) {
  const challenge = state.currentChallenge;
  if (!challenge) return { correct: false };

  const validate = getValidator(challenge.type);
  if (!validate) return { correct: false };

  const isCorrect = validate(challenge, answer);
  const feedback = getHintFeedback(challenge, answer, isCorrect);

  if (isCorrect) {
    applyCorrectAnswerState(state, challenge);
    dispatchFeedback('correct');

    setTimeout(() => {
      try {
        loadNextChallenge(manager);
      } catch (error) {
        setError(`Erro ao avancar para a proxima pergunta: ${error.message}`);
      }
    }, 800);

    return { correct: true };
  }

  applyWrongAnswerState(state, challenge);
  dispatchFeedback('wrong');

  if (state.phase === 'game_over') {
    state.currentChallenge = null;
  }

  return { correct: false, feedback };
}

export function requestHint() {
  const challenge = state.currentChallenge;
  if (!challenge || state.phase !== 'playing') {
    return { available: false, message: 'Bizu indisponivel agora.' };
  }

  const hint = challenge.hint || challenge.explanation || '';
  if (!hint) {
    return { available: false, message: 'Este desafio nao possui bizu cadastrado.' };
  }

  if (state.hintUsedForQuestion) {
    return {
      available: true,
      penaltyApplied: false,
      hint,
      penalty: { scorePenalty: 0, monsterHeal: 0 },
    };
  }

  const penalty = applyHintPenaltyState(state, challenge);
  dispatchFeedback('wrong');

  if (state.phase === 'game_over') {
    state.currentChallenge = null;
  }

  return {
    available: true,
    penaltyApplied: true,
    hint,
    penalty,
  };
}

export function setError(message) {
  state.phase = 'error';
  state.errorMessage = message;
}

export function resetToMenu() {
  Object.assign(state, createInitialGameState());
}
