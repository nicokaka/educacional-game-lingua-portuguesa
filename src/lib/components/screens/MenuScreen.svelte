<script>
  import { navigate } from '../../router.svelte.js';
  import { fetchModules } from '../../supabase/modules.js';
  import { clearModuleLeaderboard, fetchModuleLeaderboard, MODULE_LEADERBOARD_WINDOW_HOURS } from '../../supabase/attempts.js';
  import { fetchActiveClassrooms } from '../../supabase/classrooms.js';

  const STUDENT_NAME_KEY = 'alquimia-verbal:student-name';
  const CLASSROOM_ID_KEY = 'alquimia-verbal:classroom-id';
  const CLASSROOM_NAME_KEY = 'alquimia-verbal:classroom-name';
  const PROFESSOR_PASSWORD = import.meta.env.VITE_PROFESSOR_PASSWORD || 'prof2026';

  let modules = $state([]);
  let classrooms = $state([]);
  let loading = $state(true);
  let error = $state('');
  let classroomsError = $state('');
  let showHelp = $state(false);
  let helpSection = $state('instructions');
  let showStudentModal = $state(false);
  let selectedModuleId = $state('');
  let studentModalMode = $state('play');
  let selectedClassroomId = $state('');
  let studentName = $state('');
  let studentNameError = $state('');
  let studentNameInput = $state();
  let showLeaderboardModal = $state(false);
  let leaderboardLoading = $state(false);
  let leaderboardError = $state('');
  let leaderboardModule = $state(null);
  let pendingLeaderboardModule = $state(null);
  let leaderboardClassroomName = $state('');
  let leaderboardStudentName = $state('');
  let leaderboardTop3 = $state([]);
  let currentStudentLeaderboard = $state(null);
  let showResetLeaderboardPrompt = $state(false);
  let resetLeaderboardPassword = $state('');
  let resetLeaderboardError = $state('');
  let resetLeaderboardSuccess = $state('');
  let resettingLeaderboard = $state(false);
  const creatorName = import.meta.env.VITE_GAME_CREATOR || 'Nicolas Oliveira';
  const mentorName = import.meta.env.VITE_GAME_MENTOR || 'Sergio Claudino';

  async function load() {
    loading = true;
    error = '';
    classroomsError = '';
    try {
      const [modulesResult, classroomsResult] = await Promise.allSettled([
        fetchModules(),
        fetchActiveClassrooms(),
      ]);

      if (modulesResult.status === 'rejected') {
        throw modulesResult.reason;
      }

      modules = modulesResult.value || [];

      if (classroomsResult.status === 'fulfilled') {
        classrooms = classroomsResult.value || [];
      } else {
        classrooms = [];
        classroomsError = classroomsResult.reason?.message || 'Nao foi possivel carregar as turmas.';
      }
    } catch (e) {
      error = e.message;
    } finally {
      loading = false;
    }
  }

  // Carrega módulos ao montar
  $effect(() => { load(); });

  $effect(() => {
    if (!showStudentModal) return;
    const focusTimer = setTimeout(() => {
      studentNameInput?.focus();
    }, 0);

    return () => clearTimeout(focusTimer);
  });

  function getSavedStudentName() {
    if (typeof window === 'undefined') return '';
    return window.sessionStorage.getItem(STUDENT_NAME_KEY) || '';
  }

  function getSavedClassroomId() {
    if (typeof window === 'undefined') return '';
    return window.sessionStorage.getItem(CLASSROOM_ID_KEY) || '';
  }

  function getSavedClassroomName() {
    if (typeof window === 'undefined') return '';
    return window.sessionStorage.getItem(CLASSROOM_NAME_KEY) || '';
  }

  function openStudentModal(moduleId = '', mode = 'play') {
    selectedModuleId = moduleId;
    studentModalMode = mode;
    studentName = getSavedStudentName();
    const savedClassroomId = getSavedClassroomId();
    selectedClassroomId = classrooms.some((classroom) => classroom.id === savedClassroomId)
      ? savedClassroomId
      : classrooms[0]?.id || '';
    studentNameError = '';
    showStudentModal = true;
  }

  function closeStudentModal() {
    showStudentModal = false;
    selectedModuleId = '';
    studentModalMode = 'play';
    selectedClassroomId = '';
    studentNameError = '';
    pendingLeaderboardModule = null;
  }

  function playModule(id) {
    openStudentModal(id, 'play');
  }

  function openStudentReviews() {
    if (getSavedStudentName().trim() && getSavedClassroomId().trim()) {
      navigate('/reviews');
      return;
    }

    openStudentModal('', 'reviews');
  }

  function confirmStudentName(event) {
    event?.preventDefault?.();

    const trimmedName = studentName.trim();
    const selectedClassroom = classrooms.find((classroom) => classroom.id === selectedClassroomId);
    const modalMode = studentModalMode;

    if (classroomsError) {
      studentNameError = classroomsError;
      return;
    }

    if (classrooms.length === 0) {
      studentNameError = 'Nenhuma turma esta disponivel agora. Peça ao professor para cadastrar uma turma.';
      return;
    }

    if (!selectedClassroom) {
      studentNameError = 'Escolha sua turma para continuar.';
      return;
    }

    if (modalMode !== 'leaderboard' && !trimmedName) {
      studentNameError = 'Digite seu nome para continuar.';
      return;
    }

    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(CLASSROOM_ID_KEY, selectedClassroom.id);
      window.sessionStorage.setItem(CLASSROOM_NAME_KEY, selectedClassroom.name);

      if (trimmedName) {
        window.sessionStorage.setItem(STUDENT_NAME_KEY, trimmedName);
      } else if (modalMode === 'leaderboard') {
        window.sessionStorage.removeItem(STUDENT_NAME_KEY);
      }
    }

    const moduleId = selectedModuleId;
    const leaderboardToOpen = pendingLeaderboardModule;
    closeStudentModal();
    if (modalMode === 'reviews') {
      navigate('/reviews');
      return;
    }

    if (modalMode === 'leaderboard' && leaderboardToOpen) {
      void loadLeaderboard(leaderboardToOpen);
      return;
    }

    navigate(`/play/${moduleId}`);
  }

  function openEditor() {
    navigate('/editor');
  }

  async function loadLeaderboard(moduleData) {
    showLeaderboardModal = true;
    leaderboardLoading = true;
    leaderboardError = '';
    leaderboardModule = moduleData;
    leaderboardClassroomName = getSavedClassroomName().trim();
    leaderboardStudentName = getSavedStudentName().trim();
    leaderboardTop3 = [];
    currentStudentLeaderboard = null;
    showResetLeaderboardPrompt = false;
    resetLeaderboardPassword = '';
    resetLeaderboardError = '';
    resetLeaderboardSuccess = '';

    try {
    const studentName = getSavedStudentName().trim();
    const classroomId = getSavedClassroomId().trim();
    const result = await fetchModuleLeaderboard(moduleData.id, studentName, classroomId);
      leaderboardTop3 = result.top3;
      currentStudentLeaderboard = result.currentStudent;
    } catch (error) {
      leaderboardError = error.message;
    } finally {
      leaderboardLoading = false;
    }
  }

  async function openLeaderboard(moduleData) {
    const classroomId = getSavedClassroomId().trim();

    if (!classroomId) {
      pendingLeaderboardModule = moduleData;
      openStudentModal('', 'leaderboard');
      return;
    }

    await loadLeaderboard(moduleData);
  }

  function closeLeaderboard() {
    showLeaderboardModal = false;
    leaderboardLoading = false;
    leaderboardError = '';
    leaderboardModule = null;
    leaderboardClassroomName = '';
    leaderboardStudentName = '';
    leaderboardTop3 = [];
    currentStudentLeaderboard = null;
    showResetLeaderboardPrompt = false;
    resetLeaderboardPassword = '';
    resetLeaderboardError = '';
    resetLeaderboardSuccess = '';
    resettingLeaderboard = false;
  }

  function retryLeaderboard() {
    if (!leaderboardModule) return;
    openLeaderboard(leaderboardModule);
  }

  function reopenLeaderboardStudentModal() {
    if (!leaderboardModule) return;
    const currentModule = leaderboardModule;
    closeLeaderboard();
    pendingLeaderboardModule = currentModule;
    openStudentModal('', 'leaderboard');
  }

  function openResetLeaderboardPrompt() {
    showResetLeaderboardPrompt = true;
    resetLeaderboardPassword = '';
    resetLeaderboardError = '';
    resetLeaderboardSuccess = '';
  }

  function cancelResetLeaderboardPrompt() {
    showResetLeaderboardPrompt = false;
    resetLeaderboardPassword = '';
    resetLeaderboardError = '';
  }

  async function confirmResetLeaderboard() {
    if (!leaderboardModule || resettingLeaderboard) return;

    if (resetLeaderboardPassword !== PROFESSOR_PASSWORD) {
      resetLeaderboardError = 'Senha do professor incorreta.';
      return;
    }

    resettingLeaderboard = true;
    resetLeaderboardError = '';
    resetLeaderboardSuccess = '';

    try {
      const classroomId = getSavedClassroomId().trim();
      const { deletedCount } = await clearModuleLeaderboard(leaderboardModule.id, classroomId);
      resetLeaderboardSuccess = deletedCount > 0
        ? 'Placar zerado com sucesso.'
        : 'Nao havia tentativas recentes para remover.';
      showResetLeaderboardPrompt = false;
      resetLeaderboardPassword = '';
      await openLeaderboard(leaderboardModule);
      resetLeaderboardSuccess = deletedCount > 0
        ? 'Placar zerado com sucesso.'
        : 'Nao havia tentativas recentes para remover.';
    } catch (error) {
      resetLeaderboardError = error?.message || 'Nao foi possivel zerar o placar.';
    } finally {
      resettingLeaderboard = false;
    }
  }

  function openHelp(section = 'instructions') {
    helpSection = section;
    showHelp = true;
  }

  function closeHelp() {
    showHelp = false;
  }

  function getAttemptStatusLabel(completed) {
    return completed ? 'Concluiu' : 'Nao concluiu';
  }

  function handleWindowKeydown(event) {
    if (event.key === 'Escape' && showHelp) {
      closeHelp();
    }

    if (event.key === 'Escape' && showStudentModal) {
      closeStudentModal();
    }

    if (event.key === 'Escape' && showLeaderboardModal) {
      closeLeaderboard();
    }
  }

  function stopMouseDown(event) {
    event.stopPropagation();
  }
