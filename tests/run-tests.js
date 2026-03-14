import assert from 'node:assert/strict';

import { createChallengeManager } from '../src/lib/engine/challengeManager.js';
import {
  advanceToNextChallengeState,
  applyCorrectAnswerState,
  createInitialGameState,
  startGameState,
} from '../src/lib/engine/gameSession.js';

function createModuleData() {
  return {
    module: 'Modulo de Teste',
    author: 'Teste',
    challenges: [
      {
        id: 'q1',
        type: 'true_false',
        prompt: 'A palavra "casa" esta correta.',
        correctAnswer: true,
        difficulty: 1,
        monster: { name: 'Teste Monstro', sprite: 'monster_test' },
      },
      {
        id: 'q2',
        type: 'multiple_choice',
        prompt: 'Escolha a alternativa correta.',
        difficulty: 2,
        options: [
          { id: 'a', text: 'Errada', correct: false, feedback: '' },
          { id: 'b', text: 'Certa', correct: true, feedback: '' },
        ],
      },
      {
        id: 'q3',
        type: 'ordering',
        prompt: 'Ordene os fragmentos.',
        difficulty: 1,
        fragments: ['eu', 'gosto', 'de estudar'],
        shuffled: false,
      },
    ],
  };
}

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error.stack);
    process.exitCode = 1;
  }
}

runTest('avanca para a proxima pergunta ao aplicar a resposta correta', () => {
  const moduleData = createModuleData();
  const manager = createChallengeManager(moduleData.challenges, { randomize: false });
  const state = createInitialGameState();

  startGameState(state, moduleData);

  let next = manager.next();
  advanceToNextChallengeState(state, next, manager.progress());

  assert.equal(state.currentChallenge.id, 'q1');
  assert.equal(state.progress.current, 1);
  assert.equal(state.questionSerial, 1);

  applyCorrectAnswerState(state, state.currentChallenge);

  next = manager.next();
  advanceToNextChallengeState(state, next, manager.progress());

  assert.equal(state.currentChallenge.id, 'q2');
  assert.equal(state.progress.current, 2);
  assert.equal(state.questionSerial, 2);
});

runTest('mantem o mesmo monstro e o hp acumulado durante o modulo', () => {
  const moduleData = createModuleData();
  const manager = createChallengeManager(moduleData.challenges, { randomize: false });
  const state = createInitialGameState();

  startGameState(state, moduleData);

  const initialMonsterSeed = state.monsterSeed;
  const initialMonsterName = state.monsterName;
  const initialMaxHp = state.maxMonsterHp;

  let next = manager.next();
  advanceToNextChallengeState(state, next, manager.progress());
  applyCorrectAnswerState(state, state.currentChallenge);

  assert.equal(state.monsterSeed, initialMonsterSeed);
  assert.equal(state.monsterName, initialMonsterName);
  assert.equal(state.maxMonsterHp, initialMaxHp);
  assert.ok(state.monsterHp < initialMaxHp);

  const hpAfterFirstHit = state.monsterHp;

  next = manager.next();
  advanceToNextChallengeState(state, next, manager.progress());
  applyCorrectAnswerState(state, state.currentChallenge);

  assert.equal(state.monsterSeed, initialMonsterSeed);
  assert.equal(state.monsterName, initialMonsterName);
  assert.ok(state.monsterHp < hpAfterFirstHit);
});

runTest('entra em vitoria ao concluir a ultima pergunta', () => {
  const moduleData = createModuleData();
  const manager = createChallengeManager(moduleData.challenges, { randomize: false });
  const state = createInitialGameState();

  startGameState(state, moduleData);

  let next = manager.next();
  advanceToNextChallengeState(state, next, manager.progress());
  applyCorrectAnswerState(state, state.currentChallenge);

  next = manager.next();
  advanceToNextChallengeState(state, next, manager.progress());
  applyCorrectAnswerState(state, state.currentChallenge);

  next = manager.next();
  advanceToNextChallengeState(state, next, manager.progress());
  applyCorrectAnswerState(state, state.currentChallenge);

  next = manager.next();
  advanceToNextChallengeState(state, next, state.progress);

  assert.equal(state.phase, 'victory');
  assert.equal(state.currentChallenge, null);
  assert.equal(state.monsterHp, 0);
});
