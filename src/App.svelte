<script>
  import './app.css';
  import { getState, startGame, submitAnswer, loadNextChallenge, resetToMenu, setError } from './lib/stores/gameStore.svelte.js';
  import { parseContent } from './lib/engine/dataLoader.js';
  import { createChallengeManager } from './lib/engine/challengeManager.js';
  import { initAudio } from './lib/engine/feedbackEngine.js';
  import ChallengeHost from './lib/components/ChallengeHost.svelte';
  import HUD from './lib/components/shared/HUD.svelte';

  // Conteúdo de exemplo embutido (em produção, carregaria de arquivo via Tauri)
  import exampleContent from '../content/exemplo_modulo.jsonc?raw';

  let game = getState();
  let manager = $state(null);

  function handleStart() {
    initAudio(); // Resume AudioContext no primeiro clique
    try {
      const data = parseContent(exampleContent);
      manager = createChallengeManager(data.challenges);
      startGame(data, manager);
    } catch (e) {
      setError(e.message);
    }
  }

  function handleAnswer(answer) {
    if (!manager) return { correct: false };
    return submitAnswer(answer, manager);
  }

  function handleRestart() {
    if (manager) manager.reset();
    resetToMenu();
  }
</script>

<div id="game-container">
  {#if game.phase === 'menu'}
    <!-- ═══ MENU ═══ -->
    <div class="menu-screen">
      <div class="logo-section">
        <h1 class="game-title">
          <span class="title-gram">Gram</span><span class="title-quest">Quest</span>
        </h1>
        <p class="game-subtitle">Derrote os monstros da gramática!</p>
      </div>

      <div class="menu-monster">
        <svg viewBox="0 0 120 120" class="monster-svg" aria-hidden="true">
          <circle cx="60" cy="65" r="40" fill="#8b5cf6" opacity="0.3" />
          <circle cx="60" cy="60" r="35" fill="#7c3aed" />
          <circle cx="48" cy="50" r="8" fill="white" />
          <circle cx="72" cy="50" r="8" fill="white" />
          <circle cx="50" cy="50" r="4" fill="#0f172a" />
          <circle cx="74" cy="50" r="4" fill="#0f172a" />
          <path d="M 45 72 Q 60 82 75 72" stroke="white" stroke-width="3" fill="none" stroke-linecap="round" />
          <circle cx="30" cy="40" r="5" fill="#a78bfa" />
          <circle cx="90" cy="40" r="5" fill="#a78bfa" />
        </svg>
      </div>

      <button class="start-btn" onclick={handleStart}>
        ⚔️ Começar Aventura
      </button>

      <p class="credits">Projeto de Estágio — Licenciatura em Computação (UFRPE)</p>
    </div>

  {:else if game.phase === 'playing'}
    <!-- ═══ JOGANDO ═══ -->
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

      <button class="start-btn" onclick={handleRestart}>
        🔄 Jogar Novamente
      </button>
    </div>

  {:else if game.phase === 'error'}
    <!-- ═══ ERRO ═══ -->
    <div class="error-screen">
      <div class="error-icon">⚠️</div>
      <h2 class="error-title">Ops! Algo deu errado.</h2>
      <p class="error-message">{game.errorMessage}</p>
      <button class="start-btn" onclick={handleRestart}>
        Voltar ao Menu
      </button>
    </div>
  {/if}
</div>

<style>
  /* ── Menu ── */
  .menu-screen {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2rem;
    text-align: center;
    padding: 2rem;
    animation: fadeIn 0.6s ease;
  }

  .logo-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .game-title {
    font-size: 3.5rem;
    font-weight: 800;
    line-height: 1;
    letter-spacing: -0.02em;
  }

  .title-gram {
    color: var(--color-primary);
  }

  .title-quest {
    color: var(--color-correct);
  }

  .game-subtitle {
    font-size: 1.1rem;
    color: var(--color-muted);
  }

  .menu-monster {
    animation: float 3s ease-in-out infinite;
  }

  .monster-svg {
    width: 150px;
    height: 150px;
    filter: drop-shadow(0 8px 24px var(--color-primary-glow));
  }

  .start-btn {
    padding: 1rem 2.5rem;
    border: none;
    border-radius: var(--radius-lg);
    background: linear-gradient(135deg, var(--color-primary), #6d28d9);
    color: white;
    font-size: 1.25rem;
    font-weight: 700;
    cursor: pointer;
    transition: all var(--transition-normal);
    box-shadow: 0 4px 20px var(--color-primary-glow);
  }

  .start-btn:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 30px var(--color-primary-glow);
  }

  .start-btn:active {
    transform: translateY(-1px);
  }

  .credits {
    font-size: 0.75rem;
    color: var(--color-muted);
    opacity: 0.6;
    margin-top: 1rem;
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
