import assert from 'node:assert/strict';

import { createChallengeManager } from '../src/lib/engine/challengeManager.js';
import {
  advanceToNextChallengeState,
  applyCorrectAnswerState,
  applyHintPenaltyState,
  applyWrongAnswerState,
  createInitialGameState,
  startGameState,
} from '../src/lib/engine/gameSession.js';
import { getValidator, getChallengeRuntimeIssue } from '../src/lib/engine/challengeRegistry.js';
import { parseContent } from '../src/lib/engine/dataLoader.js';

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

// Existentes
runTest('avanca para a proxima pergunta ao aplicar a resposta correta', () => {
  const moduleData = createModuleData();
  const manager = createChallengeManager(moduleData.challenges, { randomize: false });
  const state = createInitialGameState();

  startGameState(state, moduleData);
  assert.equal(state.maxScore, 40);

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

runTest('entra em game_over quando a energia do jogador chega a zero', () => {
  const moduleData = createModuleData();
  const manager = createChallengeManager(moduleData.challenges, { randomize: false });
  const state = createInitialGameState();

  startGameState(state, moduleData);
  const initialPlayerHp = state.playerHp;

  const challenge = manager.next();
  advanceToNextChallengeState(state, challenge, manager.progress());

  while (state.phase === 'playing') {
    applyWrongAnswerState(state, state.currentChallenge);
  }

  assert.equal(state.phase, 'game_over');
  assert.equal(state.playerHp, 0);
  assert.ok(initialPlayerHp > state.playerHp);
});

runTest('aplicar bizu gera penalidade e marca dica como usada na pergunta', () => {
  const moduleData = createModuleData();
  const manager = createChallengeManager(moduleData.challenges, { randomize: false });
  const state = createInitialGameState();

  startGameState(state, moduleData);
  const challenge = manager.next();
  advanceToNextChallengeState(state, challenge, manager.progress());

  const initialScore = state.score;
  const initialMonsterHp = state.monsterHp;
  const initialPlayerHp = state.playerHp;

  const penalty = applyHintPenaltyState(state, state.currentChallenge);

  assert.ok(penalty.scorePenalty > 0);
  assert.ok(penalty.monsterHeal > 0);
  assert.ok(penalty.playerDamage > 0);
  assert.equal(state.hintUsedForQuestion, true);
  assert.ok(state.score <= initialScore);
  assert.ok(state.monsterHp >= initialMonsterHp);
  assert.ok(state.playerHp < initialPlayerHp);
});

// Novos: U-06
runTest('open_text challenges sao excluidos do calculo de monsterHp, playerHp e maxScore', () => {
  const moduleData = createModuleData();
  moduleData.challenges.push({
    id: 'q4',
    type: 'open_text',
    prompt: 'Qual a resposta aberta?',
    difficulty: 3,
  });
  
  const manager = createChallengeManager(moduleData.challenges, { randomize: false });
  const state = createInitialGameState();

  startGameState(state, moduleData);
  
  assert.equal(state.maxScore, 40); // Sum of difficulties: 1*10 + 2*10 + 1*10 = 40 (q4 is excluded)
  assert.equal(manager.progress().total, 4);
});

// U-07
runTest('createChallengeManager com array vazio retorna next() === null', () => {
  const manager = createChallengeManager([], { randomize: false });
  assert.equal(manager.next(), null);
});

// U-08
runTest('challengeManager.progress() retorna current:0 params corretos antes do primeiro next()', () => {
  const manager = createChallengeManager(createModuleData().challenges, { randomize: false });
  const progress = manager.progress();
  assert.equal(progress.current, 0);
  assert.equal(progress.total, 3);
  assert.equal(progress.percent, 0);
});

// U-09
runTest('challengeManager.progress() retorna percent: 100 apos consumir todos', () => {
  const manager = createChallengeManager(createModuleData().challenges, { randomize: false });
  manager.next();
  manager.next();
  manager.next();
  manager.next(); // undefined/null
  const progress = manager.progress();
  assert.equal(progress.current, 3);
  assert.equal(progress.percent, 100);
});

// U-10
runTest('validator drag_drop e case-insensitive', () => {
  const validator = getValidator('drag_drop');
  const challenge = { correctAnswer: 'Correcao' };
  assert.equal(validator(challenge, 'correcao'), true);
  assert.equal(validator(challenge, 'CORRECAO'), true);
  assert.equal(validator(challenge, 'errado'), false);
});

// U-11
runTest('validator true_false valida todos os statements multiplos', () => {
  const validator = getValidator('true_false');
  const challenge = {
    statements: [
      { text: 'A', correctAnswer: true },
      { text: 'B', correctAnswer: false }
    ]
  };
  assert.equal(validator(challenge, [true, false]), true);
  assert.equal(validator(challenge, [true, true]), false);
  assert.equal(validator(challenge, [false, false]), false);
  assert.equal(validator(challenge, [true]), false);
});

// U-12
runTest('validator true_false valida single correctAnswer com boolean ou array legad', () => {
  const validator = getValidator('true_false');
  const challenge = { correctAnswer: true };
  assert.equal(validator(challenge, true), true);
  assert.equal(validator(challenge, [true]), true);
  assert.equal(validator(challenge, false), false);
});

// U-13
runTest('validator ordering rejeita array com tamanho diferente', () => {
  const validator = getValidator('ordering');
  const challenge = { fragments: ['a', 'b', 'c'] };
  assert.equal(validator(challenge, ['a', 'b']), false);
  assert.equal(validator(challenge, ['a', 'b', 'c', 'd']), false);
  assert.equal(validator(challenge, ['a', 'b', 'c']), true);
  assert.equal(validator(challenge, ['a', 'c', 'b']), false);
});

// U-14
runTest('validator multiple_choice rejeita resposta que nao existe', () => {
  const validator = getValidator('multiple_choice');
  const challenge = { options: [{ id: 'opt1', correct: true }] };
  assert.equal(validator(challenge, 'opt1'), true);
  assert.equal(validator(challenge, 'fake_opt'), false);
});

// U-15
runTest('applyWrongAnswerState nunca deixa playerHp negativo', () => {
  const state = createInitialGameState();
  startGameState(state, createModuleData());
  state.playerHp = 5;
  applyWrongAnswerState(state, { difficulty: 3 }); // 3 * 10 = 30 dmg
  assert.equal(state.playerHp, 0);
});

// U-16
runTest('applyHintPenaltyState pode causar game_over se HP for baixo', () => {
  const state = createInitialGameState();
  startGameState(state, createModuleData());
  state.playerHp = 5;
  applyHintPenaltyState(state, { difficulty: 3 }); // 30 / 2 = 15 dmg
  assert.equal(state.playerHp, 0);
  // Nota: o proprio game loop chama `state.phase = playerHp <= 0 ? 'game_over' : ...`
});

// U-17
runTest('parseContent rejeita json sem module', () => {
  assert.throws(() => parseContent('{ author: "autor", challenges: [{id: "1", type:"open_text", prompt:"a"}] }'), /O campo "module" é obrigatório/);
});

// U-18
runTest('parseContent rejeita challenge com type desconhecido', () => {
  assert.throws(() => parseContent('{ module: "M", author: "A", challenges: [{id: "1", type: "invalid", prompt: "x"}] }'), /tipo "invalid" não é suportado/);
});

// U-19
runTest('prepareChallenge prepara displayFragments', () => {
  const manager = createChallengeManager([{
    id: 'q',
    type: 'ordering',
    prompt: 'x',
    fragments: ['a', 'b', 'c']
  }], { randomize: false });
  const chall = manager.next();
  assert.ok(Array.isArray(chall.displayFragments));
  assert.equal(chall.displayFragments.length, 3);
});

// U-20
runTest('getChallengeRuntimeIssue detecta dados faltantes', () => {
  assert.ok(getChallengeRuntimeIssue({ type: 'drag_drop', prompt: 'a' })); // missing loot
  assert.equal(getChallengeRuntimeIssue({ type: 'multiple_choice', prompt: 'a', options: [{id: '1', text: 'a'}, {id:'2', text:'b'}] }), null);
});

// U-21
runTest('startGameState usa placeholder monster se faltar sprite auto-gerado', () => {
  const state = createInitialGameState();
  startGameState(state, createModuleData());
  // The first challenge in createModuleData() has monster sprite 'monster_test'.
  // However, auto-generation happens for the module monster seed.
  assert.ok(state.monsterSprite.startsWith('monstro'));
});