</script>

<svelte:window onkeydown={handleWindowKeydown} />

<div class="menu-screen">
  <div class="logo-section">
    <h1 class="game-title">
      <span class="title-alquimia">Alquimia</span>&nbsp;<span class="title-verbal">Verbal</span>
    </h1>
    <p class="game-subtitle">Derrote os monstros da gramática!</p>

    <div class="quick-actions">
      <button
        class="quick-action-btn primary"
        onclick={() => openHelp('instructions')}
        aria-label="Abrir instrucoes do jogo"
        title="Como jogar"
      >
        ❓ Instruções
      </button>
      <button
        class="quick-action-btn secondary"
        onclick={() => openHelp('credits')}
        aria-label="Abrir creditos"
        title="Creditos"
      >
        ℹ️ Créditos
      </button>
      <button
        class="quick-action-btn tertiary"
        onclick={openStudentReviews}
        aria-label="Ver minhas correcoes"
        title="Ver minhas correcoes"
      >
        📝 Ver minhas correções
      </button>
    </div>
  </div>

  <div class="menu-monster">
    <img src="/prof-cartoon.png" class="professor-img" alt="Professor Cartoon" />
  </div>

  {#if loading}
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Carregando módulos...</p>
    </div>
  {:else if error}
    <div class="error-state">
      <p class="error-text">⚠️ {error}</p>
      <button class="retry-btn" onclick={load}>Tentar novamente</button>
    </div>
  {:else if modules.length === 0}
    <div class="empty-state">
      <p class="empty-text">Nenhum módulo disponível ainda.</p>
      <p class="empty-hint">Peça ao professor para criar módulos no editor.</p>
    </div>
  {:else}
    <div class="modules-grid">
      <h2 class="section-title">📚 Escolha um Módulo</h2>
      {#each modules as mod (mod.id)}
        <div class="module-row">
          <button class="module-card" onclick={() => playModule(mod.id)}>
            <div class="module-card-header">
              <span class="module-icon">📖</span>
              <span class="module-title">{mod.title}</span>
            </div>
            <div class="module-card-footer">
              <span class="module-author">✍️ {mod.author}</span>
              <span class="module-count">{mod.challengeCount} desafios</span>
            </div>
          </button>

          <button
            class="module-rank-btn"
            onclick={() => openLeaderboard(mod)}
            aria-label={"Abrir placar do modulo " + mod.title}
            title="Ver placar"
          >
            🏆 Placar
          </button>
        </div>
      {/each}
    </div>
  {/if}

  <button class="editor-btn" onclick={openEditor}>
    🎓 Área do Professor
  </button>

  <p class="credits">Projeto de Estágio — Licenciatura em Computação (UFRPE)</p>
</div>

{#if showHelp}
  <div class="help-overlay" role="presentation" onmousedown={closeHelp}>
    <div
      class="help-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Ajuda e creditos"
      tabindex="-1"
      onmousedown={stopMouseDown}
    >
      <div class="help-header">
        <h2 class="help-title">{helpSection === 'credits' ? '👥 Créditos' : '🧭 Como jogar'}</h2>
        <button class="help-close" onclick={closeHelp} aria-label="Fechar ajuda">x</button>
      </div>

      <div class="help-tabs">
        <button
          class="help-tab-btn"
          class:active={helpSection === 'instructions'}
          onclick={() => openHelp('instructions')}
        >
          Instruções
        </button>
        <button
          class="help-tab-btn"
          class:active={helpSection === 'credits'}
          onclick={() => openHelp('credits')}
        >
          Créditos
        </button>
      </div>

      {#if helpSection === 'instructions'}
        <p class="help-line">1. Escolha um módulo e comece a batalha.</p>
        <p class="help-line">2. Acerte os desafios para reduzir o HP do monstro.</p>
        <p class="help-line">3. Se errar, você perde energia. Se chegar a zero, é game over.</p>
        <p class="help-line">4. O bizu ajuda, mas também custa energia.</p>
      {:else}
        <h3 class="help-subtitle">Equipe do jogo</h3>
        <p class="credits-line"><strong>Criador:</strong> {creatorName}</p>
        <p class="credits-line"><strong>Professor:</strong> {mentorName}</p>
        <p class="credits-line"><strong>Projeto:</strong> Alquimia Verbal — aprendizado de língua portuguesa em formato de jogo.</p>
      {/if}
    </div>
  </div>
{/if}

{#if showStudentModal}
  <div class="help-overlay" role="presentation" onmousedown={closeStudentModal}>
    <div
      class="help-modal student-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Informar nome do aluno"
      tabindex="-1"
      onmousedown={stopMouseDown}
    >
      <form onsubmit={confirmStudentName}>
        <div class="help-header">
        <h2 class="help-title">
          {studentModalMode === 'reviews'
            ? 'Ver minhas correções'
            : studentModalMode === 'leaderboard'
              ? 'Ver placar da turma'
              : 'Antes de jogar'}
        </h2>
          <button type="button" class="help-close" onclick={closeStudentModal} aria-label="Fechar">x</button>
        </div>

        <p class="student-copy">
          {studentModalMode === 'reviews'
            ? 'Digite seu nome para consultar suas respostas abertas corrigidas.'
            : studentModalMode === 'leaderboard'
              ? 'Escolha sua turma para ver o placar da aula. Se quiser destacar sua posicao, digite seu nome.'
              : 'Digite seu nome para entrar no modulo.'}
        </p>

        {#if studentModalMode === 'leaderboard'}
          <div class="student-tip-card">
            <span class="student-tip-badge">Placar</span>
            <p>Voce pode entrar sem nome para ver a classificacao completa da turma. O nome serve apenas para destacar sua posicao.</p>
          </div>
        {/if}

        <div class="student-field">
          <label class="field-label" for="student-classroom-select">Turma</label>
          <select
            id="student-classroom-select"
            class="student-input student-select"
            bind:value={selectedClassroomId}
            disabled={classrooms.length === 0}
          >
            <option value="" disabled selected={selectedClassroomId === ''}>Selecione sua turma</option>
            {#each classrooms as classroom (classroom.id)}
              <option value={classroom.id}>{classroom.name}</option>
            {/each}
          </select>
          {#if classrooms.length === 0}
            <p class="student-helper">
              {classroomsError || 'Nenhuma turma cadastrada ainda. Peça ao professor para criar uma turma.'}
            </p>
          {/if}
        </div>

        <div class="student-field">
          <label class="field-label" for="student-name-input">
            {studentModalMode === 'leaderboard' ? 'Nome do aluno (opcional)' : 'Nome do aluno'}
          </label>
          <input
            id="student-name-input"
            class="student-input"
            bind:value={studentName}
            bind:this={studentNameInput}
            placeholder="Ex.: Maria Souza"
            maxlength="80"
          />
          {#if studentModalMode === 'leaderboard'}
            <p class="student-helper">Se preferir, deixe este campo vazio e veja apenas o ranking da turma.</p>
          {/if}
        </div>

        {#if studentNameError}
          <p class="student-error">{studentNameError}</p>
        {/if}

        <div class="student-actions">
          <button type="button" class="student-btn secondary" onclick={closeStudentModal}>
            Cancelar
          </button>
          <button type="submit" class="student-btn primary">
            {studentModalMode === 'reviews'
              ? 'Ver correções'
              : studentModalMode === 'leaderboard'
                ? 'Ver placar'
                : 'Comecar'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

{#if showLeaderboardModal}
  <div class="help-overlay" role="presentation" onmousedown={closeLeaderboard}>
    <div
      class="help-modal leaderboard-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Placar do modulo"
      tabindex="-1"
      onmousedown={stopMouseDown}
    >
      <div class="help-header">
        <h2 class="help-title">{leaderboardClassroomName ? '🏆 Placar da turma' : '🏆 Placar'}</h2>
        <button type="button" class="help-close" onclick={closeLeaderboard} aria-label="Fechar">x</button>
      </div>

      {#if leaderboardModule}
        <div class="leaderboard-intro">
          <p class="leaderboard-module-title">{leaderboardModule.title}</p>
          <p class="empty-hint">
            {leaderboardClassroomName
              ? 'Classificacao da sua turma nesta aula.'
              : 'Classificacao recente deste modulo.'}
          </p>
          <div class="leaderboard-filter-card">
            <div class="leaderboard-filter-copy">
              <span class="leaderboard-filter-label">Filtro ativo</span>
              <strong>{leaderboardClassroomName || 'Todas as turmas recentes'}</strong>
              <span>
                {leaderboardStudentName
                  ? `Posicao destacada para ${leaderboardStudentName}.`
                  : 'Sem nome informado: mostrando a classificacao completa da turma.'}
              </span>
            </div>
            <button
              type="button"
              class="leaderboard-filter-btn"
              onclick={reopenLeaderboardStudentModal}
            >
              Ajustar filtro
            </button>
          </div>
          <div class="leaderboard-context">
            <span class="leaderboard-chip">Ultimas {MODULE_LEADERBOARD_WINDOW_HOURS}h</span>
            {#if leaderboardClassroomName}
              <span class="leaderboard-chip classroom">{leaderboardClassroomName}</span>
            {/if}
            {#if leaderboardStudentName}
              <span class="leaderboard-chip viewer">{leaderboardStudentName}</span>
            {:else}
              <span class="leaderboard-chip viewer empty">Sem nome</span>
            {/if}
          </div>
        </div>
      {/if}

      {#if leaderboardLoading}
        <div class="loading-state leaderboard-state">
          <div class="spinner"></div>
          <p>Carregando placar...</p>
        </div>
      {:else if leaderboardError}
        <div class="error-state leaderboard-state">
          <p class="error-text">⚠️ {leaderboardError}</p>
          <p class="empty-hint">Nao foi possivel atualizar o placar desta turma agora.</p>
          <button type="button" class="retry-btn" onclick={retryLeaderboard}>Tentar novamente</button>
        </div>
      {:else if leaderboardTop3.length === 0}
        <div class="empty-state leaderboard-state">
          <p class="empty-text">Ainda nao ha pontuacoes para este placar.</p>
          <p class="empty-hint">
            {leaderboardClassroomName
              ? `A turma ${leaderboardClassroomName} ainda nao registrou tentativas nas ultimas 12 horas.`
              : `Ainda nao ha tentativas registradas nas ultimas ${MODULE_LEADERBOARD_WINDOW_HOURS} horas.`}
          </p>
        </div>
      {:else}
        <div class="leaderboard-list">
          {#each leaderboardTop3 as entry, index}
            <div class={`leaderboard-entry podium-${index + 1}`}>
              <div class="leaderboard-rank">
                <span class="leaderboard-rank-badge">{index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}</span>
                <span>#{index + 1}</span>
              </div>
              <div class="leaderboard-main">
                <div class="leaderboard-name">{entry.student_name}</div>
                {#if entry.classroom_name}
                  <div class="leaderboard-classroom">{entry.classroom_name}</div>
                {/if}
                <div class="leaderboard-meta">
                  <span class="leaderboard-stat strong">{Math.round(entry.percentage * 100)}%</span>
                  <span class="leaderboard-stat">{entry.score}/{entry.max_score} pontos</span>
                  <span class="leaderboard-stat">{getAttemptStatusLabel(entry.completed)}</span>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}

      <div class="leaderboard-divider"></div>

      <h3 class="help-subtitle">Sua posição</h3>
      {#if currentStudentLeaderboard}
        <div class="leaderboard-entry current-student">
          <div class="leaderboard-rank">
            <span class="leaderboard-rank-badge">📍</span>
            <span>#{currentStudentLeaderboard.rank}</span>
          </div>
          <div class="leaderboard-main">
            <div class="leaderboard-name">{currentStudentLeaderboard.student_name}</div>
            {#if currentStudentLeaderboard.classroom_name}
              <div class="leaderboard-classroom">{currentStudentLeaderboard.classroom_name}</div>
            {/if}
            <div class="leaderboard-meta">
              <span class="leaderboard-stat strong">{Math.round(currentStudentLeaderboard.percentage * 100)}%</span>
              <span class="leaderboard-stat">{currentStudentLeaderboard.score}/{currentStudentLeaderboard.max_score} pontos</span>
              <span class="leaderboard-stat">{getAttemptStatusLabel(currentStudentLeaderboard.completed)}</span>
            </div>
          </div>
        </div>
      {:else}
        <div class="leaderboard-empty-card">
          <p class="empty-hint">
            {!leaderboardStudentName
              ? 'Digite seu nome para destacar sua posicao no ranking.'
              : leaderboardClassroomName
              ? `Voce ainda nao tem tentativa registrada para ${leaderboardClassroomName} nas ultimas 12 horas.`
              : `Voce ainda nao tem tentativa registrada neste modulo nas ultimas ${MODULE_LEADERBOARD_WINDOW_HOURS} horas.`}
          </p>
          <button
            type="button"
            class="leaderboard-inline-link"
            onclick={reopenLeaderboardStudentModal}
          >
            {leaderboardStudentName ? 'Trocar turma ou nome' : 'Informar nome ou trocar turma'}
          </button>
        </div>
      {/if}

      <div class="leaderboard-divider"></div>

      <div class="leaderboard-reset">
        <button
          type="button"
          class="student-btn secondary leaderboard-reset-trigger"
          onclick={openResetLeaderboardPrompt}
          disabled={leaderboardLoading || resettingLeaderboard}
        >
          Zerar placar
        </button>

        {#if showResetLeaderboardPrompt}
          <div class="leaderboard-reset-card">
            <label class="field-label" for="leaderboard-reset-password">Senha do professor</label>
            <input
              id="leaderboard-reset-password"
              type="password"
              class="student-input"
              bind:value={resetLeaderboardPassword}
              placeholder="Digite a senha do professor"
            />

            {#if resetLeaderboardError}
              <p class="student-error">{resetLeaderboardError}</p>
            {/if}

            <div class="student-actions leaderboard-reset-actions">
              <button
                type="button"
                class="student-btn secondary"
                onclick={cancelResetLeaderboardPrompt}
                disabled={resettingLeaderboard}
              >
                Cancelar
              </button>
              <button
                type="button"
                class="student-btn primary"
                onclick={confirmResetLeaderboard}
                disabled={resettingLeaderboard}
              >
                {resettingLeaderboard ? 'Zerando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        {:else if resetLeaderboardSuccess}
          <p class="leaderboard-reset-success">{resetLeaderboardSuccess}</p>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .menu-screen {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1.5rem;
    text-align: center;
    padding: 2rem;
    animation: fadeIn 0.6s ease;
    position: relative;
  }

  .logo-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .game-title {
    font-family: var(--font-title);
    font-size: clamp(2.5rem, 8vw, 4rem); /* Aumentei max para 4rem pra Macondo brilhar */
    font-weight: 400; /* Macondo não precisa de 800 */
    line-height: 1;
    letter-spacing: -0.02em;
  }

  .title-alquimia { color: var(--color-primary); }
  .title-verbal { color: var(--color-correct); }

  .game-subtitle {
    font-size: 1.1rem;
    color: var(--color-muted);
  }

  .quick-actions {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.6rem;
    margin-top: 0.35rem;
    flex-wrap: wrap;
  }

  .quick-action-btn {
    border: 1px solid var(--color-border);
    border-radius: 999px;
    padding: 0.45rem 0.85rem;
    font-size: 0.85rem;
    font-weight: 700;
    transition: all var(--transition-fast);
  }

  .quick-action-btn.primary {
    background: rgba(139, 92, 246, 0.18);
    color: #efe8ff;
    border-color: rgba(139, 92, 246, 0.75);
  }

  .quick-action-btn.primary:hover {
    background: rgba(139, 92, 246, 0.28);
    transform: translateY(-1px);
  }

  .quick-action-btn.secondary {
    background: rgba(34, 197, 94, 0.12);
    color: #dcfce7;
    border-color: rgba(34, 197, 94, 0.4);
  }

  .quick-action-btn.secondary:hover {
    background: rgba(34, 197, 94, 0.2);
    transform: translateY(-1px);
  }

  .quick-action-btn.tertiary {
    background: rgba(56, 189, 248, 0.12);
    color: #dbeafe;
    border-color: rgba(56, 189, 248, 0.4);
  }

  .quick-action-btn.tertiary:hover {
    background: rgba(56, 189, 248, 0.22);
    transform: translateY(-1px);
  }

  .menu-monster {
    animation: float 3s ease-in-out infinite;
    margin-bottom: -80px; /* Aprofundado atrás dos módulos */
    margin-top: -10px; /* Sobe a imagem um pouco mais para perto do título */
    position: relative;
    z-index: 1;
    pointer-events: none; /* Pra não bloquear cliques nos cards se sobrepor */
  }

  .professor-img {
    width: clamp(250px, 32vw, 380px);
    height: auto;
    max-height: clamp(300px, 56vh, 480px);
    object-fit: contain;
    margin-left: clamp(-35px, -2.4vw, -14px); /* Compensa peso visual do livro */
    filter: drop-shadow(0 8px 24px rgba(0, 0, 0, 0.5));
    /* Disfarça corte abrupto em baixo fazendo a imagem sumir (fade out) */
    -webkit-mask-image: linear-gradient(to bottom, black 65%, transparent 100%);
    mask-image: linear-gradient(to bottom, black 65%, transparent 100%);
  }

  /* ── Módulos Grid ── */
  .section-title {
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--color-text);
    margin-bottom: 0.5rem;
    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.9); /* Garante leitura sobre a imagem */
  }

  .modules-grid {
    width: 100%;
    max-width: 500px;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    position: relative;
    z-index: 10;
  }

  .module-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.65rem;
    align-items: stretch;
  }

  .module-card {
    width: 100%;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: 1rem 1.25rem;
    text-align: left;
    color: var(--color-text);
    transition: all var(--transition-normal);
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .module-card:hover {
    border-color: var(--color-primary);
    transform: translateY(-2px);
    box-shadow: 0 4px 20px var(--color-primary-glow);
  }

  .module-rank-btn {
    border: 1px solid rgba(250, 204, 21, 0.28);
    border-radius: var(--radius-lg);
    background: linear-gradient(180deg, rgba(59, 44, 7, 0.58), rgba(30, 41, 59, 0.92));
    color: #fde68a;
    font-size: 0.84rem;
    font-weight: 700;
    padding: 0.8rem 0.95rem;
    white-space: nowrap;
    transition: transform var(--transition-fast), border-color var(--transition-fast), box-shadow var(--transition-fast);
  }

  .module-rank-btn:hover {
    transform: translateY(-2px);
    border-color: rgba(250, 204, 21, 0.5);
    box-shadow: 0 6px 18px rgba(250, 204, 21, 0.12);
  }

  .module-card-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .module-icon {
    font-size: 1.5rem;
  }

  .module-title {
    font-size: 1.05rem;
    font-weight: 700;
  }

  .module-card-footer {
    display: flex;
    justify-content: space-between;
    font-size: 0.8rem;
    color: var(--color-muted);
  }

  /* ── Loading / Error / Empty ── */
  .loading-state, .error-state, .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 2rem;
  }

  .spinner {
    width: 36px;
    height: 36px;
    border: 3px solid var(--color-border);
    border-top-color: var(--color-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .error-text {
    color: var(--color-wrong);
    font-size: 0.9rem;
  }

  .retry-btn {
    padding: 0.5rem 1.25rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    color: var(--color-text);
    border-radius: var(--radius-md);
    font-size: 0.85rem;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .retry-btn:hover {
    border-color: var(--color-primary);
  }

  .empty-text {
    color: var(--color-muted);
    font-size: 1rem;
  }

  .empty-hint {
    color: var(--color-muted);
    font-size: 0.85rem;
    opacity: 0.7;
  }

  /* ── Botão Editor ── */
  .editor-btn {
    padding: 0.75rem 1.5rem;
    background: transparent;
    border: 1px solid var(--color-border);
    color: var(--color-muted);
    border-radius: var(--radius-lg);
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition: all var(--transition-normal);
  }

  .editor-btn:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
    background: rgba(139, 92, 246, 0.05);
  }

  .credits {
    font-size: 0.75rem;
    color: var(--color-muted);
    opacity: 0.6;
    margin-top: 0.4rem;
  }

  .help-overlay {
    position: fixed;
    inset: 0;
    background: rgba(2, 6, 23, 0.66);
    backdrop-filter: blur(2px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    z-index: 40;
  }

  .help-modal {
    width: min(560px, 96vw);
    background: linear-gradient(180deg, rgba(30, 41, 59, 0.98), rgba(15, 23, 42, 0.98));
    border: 1px solid var(--color-border);
    border-radius: 18px;
    box-shadow: 0 20px 42px rgba(2, 6, 23, 0.58);
    padding: 1rem 1rem 0.95rem;
    text-align: left;
    animation: help-pop 0.2s ease;
  }

  .help-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.45rem;
  }

  .help-tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.65rem;
  }

  .help-tab-btn {
    border: 1px solid var(--color-border);
    border-radius: 999px;
    background: rgba(15, 23, 42, 0.7);
    color: var(--color-muted);
    font-size: 0.82rem;
    font-weight: 700;
    padding: 0.34rem 0.72rem;
    transition: all var(--transition-fast);
  }

  .help-tab-btn.active {
    color: var(--color-text);
    border-color: rgba(139, 92, 246, 0.8);
    background: rgba(139, 92, 246, 0.2);
  }

  .help-title {
    font-size: 1.02rem;
    font-weight: 700;
    color: var(--color-text);
  }

  .help-close {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    border: 1px solid var(--color-border);
    background: rgba(15, 23, 42, 0.7);
    color: var(--color-muted);
    font-size: 0.95rem;
    font-weight: 700;
    transition: all var(--transition-fast);
  }

  .help-close:hover {
    border-color: var(--color-primary);
    color: var(--color-text);
  }

  .help-line,
  .credits-line {
    font-size: 0.9rem;
    color: var(--color-muted);
    line-height: 1.5;
    margin-bottom: 0.3rem;
  }

  .credits-line strong {
    color: var(--color-text);
    font-weight: 600;
  }

  .help-subtitle {
    font-size: 0.92rem;
    color: var(--color-text);
    margin-bottom: 0.35rem;
  }

  .student-modal {
    width: min(460px, 94vw);
  }

  .leaderboard-modal {
    width: min(520px, 95vw);
  }

  .leaderboard-module-title {
    font-size: 1.02rem;
    font-weight: 800;
    color: var(--color-text);
    line-height: 1.45;
  }

  .leaderboard-intro {
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
    margin-bottom: 0.95rem;
  }

  .leaderboard-filter-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.9rem;
    padding: 0.85rem 0.9rem;
    border: 1px solid rgba(148, 163, 184, 0.16);
    border-radius: 16px;
    background: rgba(15, 23, 42, 0.32);
  }

  .leaderboard-filter-copy {
    display: flex;
    flex-direction: column;
    gap: 0.18rem;
    min-width: 0;
  }

  .leaderboard-filter-copy strong {
    color: var(--color-text);
    font-size: 0.98rem;
    line-height: 1.4;
    word-break: break-word;
  }

  .leaderboard-filter-copy span:last-child {
    color: var(--color-muted);
    font-size: 0.8rem;
    line-height: 1.45;
  }

  .leaderboard-filter-label {
    color: #cbd5e1;
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .leaderboard-context {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
  }

  .leaderboard-chip {
    border-radius: 999px;
    border: 1px solid rgba(250, 204, 21, 0.28);
    background: rgba(250, 204, 21, 0.1);
    color: #fde68a;
    padding: 0.28rem 0.62rem;
    font-size: 0.76rem;
    font-weight: 700;
  }

  .leaderboard-chip.classroom {
    border-color: rgba(56, 189, 248, 0.28);
    background: rgba(56, 189, 248, 0.1);
    color: #dbeafe;
  }

  .leaderboard-chip.viewer {
    border-color: rgba(139, 92, 246, 0.32);
    background: rgba(139, 92, 246, 0.12);
    color: #efe8ff;
  }

  .leaderboard-chip.viewer.empty {
    border-color: rgba(148, 163, 184, 0.24);
    background: rgba(148, 163, 184, 0.08);
    color: #cbd5e1;
  }

  .leaderboard-filter-btn {
    border-radius: 999px;
    border: 1px solid rgba(148, 163, 184, 0.24);
    background: linear-gradient(180deg, rgba(59, 130, 246, 0.14), rgba(15, 23, 42, 0.4));
    color: var(--color-text);
    padding: 0.55rem 0.88rem;
    font-size: 0.78rem;
    font-weight: 700;
    transition: all var(--transition-fast);
    white-space: nowrap;
  }

  .leaderboard-filter-btn:hover {
    transform: translateY(-1px);
    border-color: rgba(56, 189, 248, 0.42);
    color: #dbeafe;
  }

  .leaderboard-state {
    padding: 1rem 0.25rem;
  }

  .leaderboard-list {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
  }

  .leaderboard-entry {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    border: 1px solid rgba(148, 163, 184, 0.14);
    border-radius: 16px;
    background: rgba(15, 23, 42, 0.36);
    padding: 0.8rem 0.9rem;
  }

  .leaderboard-entry.podium-1 {
    border-color: rgba(250, 204, 21, 0.38);
    background: linear-gradient(180deg, rgba(250, 204, 21, 0.12), rgba(15, 23, 42, 0.42));
  }

  .leaderboard-entry.podium-2 {
    border-color: rgba(226, 232, 240, 0.3);
    background: linear-gradient(180deg, rgba(226, 232, 240, 0.08), rgba(15, 23, 42, 0.42));
  }

  .leaderboard-entry.podium-3 {
    border-color: rgba(251, 146, 60, 0.3);
    background: linear-gradient(180deg, rgba(251, 146, 60, 0.08), rgba(15, 23, 42, 0.42));
  }

  .leaderboard-entry.current-student {
    border-color: rgba(139, 92, 246, 0.42);
    background: rgba(139, 92, 246, 0.1);
  }

  .leaderboard-rank {
    min-width: 52px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.15rem;
    font-size: 0.98rem;
    font-weight: 800;
    color: #facc15;
  }

  .leaderboard-rank-badge {
    font-size: 1.05rem;
    line-height: 1;
  }

  .leaderboard-main {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.28rem;
  }

  .leaderboard-name {
    font-size: 0.98rem;
    font-weight: 700;
    color: var(--color-text);
    word-break: break-word;
  }

  .leaderboard-classroom {
    font-size: 0.8rem;
    color: var(--color-muted);
    line-height: 1.35;
  }

  .leaderboard-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem 0.75rem;
    font-size: 0.82rem;
    color: var(--color-muted);
  }

  .leaderboard-stat {
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
  }

  .leaderboard-stat.strong {
    color: var(--color-text);
    font-weight: 700;
  }

  .leaderboard-divider {
    height: 1px;
    background: var(--color-border);
    margin: 1rem 0 0.8rem;
  }

  .leaderboard-empty-card {
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
    padding: 0.95rem 1rem;
    border-radius: 16px;
    border: 1px solid rgba(148, 163, 184, 0.14);
    background: rgba(15, 23, 42, 0.3);
  }

  .leaderboard-inline-link {
    align-self: flex-start;
    border: 1px solid rgba(56, 189, 248, 0.28);
    border-radius: 999px;
    background: rgba(56, 189, 248, 0.1);
    color: #dbeafe;
    padding: 0.42rem 0.78rem;
    font-size: 0.78rem;
    font-weight: 700;
    transition: all var(--transition-fast);
  }

  .leaderboard-inline-link:hover {
    transform: translateY(-1px);
    border-color: rgba(56, 189, 248, 0.42);
    background: rgba(56, 189, 248, 0.16);
  }

  .leaderboard-reset {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-top: 0.4rem;
  }

  .leaderboard-reset-trigger {
    align-self: flex-start;
  }

  .leaderboard-reset-card {
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
    padding: 0.85rem;
    border: 1px solid rgba(148, 163, 184, 0.16);
    border-radius: 16px;
    background: rgba(15, 23, 42, 0.32);
  }

  .leaderboard-reset-actions {
    margin-top: 0.2rem;
  }

  .leaderboard-reset-success {
    font-size: 0.84rem;
    color: #bbf7d0;
    line-height: 1.45;
  }

  .student-copy {
    font-size: 0.92rem;
    color: var(--color-muted);
    line-height: 1.45;
    margin-bottom: 0.9rem;
  }

  .student-tip-card {
    display: flex;
    flex-direction: column;
    gap: 0.32rem;
    margin-bottom: 0.95rem;
    padding: 0.8rem 0.9rem;
    border: 1px solid rgba(56, 189, 248, 0.2);
    border-radius: 16px;
    background: linear-gradient(180deg, rgba(56, 189, 248, 0.1), rgba(15, 23, 42, 0.22));
  }

  .student-tip-card p {
    color: #dbeafe;
    font-size: 0.84rem;
    line-height: 1.5;
  }

  .student-tip-badge {
    width: fit-content;
    border-radius: 999px;
    padding: 0.24rem 0.58rem;
    border: 1px solid rgba(56, 189, 248, 0.28);
    background: rgba(15, 23, 42, 0.4);
    color: #dbeafe;
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .student-field {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }

  .student-input {
    width: 100%;
    border: 1px solid rgba(148, 163, 184, 0.2);
    border-radius: 14px;
    background: rgba(15, 23, 42, 0.68);
    color: var(--color-text);
    padding: 0.9rem 1rem;
    font-size: 0.96rem;
    transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  }

  .student-input:focus {
    outline: none;
    border-color: rgba(139, 92, 246, 0.82);
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.12);
  }

  .student-error {
    font-size: 0.84rem;
    color: var(--color-wrong);
    margin-top: 0.7rem;
  }

  .student-helper {
    font-size: 0.82rem;
    color: var(--color-muted);
    line-height: 1.45;
  }

  .student-select {
    appearance: none;
  }

  .student-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.7rem;
    margin-top: 1rem;
  }

  .student-btn {
    border-radius: 999px;
    padding: 0.7rem 1.1rem;
    font-size: 0.9rem;
    font-weight: 700;
    transition: all var(--transition-fast);
  }

  .student-btn.primary {
    border: 1px solid rgba(139, 92, 246, 0.72);
    background: rgba(139, 92, 246, 0.24);
    color: var(--color-text);
  }

  .student-btn.primary:hover {
    transform: translateY(-1px);
    background: rgba(139, 92, 246, 0.34);
  }

  .student-btn.secondary {
    border: 1px solid rgba(148, 163, 184, 0.24);
    background: rgba(15, 23, 42, 0.4);
    color: var(--color-muted);
  }

  .student-btn.secondary:hover {
    border-color: rgba(148, 163, 184, 0.4);
    color: var(--color-text);
  }

  @keyframes help-pop {
    from {
      transform: translateY(8px) scale(0.98);
      opacity: 0;
    }
    to {
      transform: translateY(0) scale(1);
      opacity: 1;
    }
  }

  @media (max-width: 1024px) {
    .menu-screen {
      padding: 1.25rem 1rem 1.5rem;
      gap: 1rem;
    }

    .menu-monster {
      margin-bottom: -58px;
    }

    .professor-img {
      width: clamp(220px, 42vw, 320px);
      max-height: 43vh;
      margin-left: -18px;
    }
  }

  @media (max-height: 820px) {
    .menu-screen {
      min-height: 100svh;
      justify-content: flex-start;
      gap: 0.9rem;
      padding: 0.85rem 0.85rem 1.5rem;
    }

    .logo-section {
      gap: 0.35rem;
    }

    .game-title {
      font-size: clamp(2rem, 7vw, 3rem);
    }

    .game-subtitle {
      font-size: 0.98rem;
    }

    .menu-monster {
      margin-top: -6px;
      margin-bottom: -40px;
    }

    .professor-img {
      width: clamp(190px, 30vw, 290px);
      max-height: 36vh;
      margin-left: -12px;
    }

    .section-title {
      font-size: 1.08rem;
    }

    .module-card {
      padding: 0.82rem 1rem;
    }

    .module-row {
      grid-template-columns: 1fr;
      gap: 0.5rem;
    }

    .module-rank-btn {
      width: 100%;
      padding: 0.72rem 0.9rem;
    }

    .module-title {
      font-size: 1rem;
    }

    .editor-btn {
      padding: 0.62rem 1.2rem;
      font-size: 0.9rem;
    }

    .quick-actions {
      gap: 0.45rem;
    }

    .quick-action-btn {
      font-size: 0.78rem;
      padding: 0.38rem 0.68rem;
    }

    .help-modal {
      padding: 0.85rem 0.82rem 0.78rem;
    }

    .leaderboard-filter-card {
      flex-direction: column;
      align-items: stretch;
    }

    .leaderboard-filter-btn,
    .leaderboard-inline-link {
      width: 100%;
      justify-content: center;
      text-align: center;
    }

    .student-actions {
      flex-direction: column-reverse;
    }

    .student-btn {
      width: 100%;
    }

    .help-line,
    .credits-line {
      font-size: 0.83rem;
      line-height: 1.38;
    }

    .credits {
      font-size: 0.7rem;
      margin-top: 0.2rem;
    }
  }
</style>
