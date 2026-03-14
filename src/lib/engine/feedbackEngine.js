/**
 * Feedback Engine — Efeitos visuais e sonoros.
 *
 * Usa CSS Animations (compositor thread) e Web Audio API (buffers pré-carregados).
 */

// ── CSS Feedback ──────────────────────────────────────

/**
 * Aplica uma classe CSS temporária a um elemento.
 * @param {HTMLElement} el
 * @param {string} className
 * @param {number} durationMs
 */
export function flashClass(el, className, durationMs = 500) {
  if (!el) return;
  el.classList.add(className);
  setTimeout(() => el.classList.remove(className), durationMs);
}

/**
 * Screen shake no container do jogo.
 */
export function screenShake() {
  const el = document.getElementById('game-container');
  flashClass(el, 'screen-shake', 400);
}

/**
 * Glow de acerto.
 * @param {HTMLElement} el
 */
export function glowCorrect(el) {
  flashClass(el, 'feedback-correct', 600);
}

/**
 * Glow de erro.
 * @param {HTMLElement} el
 */
export function glowWrong(el) {
  flashClass(el, 'feedback-wrong', 600);
}

// ── Web Audio Engine ──────────────────────────────────

let audioCtx = null;
const buffers = {};
let defaultSoundsRequested = false;

const DEFAULT_SOUNDS = {
  correct: '/sounds/correct.ogg',
  wrong: '/sounds/wrong.ogg',
  victory: '/sounds/victory.ogg',
  gameover: '/sounds/gameover.ogg',
};

/**
 * Inicializa o AudioContext. Chamar no primeiro clique do usuário.
 */
export function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  preloadDefaultSounds();
}

/**
 * Pré-carrega um som a partir de URL.
 * @param {string} name - identificador (ex: 'correct', 'wrong', 'victory')
 * @param {string} url - caminho do arquivo .ogg
 */
export async function loadSound(name, url) {
  if (!audioCtx) initAudio();
  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    buffers[name] = await audioCtx.decodeAudioData(arrayBuffer);
  } catch (e) {
    console.warn(`Não foi possível carregar som "${name}":`, e.message);
  }
}

function preloadDefaultSounds() {
  if (defaultSoundsRequested) return;
  defaultSoundsRequested = true;

  for (const [name, url] of Object.entries(DEFAULT_SOUNDS)) {
    void loadSound(name, url);
  }
}

/**
 * Toca um som pré-carregado. Não cria new Audio() — reutiliza buffers.
 * @param {string} name - identificador do som
 * @param {number} [volume=0.5] - volume (0 a 1)
 */
export function playSound(name, volume = 0.5) {
  if (!audioCtx || !buffers[name]) return;

  // Resume context se estiver suspended (autoplay policy)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  const source = audioCtx.createBufferSource();
  const gainNode = audioCtx.createGain();

  source.buffer = buffers[name];
  gainNode.gain.value = volume;

  source.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  source.start(0);
}

/**
 * Dispara feedback completo (visual + sonoro).
 * @param {'correct' | 'wrong'} type
 * @param {HTMLElement} [targetEl] - elemento para glow
 */
export function dispatchFeedback(type, targetEl) {
  if (type === 'correct') {
    if (targetEl) glowCorrect(targetEl);
    playSound('correct', 0.6);
  } else {
    screenShake();
    if (targetEl) glowWrong(targetEl);
    playSound('wrong', 0.4);
  }
}
