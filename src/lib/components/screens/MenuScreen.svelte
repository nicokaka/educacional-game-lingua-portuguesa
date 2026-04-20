<script>
  import { navigate } from '../../router.svelte.js';
  import { fetchModules } from '../../supabase/modules.js';
  import { fetchModuleLeaderboard, MODULE_LEADERBOARD_WINDOW_HOURS } from '../../supabase/attempts.js';
  import { fetchActiveClassrooms } from '../../supabase/classrooms.js';
  import {
    STUDENT_NAME_KEY,
    CLASSROOM_ID_KEY,
    CLASSROOM_NAME_KEY,
    STUDENT_ACCESS_ID_KEY,
    getSavedStudentName,
    getSavedClassroomId,
    getSavedClassroomName,
    getSavedStudentAccessId,
    getRecentStudentProfiles,
    rememberStudentProfile,
    activateStudentProfile,
  } from '../../studentIdentity.js';
  const ALL_CLASSROOMS_VALUE = '__all__';

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
  let reviewProfiles = $state([]);
  let selectedReviewAccessId = $state('');
  let showLeaderboardModal = $state(false);
  let leaderboardLoading = $state(false);
  let leaderboardError = $state('');
  let leaderboardModule = $state(null);
  let pendingLeaderboardModule = $state(null);
  let leaderboardPeriod = $state('today');
  let leaderboardClassroomId = $state('');
  let leaderboardClassroomName = $state('');
  let leaderboardStudentName = $state('');
  let leaderboardAttemptCount = $state(0);
  let leaderboardTop3 = $state([]);
  let currentStudentLeaderboard = $state(null);
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
  $effect(() => {
    load().then(() => {
      if (typeof window !== 'undefined') {
        const hash = window.location.hash;
        const match = hash.match(/\?play=([^&]+)/);
        if (match && match[1]) {
          const modId = match[1];
          window.history.replaceState(null, '', window.location.pathname + '#/');
          playModule(modId);
        }
      }
    });
  });

  $effect(() => {
    if (!showStudentModal) return;
    const focusTimer = setTimeout(() => {
      studentNameInput?.focus();
    }, 0);

    return () => clearTimeout(focusTimer);
  });

  $effect(() => {
    if (!showStudentModal || studentModalMode !== 'reviews') {
      reviewProfiles = [];
      selectedReviewAccessId = '';
      return;
    }

    reviewProfiles = getRecentStudentProfiles(selectedClassroomId);
    const savedAccessId = getSavedStudentAccessId();
    if (!selectedReviewAccessId && savedAccessId && reviewProfiles.some((profile) => profile.accessId === savedAccessId)) {
      selectedReviewAccessId = savedAccessId;
    }
  });

  function openStudentModal(moduleId = '', mode = 'play') {
    selectedModuleId = moduleId;
    studentModalMode = mode;
    studentName = getSavedStudentName();
    const savedClassroomId = getSavedClassroomId();
    selectedClassroomId = mode === 'leaderboard'
      ? (leaderboardClassroomId || (classrooms.some((classroom) => classroom.id === savedClassroomId) ? savedClassroomId : ALL_CLASSROOMS_VALUE))
      : (classrooms.some((classroom) => classroom.id === savedClassroomId) ? savedClassroomId : classrooms[0]?.id || '');
    studentNameError = '';
    selectedReviewAccessId = mode === 'reviews' ? getSavedStudentAccessId() : '';
    showStudentModal = true;
  }

  function closeStudentModal() {
    showStudentModal = false;
    selectedModuleId = '';
    studentModalMode = 'play';
    selectedClassroomId = '';
    studentNameError = '';
    pendingLeaderboardModule = null;
    reviewProfiles = [];
    selectedReviewAccessId = '';
  }

  function playModule(id) {
    openStudentModal(id, 'play');
  }

  function openStudentReviews() {
    if ((getSavedStudentAccessId().trim() || getSavedStudentName().trim()) && getSavedClassroomId().trim()) {
      navigate('/reviews');
      return;
    }

    openStudentModal('', 'reviews');
  }

  function selectReviewProfile(profile) {
    selectedClassroomId = profile.classroomId;
    studentName = profile.studentName;
    selectedReviewAccessId = profile.accessId;
    studentNameError = '';
    activateStudentProfile(profile);
  }

  function confirmStudentName(event) {
    event?.preventDefault?.();

    const trimmedName = studentName.trim();
    const selectedClassroom = classrooms.find((classroom) => classroom.id === selectedClassroomId);
    const modalMode = studentModalMode;
    const useAllClassrooms = modalMode === 'leaderboard' && selectedClassroomId === ALL_CLASSROOMS_VALUE;

    if (classroomsError) {
      studentNameError = classroomsError;
      return;
    }

    if (classrooms.length === 0) {
      studentNameError = 'Nenhuma turma esta disponivel agora. Peça ao professor para cadastrar uma turma.';
      return;
    }

    if (!useAllClassrooms && !selectedClassroom) {
      studentNameError = 'Escolha sua turma para continuar.';
      return;
    }

    if (modalMode !== 'leaderboard' && !trimmedName) {
      studentNameError = 'Digite seu nome para continuar.';
      return;
    }

    if (typeof window !== 'undefined') {
      if (!useAllClassrooms && selectedClassroom) {
        if (modalMode === 'leaderboard') {
          window.sessionStorage.setItem(CLASSROOM_ID_KEY, selectedClassroom.id);
          window.sessionStorage.setItem(CLASSROOM_NAME_KEY, selectedClassroom.name);
        } else if (modalMode === 'play') {
          rememberStudentProfile({
            studentName: trimmedName,
            classroomId: selectedClassroom.id,
            classroomName: selectedClassroom.name,
          });
        } else {
          window.sessionStorage.setItem(CLASSROOM_ID_KEY, selectedClassroom.id);
          window.sessionStorage.setItem(CLASSROOM_NAME_KEY, selectedClassroom.name);
          if (!selectedReviewAccessId) {
            window.sessionStorage.removeItem(STUDENT_ACCESS_ID_KEY);
          }
        }
      }

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
      void loadLeaderboard(leaderboardToOpen, {
        classroomId: useAllClassrooms ? '' : selectedClassroom?.id || '',
        classroomName: useAllClassrooms ? 'Todas as turmas' : selectedClassroom?.name || '',
        studentName: trimmedName,
        period: 'today',
      });
      return;
    }

    navigate(`/play/${moduleId}`);
  }

  function openEditor() {
    navigate('/editor');
  }

  async function loadLeaderboard(moduleData, filter = {}) {
    showLeaderboardModal = true;
    leaderboardLoading = true;
    leaderboardError = '';
    leaderboardModule = moduleData;
    leaderboardPeriod = filter?.period === '12h' ? '12h' : 'today';
    leaderboardClassroomId = filter?.classroomId ?? getSavedClassroomId().trim();
    leaderboardClassroomName = filter?.classroomName ?? (getSavedClassroomName().trim() || 'Todas as turmas');
    leaderboardStudentName = filter?.studentName ?? getSavedStudentName().trim();
    leaderboardAttemptCount = 0;
    leaderboardTop3 = [];
    currentStudentLeaderboard = null;

    try {
      const viewerClassroomId = leaderboardClassroomId || getSavedClassroomId().trim();
      const result = await fetchModuleLeaderboard(
        moduleData.id,
        leaderboardStudentName,
        viewerClassroomId,
        {
          period: leaderboardPeriod,
          filterClassroomId: leaderboardClassroomId,
        }
      );
      leaderboardTop3 = result.top3;
      leaderboardAttemptCount = result.attemptCount || 0;
      currentStudentLeaderboard = result.currentStudent;
    } catch (error) {
      leaderboardError = error.message;
    } finally {
      leaderboardLoading = false;
    }
  }

  async function openLeaderboard(moduleData) {
    const classroomId = getSavedClassroomId().trim();
    const classroomName = getSavedClassroomName().trim();
    const studentName = getSavedStudentName().trim();

    if (!classroomId) {
      pendingLeaderboardModule = moduleData;
      openStudentModal('', 'leaderboard');
      return;
    }

    await loadLeaderboard(moduleData, {
      classroomId,
      classroomName,
      studentName,
      period: 'today',
    });
  }

  function closeLeaderboard() {
    showLeaderboardModal = false;
    leaderboardLoading = false;
    leaderboardError = '';
    leaderboardModule = null;
    leaderboardPeriod = 'today';
    leaderboardClassroomId = '';
    leaderboardClassroomName = '';
    leaderboardStudentName = '';
    leaderboardAttemptCount = 0;
    leaderboardTop3 = [];
    currentStudentLeaderboard = null;
  }

  function retryLeaderboard() {
    if (!leaderboardModule) return;
    loadLeaderboard(leaderboardModule, {
      classroomId: leaderboardClassroomId,
      classroomName: leaderboardClassroomName,
      studentName: leaderboardStudentName,
      period: leaderboardPeriod,
    });
  }

  function reopenLeaderboardStudentModal() {
    if (!leaderboardModule) return;
    const currentModule = leaderboardModule;
    closeLeaderboard();
    pendingLeaderboardModule = currentModule;
    openStudentModal('', 'leaderboard');
  }

  function openHelp(section = 'instructions') {
    helpSection = section;
    showHelp = true;
  }

  function closeHelp() {
    showHelp = false;
  }

  function getAttemptStatusLabel(attempt) {
    if (!attempt?.finished_at) return 'Em andamento';
    return attempt.completed ? 'Concluiu' : 'Nao concluiu';
  }

  function getLeaderboardPeriodLabel(period) {
    return period === 'today' ? 'Hoje' : `Ultimas ${MODULE_LEADERBOARD_WINDOW_HOURS}h`;
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
    <div class="game-title-wrap">
      <div class="title-flame title-flame-left" aria-hidden="true"></div>
      <div class="title-flame title-flame-center" aria-hidden="true"></div>
      <div class="title-flame title-flame-right" aria-hidden="true"></div>
      <h1 class="game-title">
        <span class="title-alquimia">Alquimia</span>&nbsp;<span class="title-verbal">Verbal</span>
      </h1>
    </div>
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
              ? 'Ver placar recente'
              : 'Antes de jogar'}
        </h2>
          <button type="button" class="help-close" onclick={closeStudentModal} aria-label="Fechar">x</button>
        </div>

        <p class="student-copy">
          {studentModalMode === 'reviews'
            ? 'Escolha sua turma e use seu nome. Se este aparelho já foi usado antes, você pode tocar no seu perfil salvo para evitar erro de digitação.'
            : studentModalMode === 'leaderboard'
              ? 'Escolha a turma. O nome é opcional.'
              : 'Digite seu nome para entrar no módulo.'}
        </p>

        <div class="student-field">
          <label class="field-label" for="student-classroom-select">Turma</label>
          <select
            id="student-classroom-select"
            class="student-input student-select"
            bind:value={selectedClassroomId}
            disabled={classrooms.length === 0}
          >
            {#if studentModalMode === 'leaderboard'}
              <option value={ALL_CLASSROOMS_VALUE}>Todas as turmas</option>
            {/if}
            <option value="" disabled selected={selectedClassroomId === ''}>Selecione sua turma</option>
            {#each classrooms as classroom (classroom.id)}
              <option value={classroom.id}>{classroom.name}</option>
            {/each}
          </select>
          {#if classrooms.length === 0}
            <p class="student-helper error-helper">
              {classroomsError || 'Nenhuma turma cadastrada ainda. Peça ao professor para criar uma turma.'}
            </p>
            <button type="button" class="retry-classrooms-btn" onclick={() => { closeStudentModal(); load(); }}>
              🔄 Tentar carregar turmas novamente
            </button>
          {/if}
        </div>

        {#if studentModalMode === 'reviews' && selectedClassroomId && reviewProfiles.length > 0}
          <div class="student-field">
            <label class="field-label">Perfis usados neste aparelho</label>
            <div class="student-profile-list">
              {#each reviewProfiles as profile (profile.accessId)}
                <button
                  type="button"
                  class:active={selectedReviewAccessId === profile.accessId}
                  class="student-profile-chip"
                  onclick={() => selectReviewProfile(profile)}
                >
                  {profile.studentName}
                </button>
              {/each}
            </div>
            <p class="student-helper">Se voce esqueceu como escreveu seu nome antes, toque em um perfil salvo da turma.</p>
          </div>
        {/if}

        <div class="student-field">
          <label class="field-label" for="student-name-input">
            {studentModalMode === 'leaderboard' ? 'Nome do aluno (opcional)' : 'Nome do aluno'}
          </label>
          <input
            id="student-name-input"
            class="student-input"
            bind:value={studentName}
            bind:this={studentNameInput}
            oninput={() => {
              if (studentModalMode === 'reviews') {
                selectedReviewAccessId = '';
                if (typeof window !== 'undefined') {
                  window.sessionStorage.removeItem(STUDENT_ACCESS_ID_KEY);
                }
              }
            }}
            placeholder="Ex.: Maria Souza"
            maxlength="80"
          />
          {#if studentModalMode === 'play'}
            <p class="student-helper">Use nome e sobrenome para evitar confusão com colegas de mesmo nome. Ex.: <em>Maria Souza</em></p>
          {:else if studentModalMode === 'reviews'}
            <p class="student-helper">As correções ficam mais fáceis de encontrar quando você usa sempre o mesmo nome.</p>
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
        <h2 class="help-title">🏆 Placar recente</h2>
        <button type="button" class="help-close" onclick={closeLeaderboard} aria-label="Fechar">x</button>
      </div>

      {#if leaderboardModule}
        <div class="leaderboard-intro">
          <p class="leaderboard-module-title">{leaderboardModule.title}</p>
          <div class="leaderboard-summary-row">
            <p class="leaderboard-summary-line">
              {getLeaderboardPeriodLabel(leaderboardPeriod)} • {leaderboardClassroomName || 'Todas as turmas'} • {leaderboardAttemptCount} {leaderboardAttemptCount === 1 ? 'tentativa' : 'tentativas'}
            </p>
            <button
              type="button"
              class="leaderboard-filter-btn"
              onclick={reopenLeaderboardStudentModal}
            >
              Trocar filtro
            </button>
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
          <p class="empty-hint">Nao foi possivel atualizar este placar agora. Tente novamente ou troque o filtro.</p>
          <button type="button" class="retry-btn" onclick={retryLeaderboard}>Tentar novamente</button>
        </div>
      {:else if leaderboardTop3.length === 0}
        <div class="empty-state leaderboard-state">
          <p class="empty-text">Nenhuma tentativa encontrada para este placar.</p>
          <p class="empty-hint">
            {leaderboardClassroomId
              ? `Nenhuma tentativa encontrada para esta turma ${leaderboardPeriod === 'today' ? 'hoje' : `nas ultimas ${MODULE_LEADERBOARD_WINDOW_HOURS} horas`}.`
              : `Nenhuma tentativa encontrada neste modulo ${leaderboardPeriod === 'today' ? 'hoje' : `nas ultimas ${MODULE_LEADERBOARD_WINDOW_HOURS} horas`}.`}
          </p>
          {#if leaderboardClassroomId}
            <p class="empty-hint">Tente trocar para "Todas as turmas".</p>
          {/if}
          <button type="button" class="leaderboard-filter-btn" onclick={reopenLeaderboardStudentModal}>Trocar filtro</button>
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
                  <span class="leaderboard-stat">{getAttemptStatusLabel(entry)}</span>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}

      {#if leaderboardStudentName}
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
                <span class="leaderboard-stat">{getAttemptStatusLabel(currentStudentLeaderboard)}</span>
              </div>
            </div>
          </div>
        {:else}
          <div class="leaderboard-empty-card">
            <p class="empty-hint">
              {leaderboardClassroomId
                ? `Voce ainda nao tem tentativa registrada para ${leaderboardClassroomName} ${leaderboardPeriod === 'today' ? 'hoje' : `nas ultimas ${MODULE_LEADERBOARD_WINDOW_HOURS} horas`}.`
                : `Voce ainda nao tem tentativa registrada neste modulo ${leaderboardPeriod === 'today' ? 'hoje' : `nas ultimas ${MODULE_LEADERBOARD_WINDOW_HOURS} horas`}.`}
            </p>
          </div>
        {/if}
      {/if}
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

  .game-title-wrap {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.3rem 1.2rem 0.55rem;
    isolation: isolate;
  }

  .game-title {
    font-family: var(--font-title);
    font-size: clamp(2.5rem, 8vw, 4rem); /* Aumentei max para 4rem pra Macondo brilhar */
    font-weight: 400; /* Macondo não precisa de 800 */
    line-height: 1;
    letter-spacing: -0.02em;
    position: relative;
    z-index: 2;
    text-shadow:
      0 2px 10px rgba(15, 23, 42, 0.85),
      0 0 18px rgba(15, 23, 42, 0.32);
  }

  .title-alquimia { color: var(--color-primary); }
  .title-verbal { color: var(--color-correct); }

  .title-flame {
    position: absolute;
    z-index: 1;
    pointer-events: none;
    filter: blur(18px);
    opacity: 0.74;
    mix-blend-mode: screen;
    animation: title-flame-wave 4.8s ease-in-out infinite;
  }

  .title-flame-left {
    width: 180px;
    height: 74px;
    left: 4%;
    top: 10%;
    --flame-base-transform: rotate(-8deg);
    transform: var(--flame-base-transform);
    background: radial-gradient(circle at 50% 60%, rgba(251, 191, 36, 0.42), rgba(245, 158, 11, 0.14) 55%, transparent 78%);
  }

  .title-flame-center {
    width: 240px;
    height: 96px;
    left: 50%;
    top: -6%;
    --flame-base-transform: translateX(-50%);
    transform: var(--flame-base-transform);
    background:
      radial-gradient(circle at 50% 68%, rgba(250, 204, 21, 0.26), transparent 62%),
      radial-gradient(circle at 50% 38%, rgba(96, 165, 250, 0.18), transparent 68%);
    animation-delay: -1.4s;
  }

  .title-flame-right {
    width: 170px;
    height: 72px;
    right: 5%;
    top: 8%;
    --flame-base-transform: rotate(7deg);
    transform: var(--flame-base-transform);
    background: radial-gradient(circle at 50% 60%, rgba(74, 222, 128, 0.34), rgba(56, 189, 248, 0.12) 58%, transparent 80%);
    animation-delay: -2.6s;
  }

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

  .leaderboard-summary-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.65rem;
  }

  .leaderboard-summary-line {
    color: var(--color-muted);
    font-size: 0.9rem;
    line-height: 1.45;
  }

  .leaderboard-filter-btn {
    border-radius: 999px;
    border: 1px solid rgba(148, 163, 184, 0.24);
    background: transparent;
    color: var(--color-muted);
    padding: 0.38rem 0.7rem;
    font-size: 0.76rem;
    font-weight: 700;
    transition: all var(--transition-fast);
    white-space: nowrap;
  }

  .leaderboard-filter-btn:hover {
    transform: translateY(-1px);
    border-color: rgba(148, 163, 184, 0.42);
    color: var(--color-text);
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

  .student-copy {
    font-size: 0.92rem;
    color: var(--color-muted);
    line-height: 1.45;
    margin-bottom: 0.9rem;
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

  .student-helper.error-helper {
    color: #fca5a5;
  }

  .retry-classrooms-btn {
    margin-top: 0.4rem;
    padding: 0.45rem 0.9rem;
    border: 1px solid rgba(251, 146, 60, 0.4);
    border-radius: 8px;
    background: rgba(251, 146, 60, 0.08);
    color: #fdba74;
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s ease, border-color 0.2s ease;
  }

  .retry-classrooms-btn:hover {
    background: rgba(251, 146, 60, 0.16);
    border-color: rgba(251, 146, 60, 0.7);
  }

  .student-profile-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.55rem;
  }

  .student-profile-chip {
    border: 1px solid rgba(56, 189, 248, 0.28);
    border-radius: 999px;
    background: rgba(15, 23, 42, 0.52);
    color: #dbeafe;
    padding: 0.5rem 0.85rem;
    font-size: 0.84rem;
    font-weight: 700;
    transition: border-color var(--transition-fast), transform var(--transition-fast), background var(--transition-fast);
  }

  .student-profile-chip:hover,
  .student-profile-chip.active {
    border-color: rgba(56, 189, 248, 0.7);
    background: rgba(56, 189, 248, 0.16);
    transform: translateY(-1px);
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

  @keyframes title-flame-wave {
    0%, 100% {
      transform: var(--flame-base-transform) translateY(0) scale(1);
      opacity: 0.62;
    }
    50% {
      transform: var(--flame-base-transform) translateY(-5px) scale(1.08);
      opacity: 0.9;
    }
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

    .game-title-wrap {
      padding: 0.18rem 0.7rem 0.35rem;
    }

    .title-flame-left,
    .title-flame-right {
      width: 120px;
      height: 56px;
    }

    .title-flame-center {
      width: 180px;
      height: 74px;
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

    .leaderboard-summary-row {
      align-items: stretch;
      flex-direction: column;
    }

    .leaderboard-filter-btn {
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
