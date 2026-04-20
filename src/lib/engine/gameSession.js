export function createInitialGameState() {
  return {
    phase: 'menu',
    currentChallenge: null,
    playerAnswer: null,
    backpack: [],
    score: 0,
    maxScore: 0,
    streak: 0,
    monsterHp: 100,
    maxMonsterHp: 100,
    playerHp: 100,
    maxPlayerHp: 100,
    monsterSeed: 0,
    monsterName: 'Monstro',
    monsterSprite: '',
    questionSerial: 0,
    hintUsedForQuestion: false,
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
  state.maxScore = getModuleMaxScore(moduleData);
  state.streak = 0;
  state.phase = 'playing';
  state.errorMessage = '';
  state.monsterName = monster.name;
  state.monsterSprite = monster.sprite;
  state.monsterSeed = monster.seed;
  state.maxMonsterHp = maxMonsterHp;
  state.monsterHp = maxMonsterHp;
  state.maxPlayerHp = getModulePlayerHp(moduleData);
  state.playerHp = state.maxPlayerHp;
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
  state.hintUsedForQuestion = false;
  state.playerAnswer = null;
  state.progress = progress;

  if (nextChallenge.type === 'drag_drop' && nextChallenge.loot) {
    state.backpack = [...nextChallenge.loot];
  } else {
    state.backpack = [];
  }
}

export function applyCorrectAnswerState(state, challenge) {
  state.score += getChallengeScore(challenge);
  state.streak += 1;
  state.monsterHp = Math.max(0, state.monsterHp - getChallengeDamage(challenge));
  state.playerHp = Math.min(
    state.maxPlayerHp,
    state.playerHp + Math.max(5, Math.round(getPlayerDamage(challenge) * 0.28))
  );
}

export function applyWrongAnswerState(state, challenge) {
  state.streak = 0;
  state.monsterHp = Math.min(
    state.maxMonsterHp,
    state.monsterHp + Math.max(6, Math.round(getChallengeDamage(challenge) * 0.35))
  );
  state.playerHp = Math.max(0, state.playerHp - getPlayerDamage(challenge));

  if (state.playerHp <= 0) {
    state.phase = 'game_over';
  }
}

export function applyHintPenaltyState(state, challenge) {
  const scorePenalty = Math.max(2, Math.round(getChallengeScore(challenge) * 0.4));
  const monsterHeal = Math.max(4, Math.round(getChallengeDamage(challenge) * 0.16));
  const playerDamage = Math.max(3, Math.round(getPlayerDamage(challenge) * 0.32));

  state.score = Math.max(0, state.score - scorePenalty);
  state.monsterHp = Math.min(state.maxMonsterHp, state.monsterHp + monsterHeal);
  state.playerHp = Math.max(0, state.playerHp - playerDamage);
  state.hintUsedForQuestion = true;

  if (state.playerHp <= 0) {
    state.phase = 'game_over';
  }

  return { scorePenalty, monsterHeal, playerDamage };
}

export function getChallengeDamage(challenge) {
  const difficulty = challenge?.difficulty || 1;
  return 20 + difficulty * 15;
}

export function getChallengeScore(challenge) {
  const difficulty = challenge?.difficulty || 1;
  return 10 * difficulty;
}

export function getPlayerDamage(challenge) {
  const difficulty = challenge?.difficulty || 1;
  return 10 + difficulty * 6;
}

export function getModuleMonsterHp(moduleData) {
  const challenges = (moduleData?.challenges || []).filter((challenge) => challenge?.type !== 'open_text');
  if (challenges.length === 0) return 0;

  return challenges.reduce((total, challenge) => total + getChallengeDamage(challenge), 0);
}

export function getModulePlayerHp(moduleData) {
  const challenges = (moduleData?.challenges || []).filter((challenge) => challenge?.type !== 'open_text');
  if (challenges.length === 0) return 0;

  // Reserva de vida mais generosa para sustentar erros sem deixar a partida trivial.
  return challenges.reduce((total, challenge) => total + Math.max(10, Math.round(getPlayerDamage(challenge) * 0.8)), 0);
}

export function getModuleMaxScore(moduleData) {
  const challenges = (moduleData?.challenges || []).filter((challenge) => challenge?.type !== 'open_text');
  if (challenges.length === 0) return 0;

  return challenges.reduce((total, challenge) => total + getChallengeScore(challenge), 0);
}

export function getModuleMonster(moduleData) {
  const firstMonster = moduleData?.challenges?.find((challenge) => challenge?.monster)?.monster;
  const baseName = firstMonster?.name || 'Monstro';
  const rawSprite = String(firstMonster?.sprite || '').trim();
  const moduleSeedSource = String(moduleData?.id || `${moduleData?.module || ''}:${moduleData?.author || ''}` || baseName);

  // Se o sprite vier vazio ou com placeholder legado, escolhemos automaticamente.
  const sprite = shouldUseAutoMonster(rawSprite)
    ? pickAutoMonsterSprite(moduleSeedSource)
    : rawSprite;
  const spriteSeedSource = `${moduleSeedSource}:${sprite}`;

  return {
    name: baseName,
    sprite,
    seed: hashString(spriteSeedSource),
  };
}

function shouldUseAutoMonster(sprite) {
  if (!sprite) return true;
  return /^(monster|monstro)([_-]?0*1)?$/i.test(sprite) || /monster_test/i.test(sprite);
}

function pickAutoMonsterSprite(seedSource) {
  const poolSize = 5;
  const index = (hashString(seedSource) % poolSize) + 1;
  return `monstro${index}`;
}

function hashString(value) {
  const text = String(value || 'monster');
  let hash = 0;

  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) % 2147483647;
  }

  return Math.abs(hash);
}
