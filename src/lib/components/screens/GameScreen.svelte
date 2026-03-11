<script>
  import { getState, startGame, submitAnswer, loadNextChallenge, resetToMenu, setError } from '../../stores/gameStore.svelte.js';
  import { fetchModuleWithChallenges } from '../../supabase/modules.js';
  import { createChallengeManager } from '../../engine/challengeManager.js';
  import { initAudio } from '../../engine/feedbackEngine.js';
  import ChallengeHost from '../ChallengeHost.svelte';
  import HUD from '../shared/HUD.svelte';
  import { navigate } from '../../router.svelte.js';

  let { moduleId } = $props();

  let game = getState();
  let manager = $state(null);
  let loading = $state(true);
  let loadError = $state('');

  // Carrega módulo do Supabase
  $effect(() => {
    if (moduleId) {
      loadModule(moduleId);
    }
  });

  async function loadModule(id) {
    loading = true;
    loadError = '';
    try {
      const data = await fetchModuleWithChallenges(id);
      initAudio();
      manager = createChallengeManager(data.challenges);
      startGame(data, manager);
      loading = false;
    } catch (e) {
      loadError = e.message;
      loading = false;
    }
  }

  function handleAnswer(answer) {
    if (!manager) return { correct: false };
    return submitAnswer(answer, manager);
  }

  function handleRestart() {
    if (manager) manager.reset();
    resetToMenu();
    // Recarrega o mesmo módulo
    loadModule(moduleId);
  }

  function goToMenu() {
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
      <div class="error-icon">⚠️</div>
      <h2 class="error-title">Ops! Algo deu errado.</h2>
      <p class="error-message">{loadError}</p>
      <button class="action-btn" onclick={goToMenu}>Voltar ao Menu</button>
    </div>

  {:else if game.phase === 'playing'}
    <!-- ═══ HUD ═══ -->
    <div class="top-bar">
      <button class="back-btn" onclick={goToMenu}>← Voltar</button>
    </div>

    <HUD
      score={game.score}
      streak={game.streak}
      monsterHp={game.monsterHp}
      maxMonsterHp={game.maxMonsterHp}
      progress={game.progress}
      moduleName={game.moduleName}
    />

    <!-- Monstro -->
    <div class="monster-area">
      <div class="monster-display" class:hurt={game.monsterHp < game.maxMonsterHp * 0.3}>
        <svg viewBox="0 0 120 120" class="battle-monster-svg" aria-label="Monstro">
          <circle cx="60" cy="65" r="40" fill="#8b5cf6" opacity="0.2" />
          <circle cx="60" cy="60" r="35" fill="#7c3aed" />
          <circle cx="48" cy="50" r="8" fill="white" />
          <circle cx="72" cy="50" r="8" fill="white" />
          <circle cx="50" cy="50" r="4" fill="#0f172a" />
          <circle cx="74" cy="50" r="4" fill="#0f172a" />
          <path d="M 45 72 Q 60 65 75 72" stroke="#f87171" stroke-width="3" fill="none" stroke-linecap="round" />
        </svg>
        {#if game.currentChallenge?.monster}
          <span class="monster-name">{game.currentChallenge.monster.name}</span>
        {/if}
      </div>
    </div>

    <!-- Desafio -->
    <ChallengeHost
      challenge={game.currentChallenge}
      onAnswer={handleAnswer}
    />

  {:else if game.phase === 'victory'}
    <!-- ═══ VITÓRIA ═══ -->
    <div class="victory-screen">
      <div class="victory-icon">🏆</div>
      <h2 class="victory-title">Parabéns!</h2>
      <p class="victory-subtitle">Você derrotou todos os monstros!</p>

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
          🔄 Jogar Novamente
        </button>
        <button class="action-btn" onclick={goToMenu}>
          📚 Escolher Outro Módulo
        </button>
      </div>
    </div>

  {:else if game.phase === 'error'}
    <div class="error-screen">
      <div class="error-icon">⚠️</div>
      <h2 class="error-title">Ops! Algo deu errado.</h2>
      <p class="error-message">{game.errorMessage}</p>
      <button class="action-btn" onclick={goToMenu}>Voltar ao Menu</button>
    </div>
  {/if}
</div>

<style>
  /* ── Loading ── */
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

  /* ── Top Bar ── */
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

  /* ── Monster Area ── */
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
  }

  .monster-display.hurt {
    animation: float 3s ease-in-out infinite, shake 0.2s ease infinite;
  }

  .battle-monster-svg {
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

  /* ── Vitória ── */
  .victory-screen {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1.5rem;
    text-align: center;
    animation: fadeIn 0.6s ease;
  }

  .victory-icon {
    font-size: 5rem;
    animation: pulse 1s ease-in-out infinite alternate;
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

  .victory-actions {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    align-items: center;
  }

  /* ── Action Buttons ── */
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

  /* ── Erro ── */
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
