<script>
  import { getState, startGame, submitAnswer, requestHint, resetToMenu } from '../../stores/gameStore.svelte.js';
  import { fetchModuleWithChallenges } from '../../supabase/modules.js';
  import { createChallengeManager } from '../../engine/challengeManager.js';
  import { initAudio } from '../../engine/feedbackEngine.js';
  import ChallengeHost from '../ChallengeHost.svelte';
  import HUD from '../shared/HUD.svelte';
  import MonsterSvg from './MonsterSvg.svelte';
  import { navigate } from '../../router.svelte.js';

  const LOAD_TIMEOUT_MS = 12000;
  let { moduleId } = $props();

  let game = getState();
  let manager = $state(null);
  let loading = $state(true);
  let loadError = $state('');
  let activeLoadToken = 0;
  let activeLoadController = null;

  let lastHp = $state(0);
  let isHit = $state(false);
  let lastPlayerHp = $state(0);
  let isPlayerHit = $state(false);

  $effect(() => {
    if (moduleId) {
      loadModule(moduleId);
    }

    return () => {
      activeLoadToken++;
      activeLoadController?.abort();
      activeLoadController = null;
    };
  });

  $effect(() => {
    if (!loading && !loadError && game.phase !== 'playing') return;
    if (lastHp === 0 && game.monsterHp > 0) {
      lastHp = game.monsterHp;
    }
    if (game.monsterHp < lastHp) {
      isHit = true;
      setTimeout(() => isHit = false, 300);
      lastHp = game.monsterHp;
    } else if (game.monsterHp > lastHp) {
      lastHp = game.monsterHp;
    }

    if (lastPlayerHp === 0 && game.playerHp > 0) {
      lastPlayerHp = game.playerHp;
    }
    if (game.playerHp < lastPlayerHp) {
      isPlayerHit = true;
      setTimeout(() => isPlayerHit = false, 460);
      lastPlayerHp = game.playerHp;
    } else if (game.playerHp > lastPlayerHp) {
      lastPlayerHp = game.playerHp;
    }
  });

  async function loadModule(id) {
    const token = ++activeLoadToken;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), LOAD_TIMEOUT_MS);

    console.debug('[GramQuest] loadModule:start', { token, moduleId: id });

    activeLoadController?.abort();
    activeLoadController = controller;
    loading = true;
    loadError = '';
    manager = null;

    try {
      const data = await fetchModuleWithChallenges(id, { signal: controller.signal });

      if (token !== activeLoadToken) return;

      console.debug('[GramQuest] loadModule:success', {
        token,
        moduleId: id,
        challenges: data.challenges.length,
      });

      initAudio();
      manager = createChallengeManager(data.challenges);
      startGame(data, manager);
      lastHp = game.monsterHp;
      lastPlayerHp = game.playerHp;
    } catch (e) {
      if (token !== activeLoadToken) return;
      console.debug('[GramQuest] loadModule:error', {
        token,
        moduleId: id,
        aborted: controller.signal.aborted,
        message: e.message,
      });
      loadError = controller.signal.aborted
        ? 'A conexao demorou demais para carregar este modulo. Tente novamente.'
        : e.message;
    } finally {
      clearTimeout(timeoutId);
      if (activeLoadController === controller) {
        activeLoadController = null;
      }
      if (token === activeLoadToken) {
        loading = false;
      }
    }
  }

  function handleAnswer(answer) {
    if (!manager) return { correct: false };
    return submitAnswer(answer, manager);
  }

  function handleHint() {
    return requestHint();
  }

  function handleRestart() {
    if (manager) manager.reset();
    resetToMenu();
    loadModule(moduleId);
  }

  function retryLoad() {
    loadModule(moduleId);
  }

  function goToMenu() {
    activeLoadToken++;
    activeLoadController?.abort();
    activeLoadController = null;
    if (manager) manager.reset();
    resetToMenu();
    navigate('/');
  }
</script>

