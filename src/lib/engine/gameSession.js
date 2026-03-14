export function createInitialGameState() {
  return {
    phase: 'menu',
    currentChallenge: null,
    playerAnswer: null,
    backpack: [],
    score: 0,
    streak: 0,
    monsterHp: 100,
    maxMonsterHp: 100,
    monsterSeed: 0,
    monsterName: 'Monstro',
    questionSerial: 0,
    progress: { current: 0, total: 0, percent: 0 },
    moduleName: '',
    errorMessage: '',
  };
}

export function startGameState(state, moduleData) {
  const monster = getModuleMonster(moduleData);
  const maxMonsterHp = getModuleMonsterHp(moduleData);

  state.moduleName = moduleData.module;
  state.score = 0;
  state.streak = 0;
  state.phase = 'playing';
  state.errorMessage = '';
  state.monsterName = monster.name;
  state.monsterSeed = monster.seed;
  state.maxMonsterHp = maxMonsterHp;
  state.monsterHp = maxMonsterHp;
}

export function advanceToNextChallengeState(state, nextChallenge, progress) {
  if (!nextChallenge) {
    state.monsterHp = 0;
    state.phase = 'victory';
    state.currentChallenge = null;
    return;
  }

  state.currentChallenge = nextChallenge;
  state.questionSerial += 1;
  state.playerAnswer = null;
  state.progress = progress;

  if (nextChallenge.type === 'drag_drop' && nextChallenge.loot) {
    state.backpack = [...nextChallenge.loot];
  } else {
    state.backpack = [];
  }
}

export function applyCorrectAnswerState(state, challenge) {
  const difficulty = challenge?.difficulty || 1;

  state.score += 10 * difficulty * (1 + state.streak);
  state.streak += 1;
  state.monsterHp = Math.max(0, state.monsterHp - getChallengeDamage(challenge));
}

export function applyWrongAnswerState(state, challenge) {
  state.streak = 0;
  state.monsterHp = Math.min(
    state.maxMonsterHp,
    state.monsterHp + Math.max(6, Math.round(getChallengeDamage(challenge) * 0.35))
  );
}

export function getChallengeDamage(challenge) {
  const difficulty = challenge?.difficulty || 1;
  return 20 + difficulty * 15;
}

export function getModuleMonsterHp(moduleData) {
  const challenges = moduleData?.challenges || [];
  if (challenges.length === 0) return 100;

  return challenges.reduce((total, challenge) => total + getChallengeDamage(challenge), 0);
}

export function getModuleMonster(moduleData) {
  const firstMonster = moduleData?.challenges?.find((challenge) => challenge?.monster)?.monster;
  const baseName = firstMonster?.name || 'Monstro';
  const sprite = firstMonster?.sprite || moduleData?.module || baseName;

  return {
    name: baseName,
    seed: hashString(sprite),
  };
}

function hashString(value) {
  const text = String(value || 'monster');
  let hash = 0;

  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) % 2147483647;
  }

  return Math.abs(hash);
}
