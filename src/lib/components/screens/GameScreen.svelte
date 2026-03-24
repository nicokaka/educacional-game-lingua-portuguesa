<script>
  import { getState, startGame, submitAnswer, requestHint, resetToMenu, loadNextChallenge } from '../../stores/gameStore.svelte.js';
  import { fetchModuleWithChallenges } from '../../supabase/modules.js';
  import { createChallengeManager } from '../../engine/challengeManager.js';
  import { getChallengeRuntimeIssue } from '../../engine/challengeRegistry.js';
  import { initAudio, playSound } from '../../engine/feedbackEngine.js';
  import { createModuleAttempt } from '../../supabase/attempts.js';
  import { createOpenTextResponse } from '../../supabase/writtenResponses.js';
  import ChallengeHost from '../ChallengeHost.svelte';
  import HUD from '../shared/HUD.svelte';
  import MonsterSvg from './MonsterSvg.svelte';
  import { navigate } from '../../router.svelte.js';

  const LOAD_TIMEOUT_MS = 12000;
  const STUDENT_NAME_KEY = 'alquimia-verbal:student-name';
  const CLASSROOM_ID_KEY = 'alquimia-verbal:classroom-id';
  const CLASSROOM_NAME_KEY = 'alquimia-verbal:classroom-name';
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
  let finalMaxScore = $derived(game.maxScore > 0 ? game.maxScore : game.score);
  let previousPhase = $state('menu');
  let attemptSaved = $state(false);
  let attemptSaving = $state(false);
  let attemptSaveError = $state('');
  let attemptSavePromise = null;
  let attemptSaveErrorTimer = null;
  let runtimeNotice = $state('');
  let runtimeNoticeTimer = null;

  $effect(() => {
    if (moduleId) {
      if (typeof window !== 'undefined') {
        const studentName = window.sessionStorage.getItem(STUDENT_NAME_KEY)?.trim();
        const classroomId = window.sessionStorage.getItem(CLASSROOM_ID_KEY)?.trim();
        if (!studentName || !classroomId) {
          navigate('/');
          return;
        }
      }

      loadModule(moduleId);
    }

    return () => {
      activeLoadToken++;
      activeLoadController?.abort();
      activeLoadController = null;
      if (attemptSaveErrorTimer) {
        clearTimeout(attemptSaveErrorTimer);
        attemptSaveErrorTimer = null;
      }
      if (runtimeNoticeTimer) {
        clearTimeout(runtimeNoticeTimer);
        runtimeNoticeTimer = null;
      }
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

  $effect(() => {
    const phase = game.phase;
    if (phase === previousPhase) return;

    if (phase === 'victory') {
      playSound('victory', 0.68);
    } else if (phase === 'game_over') {
      playSound('gameover', 0.46, {
        playbackRate: 0.88,
        duration: 0.56,
        attack: 0.02,
        release: 0.22,
        lowpassHz: 1500,
        lowpassQ: 0.75,
      });
    }

    if (phase === 'victory' || phase === 'game_over') {
      void saveAttemptIfNeeded(phase);
    }

    previousPhase = phase;
  });

  $effect(() => {
    if (loading || loadError || game.phase !== 'playing' || !manager || !game.currentChallenge) return;

    const issue = getChallengeRuntimeIssue(game.currentChallenge);
    if (!issue) return;

    console.error('[Alquimia Verbal] Desafio invalido no runtime; pulando questao', {
      moduleId,
      challengeId: game.currentChallenge?.id || '',
      challengeType: game.currentChallenge?.type || '',
      prompt: game.currentChallenge?.prompt || '',
      issue,
    });

    runtimeNotice = 'Uma atividade foi pulada porque estava sendo atualizada.';
    if (runtimeNoticeTimer) {
      clearTimeout(runtimeNoticeTimer);
    }
    runtimeNoticeTimer = setTimeout(() => {
      runtimeNotice = '';
      runtimeNoticeTimer = null;
    }, 4000);

    queueMicrotask(() => {
      try {
        loadNextChallenge(manager);
      } catch (error) {
        loadError = `Erro ao preparar a proxima pergunta: ${error.message}`;
      }
    });
  });

  function clearAttemptSaveErrorSoon() {
    if (attemptSaveErrorTimer) {
      clearTimeout(attemptSaveErrorTimer);
    }

    attemptSaveErrorTimer = setTimeout(() => {
      attemptSaveError = '';
      attemptSaveErrorTimer = null;
    }, 8000);
  }

  function getAttemptContext(phase = game.phase) {
    const studentName = typeof window !== 'undefined'
      ? window.sessionStorage.getItem(STUDENT_NAME_KEY)?.trim()
      : '';
    const classroomId = typeof window !== 'undefined'
      ? window.sessionStorage.getItem(CLASSROOM_ID_KEY)?.trim()
      : '';
    const classroomName = typeof window !== 'undefined'
      ? window.sessionStorage.getItem(CLASSROOM_NAME_KEY)?.trim()
      : '';

    return {
      moduleId,
      classroomId,
      classroomName: classroomName || '',
      studentName,
      phase,
    };
  }

  async function saveAttemptIfNeeded(phase = game.phase) {
    if (attemptSaved) return true;
    if (phase !== 'victory' && phase !== 'game_over') return false;
    if (attemptSavePromise) return attemptSavePromise;

    const context = getAttemptContext(phase);

    if (!context.moduleId || !context.classroomId || !context.studentName) {
      attemptSaveError = 'Nao foi possivel registrar seu resultado. Volte ao menu e tente novamente.';
      clearAttemptSaveErrorSoon();
      console.error('[Alquimia Verbal] Tentativa sem dados obrigatorios para salvar', context);
      return false;
    }

    attemptSaving = true;
    attemptSaveError = '';

    attemptSavePromise = (async () => {
      try {
        await createModuleAttempt({
          module_id: context.moduleId,
          classroom_id: context.classroomId,
          classroom_name: context.classroomName,
          student_name: context.studentName,
          score: game.score,
          max_score: finalMaxScore,
          completed: phase === 'victory',
        });

        attemptSaved = true;
        console.info('[Alquimia Verbal] Tentativa salva com sucesso', {
          moduleId: context.moduleId,
          classroomId: context.classroomId,
          studentName: context.studentName,
          phase,
        });
        return true;
      } catch (error) {
        attemptSaveError = 'Nao foi possivel salvar seu resultado agora. Vamos tentar novamente quando voce sair desta tela.';
        clearAttemptSaveErrorSoon();
        console.error('[Alquimia Verbal] Falha ao salvar tentativa', {
          moduleId: context.moduleId,
          classroomId: context.classroomId,
          studentName: context.studentName,
          phase,
          message: error?.message || 'Erro desconhecido',
        });
        return false;
      } finally {
        attemptSaving = false;
        attemptSavePromise = null;
      }
    })();

    return attemptSavePromise;
  }

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
    attemptSaved = false;
    attemptSaving = false;
    attemptSaveError = '';
    attemptSavePromise = null;
    if (attemptSaveErrorTimer) {
      clearTimeout(attemptSaveErrorTimer);
      attemptSaveErrorTimer = null;
    }
    if (runtimeNoticeTimer) {
      clearTimeout(runtimeNoticeTimer);
      runtimeNoticeTimer = null;
    }
    runtimeNotice = '';

    try {
      const data = await fetchModuleWithChallenges(id, { signal: controller.signal });

      if (token !== activeLoadToken) return;

      console.debug('[GramQuest] loadModule:success', {
        token,
        moduleId: id,
        challenges: data.challenges.length,
      });

      initAudio();
      manager = createChallengeManager(data.challenges, { randomize: false });
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
    if (game.currentChallenge?.type === 'open_text') {
      return handleOpenTextAnswer(answer);
    }
    return submitAnswer(answer, manager);
  }

  async function handleOpenTextAnswer(answer) {
    const challenge = game.currentChallenge;
    const studentName = typeof window !== 'undefined'
      ? window.sessionStorage.getItem(STUDENT_NAME_KEY)?.trim()
      : '';
    const classroomId = typeof window !== 'undefined'
      ? window.sessionStorage.getItem(CLASSROOM_ID_KEY)?.trim()
      : '';
    const classroomName = typeof window !== 'undefined'
      ? window.sessionStorage.getItem(CLASSROOM_NAME_KEY)?.trim()
      : '';

    if (!challenge) {
      return { submitted: false, message: 'Desafio indisponivel no momento.' };
    }

    if (!studentName || !classroomId) {
      return { submitted: false, message: 'Seus dados de aluno nao foram encontrados. Volte ao menu e informe novamente.' };
    }

    const responseText = answer?.trim?.() || '';
    if (!responseText) {
      return { submitted: false, message: 'Digite uma resposta antes de enviar.' };
    }

    if (!challenge.challengeRecordId) {
      return { submitted: false, message: 'Nao foi possivel identificar esta pergunta para salvar sua resposta.' };
    }

    try {
      await createOpenTextResponse({
        module_id: moduleId,
        challenge_id: challenge.challengeRecordId,
        classroom_id: classroomId,
        classroom_name: classroomName || '',
        student_name: studentName,
        response_text: responseText,
        status: 'pending',
      });

      try {
        loadNextChallenge(manager);
      } catch (error) {
        console.error('[Alquimia Verbal] Falha ao avancar apos resposta aberta:', error.message);
      }

      return {
        submitted: true,
        message: 'Resposta enviada para correcao do professor.',
      };
    } catch (error) {
      const rawMessage = error?.message || '';
      const challengeWasUpdated = /foreign key constraint|open_text_responses_challenge_id_fkey/i.test(rawMessage);

      return {
        submitted: false,
        message: challengeWasUpdated
          ? 'Esta pergunta foi atualizada pelo professor. Volte ao menu e abra o modulo novamente antes de responder.'
          : rawMessage || 'Nao foi possivel enviar sua resposta.',
      };
    }
  }

  function handleHint() {
    return requestHint();
  }

  async function handleRestart() {
    if (game.phase === 'victory' || game.phase === 'game_over') {
      await saveAttemptIfNeeded(game.phase);
    }

    if (manager) manager.reset();
    attemptSaved = false;
    attemptSaving = false;
    attemptSaveError = '';
    resetToMenu();
    loadModule(moduleId);
  }

  function retryLoad() {
    loadModule(moduleId);
  }

  async function goToMenu() {
    if (game.phase === 'victory' || game.phase === 'game_over') {
      await saveAttemptIfNeeded(game.phase);
    }

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

    {#if runtimeNotice}
      <p class="runtime-notice">{runtimeNotice}</p>
    {/if}

    <HUD
      score={game.score}
      streak={game.streak}
      monsterHp={game.monsterHp}
      maxMonsterHp={game.maxMonsterHp}
      playerHp={game.playerHp}
      maxPlayerHp={game.maxPlayerHp}
      monsterHit={isHit}
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
        <MonsterSvg seed={game.monsterSeed} sprite={game.monsterSprite} class="battle-monster-svg" />
        <span class="hit-ring" aria-hidden="true"></span>
        <span class="hit-sparks" aria-hidden="true"></span>
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
          <span class="stat-card-value score-ratio">
            <span>{game.score}</span>
            <span class="score-divider">/</span>
            <span class="score-max">{finalMaxScore}</span>
          </span>
          <span class="stat-card-label">Pontos</span>
        </div>
        <div class="stat-card">
          <span class="stat-card-value">{game.progress.total}</span>
          <span class="stat-card-label">Desafios</span>
        </div>
      </div>

      {#if attemptSaving}
        <p class="attempt-save-note">Salvando seu resultado...</p>
      {:else if attemptSaveError}
        <p class="attempt-save-note error">{attemptSaveError}</p>
      {/if}

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
          <span class="stat-card-value score-ratio">
            <span>{game.score}</span>
            <span class="score-divider">/</span>
            <span class="score-max">{finalMaxScore}</span>
          </span>
          <span class="stat-card-label">Pontos</span>
        </div>
        <div class="stat-card">
          <span class="stat-card-value">{game.progress.current}</span>
          <span class="stat-card-label">Respondidas</span>
        </div>
      </div>

      {#if attemptSaving}
        <p class="attempt-save-note">Salvando seu resultado...</p>
      {:else if attemptSaveError}
        <p class="attempt-save-note error">{attemptSaveError}</p>
      {/if}

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

  .runtime-notice {
    margin: 0.75rem auto 0;
    max-width: 560px;
    padding: 0.8rem 0.95rem;
    border-radius: 14px;
    border: 1px solid rgba(148, 163, 184, 0.16);
    background: rgba(15, 23, 42, 0.42);
    color: var(--color-text);
    font-size: 0.92rem;
    line-height: 1.45;
    text-align: center;
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

  .hit-ring {
    position: absolute;
    width: clamp(180px, 24vw, 300px);
    height: clamp(180px, 24vw, 300px);
    border-radius: 50%;
    border: 2px solid rgba(250, 204, 21, 0.72);
    box-shadow: 0 0 18px rgba(250, 204, 21, 0.28);
    opacity: 0;
    pointer-events: none;
  }

  .monster-display.hit .hit-ring {
    animation: hit-ring-pop 0.38s ease-out;
  }

  .hit-sparks {
    position: absolute;
    inset: -12px;
    pointer-events: none;
  }

  .hit-sparks::before,
  .hit-sparks::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #facc15;
    opacity: 0;
  }

  .monster-display.hit .hit-sparks::before {
    box-shadow:
      -46px -8px 0 #fde047,
      42px -14px 0 #facc15,
      -16px 40px 0 #f59e0b,
      24px 36px 0 #fde68a;
    animation: spark-burst-a 0.34s ease-out;
  }

  .monster-display.hit .hit-sparks::after {
    box-shadow:
      -36px -30px 0 #f59e0b,
      16px -42px 0 #fde047,
      -44px 24px 0 #fde68a,
      40px 20px 0 #fbbf24;
    animation: spark-burst-b 0.38s ease-out;
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

  @keyframes hit-ring-pop {
    0% { transform: scale(0.65); opacity: 0.85; }
    100% { transform: scale(1.25); opacity: 0; }
  }

  @keyframes spark-burst-a {
    0% { transform: translate(-50%, -50%) scale(0.4); opacity: 1; }
    100% { transform: translate(-50%, -50%) scale(1.4); opacity: 0; }
  }

  @keyframes spark-burst-b {
    0% { transform: translate(-50%, -50%) scale(0.3); opacity: 0.9; }
    100% { transform: translate(-50%, -50%) scale(1.55); opacity: 0; }
  }

  :global(.battle-monster-svg) {
    width: clamp(170px, 23vw, 270px);
    height: clamp(170px, 23vw, 270px);
    object-fit: contain;
    filter: drop-shadow(0 4px 12px var(--color-primary-glow));
    transition: all var(--transition-normal);
  }

  :global(img.battle-monster-svg) {
    image-rendering: pixelated;
    transform: scale(1.4);
    transform-origin: center;
  }

  @media (max-width: 640px) {
    :global(.battle-monster-svg) {
      width: clamp(145px, 42vw, 220px);
      height: clamp(145px, 42vw, 220px);
    }

    :global(img.battle-monster-svg) {
      transform: scale(1.32);
    }
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

  .score-ratio {
    display: inline-flex;
    align-items: baseline;
    gap: 0.3rem;
    white-space: nowrap;
  }

  .score-divider {
    opacity: 0.6;
    font-size: 1.4rem;
  }

  .score-max {
    font-size: 1.2rem;
    opacity: 0.8;
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

  .attempt-save-note {
    max-width: 520px;
    color: var(--color-muted);
    font-size: 0.92rem;
    line-height: 1.5;
  }

  .attempt-save-note.error {
    color: #fecaca;
  }

</style>