<div id="game-container">
  {#if loading}
    <div class="loading-screen">
      <div class="spinner"></div>
      <p class="loading-text">Carregando desafios...</p>
    </div>

  {:else if loadError}
    <div class="error-screen">
      <div class="error-icon">!</div>
      <h2 class="error-title">Ops! Algo deu errado.</h2>
      <p class="error-message">{loadError}</p>
      <div class="error-actions">
        <button class="action-btn primary" onclick={retryLoad}>Tentar novamente</button>
        <button class="action-btn" onclick={goToMenu}>Voltar ao Menu</button>
      </div>
    </div>

  {:else if game.phase === 'playing'}
    <div class="top-bar">
      <button class="back-btn" onclick={goToMenu}>Voltar</button>
    </div>

    <HUD
      score={game.score}
      streak={game.streak}
      monsterHp={game.monsterHp}
      maxMonsterHp={game.maxMonsterHp}
      playerHp={game.playerHp}
      maxPlayerHp={game.maxPlayerHp}
      playerHit={isPlayerHit}
      progress={game.progress}
      moduleName={game.moduleName}
    />

    <div class="monster-area">
      <div
        class="monster-display"
        class:hurt={game.monsterHp > 0 && game.monsterHp < game.maxMonsterHp * 0.3}
        class:hit={isHit}
        class:dead={game.monsterHp <= 0}
      >
        <MonsterSvg seed={game.monsterSeed} class="battle-monster-svg" />
        <span class="monster-name">{game.monsterName}</span>
      </div>
    </div>

    {#key `${game.progress.current}-${game.currentChallenge?.id || 'no-id'}`}
    {#key game.questionSerial}
      <ChallengeHost
        challenge={game.currentChallenge}
        onAnswer={handleAnswer}
        onHint={handleHint}
      />
    {/key}
    {/key}

  {:else if game.phase === 'victory'}
    <div class="victory-screen">
      <div class="ending-illustration victory-illustration">
        <img
          src="/prof-win.png"
          alt="Professor comemorando a vitoria"
          class="ending-professor victory-professor"
        />
      </div>
      <h2 class="victory-title">Parabens!</h2>
      <p class="victory-subtitle">Voce derrotou todos os monstros!</p>

      <div class="victory-stats">
        <div class="stat-card">
          <span class="stat-card-value">{game.score}</span>
          <span class="stat-card-label">Pontos</span>
        </div>
        <div class="stat-card">
          <span class="stat-card-value">{game.progress.total}</span>
          <span class="stat-card-label">Desafios</span>
        </div>
      </div>

      <div class="victory-actions">
        <button class="action-btn primary" onclick={handleRestart}>
          Jogar Novamente
        </button>
        <button class="action-btn" onclick={goToMenu}>
          Escolher Outro Modulo
        </button>
      </div>
    </div>

  {:else if game.phase === 'game_over'}
    <div class="game-over-screen">
      <div class="ending-illustration lost-illustration">
        <img
          src="/prof-lost.png"
          alt="Professor orientando tentar novamente"
          class="ending-professor lost-professor"
        />
      </div>
      <h2 class="game-over-title">Quase la!</h2>
      <p class="game-over-subtitle">
        O monstro venceu esta rodada. Respira, revisa o bizu e tenta de novo.
      </p>

      <div class="victory-stats">
        <div class="stat-card">
          <span class="stat-card-value">{game.score}</span>
          <span class="stat-card-label">Pontos</span>
        </div>
        <div class="stat-card">
          <span class="stat-card-value">{game.progress.current}</span>
          <span class="stat-card-label">Respondidas</span>
        </div>
      </div>

      <div class="victory-actions">
        <button class="action-btn primary" onclick={handleRestart}>
          Tentar Novamente
        </button>
        <button class="action-btn" onclick={goToMenu}>
          Voltar ao Menu
        </button>
      </div>
    </div>

  {:else if game.phase === 'error'}
    <div class="error-screen">
      <div class="error-icon">!</div>
      <h2 class="error-title">Ops! Algo deu errado.</h2>
      <p class="error-message">{game.errorMessage}</p>
      <button class="action-btn" onclick={goToMenu}>Voltar ao Menu</button>
    </div>
  {/if}
</div>

<style>
  .loading-screen {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--color-border);
    border-top-color: var(--color-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .loading-text {
    color: var(--color-muted);
    font-size: 1rem;
  }

  .top-bar {
    display: flex;
    justify-content: flex-start;
  }

  .back-btn {
    padding: 0.4rem 0.8rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    color: var(--color-muted);
    font-size: 0.8rem;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .back-btn:hover {
    border-color: var(--color-primary);
    color: var(--color-text);
  }

  .monster-area {
    display: flex;
    justify-content: center;
    padding: 1rem 0;
  }

  .monster-display {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    animation: float 3s ease-in-out infinite;
    position: relative;
  }

  .monster-display.hurt {
    animation: float 3s ease-in-out infinite, shake 0.5s ease infinite;
  }

  .monster-display.hit :global(.battle-monster-svg) {
    animation: flash-damage 0.3s ease;
  }

  @keyframes flash-damage {
    0%, 100% { filter: drop-shadow(0 4px 12px var(--color-primary-glow)); }
    50% { filter: drop-shadow(0 4px 25px var(--color-wrong)) brightness(1.5) sepia(1) hue-rotate(-50deg); transform: scale(0.9); }
  }

  .monster-display.hit::after {
    content: '*';
    position: absolute;
    top: 20%;
    left: 45%;
    font-size: 2.5rem;
    pointer-events: none;
    animation: particle-burst 0.3s ease-out forwards;
  }

  @keyframes particle-burst {
    0% { transform: scale(0.5) translate(0, 0); opacity: 1; }
    100% { transform: scale(1.5) translate(20px, -30px); opacity: 0; }
  }

  .monster-display.dead :global(.battle-monster-svg) {
    animation: die 1s ease-out forwards;
  }

  @keyframes die {
    0% { transform: scale(1); opacity: 1; filter: grayscale(0); }
    30% { transform: scale(1.2); filter: grayscale(0.5) brightness(1.2); }
    100% { transform: scale(0) rotate(180deg) translateY(50px); opacity: 0; filter: grayscale(1); }
  }

  .monster-display.dead::before {
    content: '+';
    position: absolute;
    top: 50%;
    font-size: 3rem;
    pointer-events: none;
    animation: smoke-puff 0.8s ease-out forwards;
    animation-delay: 0.2s;
    opacity: 0;
  }

  @keyframes smoke-puff {
    0% { transform: scale(0) translateY(0); opacity: 1; filter: blur(0px); }
    100% { transform: scale(3) translateY(-40px); opacity: 0; filter: blur(4px); }
  }

  :global(.battle-monster-svg) {
    width: 100px;
    height: 100px;
    filter: drop-shadow(0 4px 12px var(--color-primary-glow));
    transition: all var(--transition-normal);
  }

  .monster-name {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--color-primary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .victory-screen,
  .game-over-screen,
  .error-screen {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    text-align: center;
    padding: 2rem;
  }

  .error-icon {
    font-size: 4rem;
  }

  .victory-title {
    font-size: 2.5rem;
    font-weight: 800;
    color: var(--color-correct);
  }

  .victory-subtitle {
    font-size: 1.1rem;
    color: var(--color-muted);
  }

  .game-over-title {
    font-size: 2.3rem;
    font-weight: 800;
    color: #fca5a5;
  }

  .game-over-subtitle {
    font-size: 1.05rem;
    color: var(--color-muted);
    max-width: 560px;
  }

  .ending-illustration {
    position: relative;
    border-radius: 24px;
    padding: 0.45rem;
    animation: ending-enter 0.75s ease both;
  }

  .ending-illustration::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 24px;
    border: 1px solid rgba(148, 163, 184, 0.28);
    pointer-events: none;
  }

  .victory-illustration {
    background:
      radial-gradient(circle at 15% 15%, rgba(74, 222, 128, 0.22), transparent 55%),
      radial-gradient(circle at 90% 85%, rgba(96, 165, 250, 0.2), transparent 50%),
      rgba(15, 23, 42, 0.34);
    box-shadow: 0 18px 36px rgba(15, 23, 42, 0.38);
  }

  .lost-illustration {
    background:
      radial-gradient(circle at 15% 15%, rgba(248, 113, 113, 0.16), transparent 58%),
      radial-gradient(circle at 85% 85%, rgba(244, 114, 182, 0.14), transparent 55%),
      rgba(15, 23, 42, 0.34);
    box-shadow: 0 16px 30px rgba(15, 23, 42, 0.34);
  }

  .ending-professor {
    display: block;
    width: min(370px, 82vw);
    max-height: min(58vh, 560px);
    height: auto;
    object-fit: cover;
    border-radius: 20px;
    box-shadow: 0 8px 22px rgba(15, 23, 42, 0.28);
  }

  .victory-professor {
    border: 1px solid rgba(74, 222, 128, 0.2);
  }

  .lost-professor {
    border: 1px solid rgba(248, 113, 113, 0.18);
    animation: subtle-pulse 2.4s ease-in-out infinite;
  }

  @keyframes ending-enter {
    0% { transform: translateY(18px) scale(0.96); opacity: 0; }
    100% { transform: translateY(0) scale(1); opacity: 1; }
  }

  @keyframes subtle-pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.02); }
  }

  @media (max-width: 640px) {
    .ending-illustration {
      padding: 0.35rem;
      border-radius: 20px;
    }

    .ending-illustration::after {
      border-radius: 20px;
    }

    .ending-professor {
      width: min(92vw, 360px);
      max-height: 52vh;
      border-radius: 16px;
    }
  }

  .victory-stats {
    display: flex;
    gap: 1.5rem;
  }

  .stat-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: 1.25rem 2rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }

  .stat-card-value {
    font-size: 2rem;
    font-weight: 800;
    color: var(--color-warning);
  }

  .stat-card-label {
    font-size: 0.8rem;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .victory-actions,
  .error-actions {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    align-items: center;
  }

  .action-btn {
    padding: 0.85rem 2rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
    color: var(--color-text);
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all var(--transition-normal);
  }

  .action-btn:hover {
    border-color: var(--color-primary);
    transform: translateY(-2px);
  }

  .action-btn.primary {
    background: linear-gradient(135deg, var(--color-primary), #6d28d9);
    border-color: transparent;
    color: white;
    box-shadow: 0 4px 20px var(--color-primary-glow);
  }

  .action-btn.primary:hover {
    box-shadow: 0 8px 30px var(--color-primary-glow);
  }

  .error-title {
    font-size: 1.5rem;
    color: var(--color-wrong);
  }

  .error-message {
    max-width: 500px;
    color: var(--color-muted);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 1rem;
    font-family: var(--font-mono);
    font-size: 0.85rem;
    line-height: 1.5;
    white-space: pre-wrap;
    text-align: left;
  }

</style>
