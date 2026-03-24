/**
 * Challenge Manager — Gerencia a fila de desafios.
 *
 * Responsável por: embaralhar, servir o próximo, e rastrear progresso.
 */

/**
 * Embaralha array in-place (Fisher-Yates).
 * @param {any[]} arr
 * @returns {any[]}
 */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Cria um gerenciador de desafios.
 * @param {Array} challenges - array de desafios do conteúdo
 * @param {object} options
 * @param {boolean} [options.randomize=true] - embaralhar a ordem
 * @returns {object} manager com métodos next(), peek(), progress(), reset()
 */
export function createChallengeManager(challenges, options = {}) {
  const { randomize = true } = options;

  let queue = randomize ? shuffle(challenges) : [...challenges];
  let currentIndex = 0;
  const total = challenges.length;

  return {
    /**
     * Retorna o desafio atual e avança o índice.
     * @returns {object|null} próximo desafio ou null se acabou
     */
    next() {
      if (currentIndex >= queue.length) return null;
      const challenge = queue[currentIndex];
      currentIndex++;
      return prepareChallenge(challenge);
    },

    /**
     * Retorna o desafio atual SEM avançar.
     * @returns {object|null}
     */
    peek() {
      if (currentIndex >= queue.length) return null;
      return prepareChallenge(queue[currentIndex]);
    },

    /**
     * Retorna progresso { current, total, percent }.
     */
    progress() {
      return {
        current: Math.min(currentIndex, total),
        total,
        percent: Math.round((Math.min(currentIndex, total) / total) * 100),
      };
    },

    /**
     * Verifica se ainda tem desafios.
     * @returns {boolean}
     */
    hasNext() {
      return currentIndex < queue.length;
    },

    /**
     * Reseta e re-embaralha.
     */
    reset() {
      queue = randomize ? shuffle(challenges) : [...challenges];
      currentIndex = 0;
    },
  };
}

/**
 * Prepara um desafio para exibição.
 * Ex: embaralha loot do drag_drop, fragments do ordering.
 * @param {object} challenge
 * @returns {object} challenge preparado (clonado)
 */
function prepareChallenge(challenge) {
  const prepared = structuredClone(challenge);

  switch (prepared.type) {
    case 'drag_drop':
      // Embaralha a ordem do loot
      prepared.loot = Array.isArray(prepared.loot) ? shuffle(prepared.loot) : [];
      break;

    case 'ordering':
      // Embaralha fragments se shuffled = true
      if (!Array.isArray(prepared.fragments)) {
        prepared.fragments = [];
      }
      if (prepared.shuffled !== false) {
        prepared.displayFragments = shuffle(prepared.fragments);
      } else {
        prepared.displayFragments = [...prepared.fragments];
      }
      break;

    case 'multiple_choice':
      // Preserva a ordem salva pelo professor
      prepared.options = Array.isArray(prepared.options) ? [...prepared.options] : [];
      break;
  }

  return prepared;
}
