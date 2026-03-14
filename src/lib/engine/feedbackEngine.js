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
export function playSound(name, volume = 0.5, options = {}) {
  if (!audioCtx || !buffers[name]) return;

  // Resume context se estiver suspended (autoplay policy)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  const source = audioCtx.createBufferSource();
  const gainNode = audioCtx.createGain();
  const attack = options.attack ?? 0.01;
  const release = options.release ?? 0.08;
  const playbackRate = options.playbackRate ?? 1;
  const duration = options.duration ?? null;
  const lowpassHz = options.lowpassHz ?? null;
  const lowpassQ = options.lowpassQ ?? 0.8;
  const now = audioCtx.currentTime;

  source.buffer = buffers[name];
  source.playbackRate.value = playbackRate;

  // Envelope curto para deixar o feedback mais "snappy" e menos estridente.
  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.linearRampToValueAtTime(volume, now + attack);

  if (lowpassHz) {
    const lowpassNode = audioCtx.createBiquadFilter();
    lowpassNode.type = 'lowpass';
    lowpassNode.frequency.setValueAtTime(lowpassHz, now);
    lowpassNode.Q.value = lowpassQ;
    source.connect(lowpassNode);
    lowpassNode.connect(gainNode);
  } else {
    source.connect(gainNode);
  }
  gainNode.connect(audioCtx.destination);
  source.start(now);

  if (duration) {
    const endAt = now + duration;
    gainNode.gain.setValueAtTime(volume, endAt);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, endAt + release);
    source.stop(endAt + release + 0.01);
  }
}

function playSyntheticNote(frequency, duration, volume = 0.18, type = 'triangle') {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, now);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

function playCorrectJingle() {
  // Duas notas subindo: sensação positiva imediata.
  playSound('correct', 0.24, {
    playbackRate: 1.18,
    duration: 0.13,
    attack: 0.008,
    release: 0.06,
  });
  setTimeout(() => {
    playSound('correct', 0.22, {
      playbackRate: 1.42,
      duration: 0.12,
      attack: 0.008,
      release: 0.06,
    });
    playSyntheticNote(920, 0.12, 0.07, 'sine');
  }, 92);
}

function playWrongJingle() {
  // Erro mais "aveludado": grave, curto e sem timbre fino.
  playSound('wrong', 0.28, {
    playbackRate: 0.76,
    duration: 0.22,
    attack: 0.012,
    release: 0.14,
    lowpassHz: 1350,
    lowpassQ: 0.75,
  });
  setTimeout(() => {
    playSyntheticNote(240, 0.14, 0.05, 'triangle');
  }, 42);
  setTimeout(() => {
    playSyntheticNote(185, 0.16, 0.045, 'sine');
  }, 104);
}

/**
 * Dispara feedback completo (visual + sonoro).
 * @param {'correct' | 'wrong'} type
 * @param {HTMLElement} [targetEl] - elemento para glow
 */
export function dispatchFeedback(type, targetEl) {
  if (type === 'correct') {
    if (targetEl) glowCorrect(targetEl);
    playCorrectJingle();
  } else {
    screenShake();
    if (targetEl) glowWrong(targetEl);
    playWrongJingle();
  }
}
