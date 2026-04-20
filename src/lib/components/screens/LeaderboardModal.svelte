<script>
  import { MODULE_LEADERBOARD_WINDOW_HOURS } from '../../supabase/attempts.js';

  let {
    show = false,
    module = null,
    classroomId = '',
    classroomName = '',
    studentName = '',
    period = 'today',
    loading = false,
    error = '',
    rankedEntries = [],
    currentStudentLeaderboard = null,
    attemptCount = 0,
    onclose,
    onchangefilter,
    onchangeperiod,
    onretry
  } = $props();

  let listContainer = $state();
  let expandedEntryId = $state('');

  $effect(() => {
    // Quando a lista terminar de carregar e tivermos as entradas, rolar até o aluno
    if (show && !loading && rankedEntries.length > 0 && currentStudentLeaderboard && listContainer) {
      setTimeout(() => {
        const studentRow = listContainer?.querySelector('.current-student-row');
        if (studentRow) {
          studentRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  });

  function stopMouseDown(event) {
    event.stopPropagation();
  }

  function toggleExpand(id) {
    if (expandedEntryId === id) {
      expandedEntryId = '';
    } else {
      expandedEntryId = id;
    }
  }

  function getDuration(attempt) {
    if (!attempt.finished_at || !attempt.created_at) return '—';
    const ms = new Date(attempt.finished_at) - new Date(attempt.created_at);
    if (ms < 0 || ms > 3600000) return '—'; // > 1h = dado inválido
    const totalSeconds = Math.round(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }

  function getPeriodLabel(p) {
    if (p === 'today') return 'Hoje';
    if (p === '7d') return 'Últimos 7 dias';
    return `Últimas ${MODULE_LEADERBOARD_WINDOW_HOURS}h`;
  }

  let top3 = $derived(rankedEntries.slice(0, 3));

  function isCurrentStudent(entry) {
    return currentStudentLeaderboard && currentStudentLeaderboard.id === entry.id;
  }
</script>

{#if show}
  <div class="help-overlay" role="presentation" onmousedown={onclose}>
    <div
      class="help-modal leaderboard-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Placar do módulo"
      tabindex="-1"
      onmousedown={stopMouseDown}
    >
      <div class="help-header">
        <h2 class="help-title">🏆 Placar de {module?.title || 'Módulo'}</h2>
        <button type="button" class="help-close" onclick={onclose} aria-label="Fechar">x</button>
      </div>

      {#if module}
        <div class="leaderboard-intro">
          <div class="leaderboard-summary-row">
            <div class="summary-pills">
              <span class="pill class-pill">{classroomName || 'Todas as turmas'}</span>
              <span class="pill count-pill">{attemptCount} tentativas</span>
            </div>
            <button
              type="button"
              class="leaderboard-filter-btn"
              onclick={onchangefilter}
            >
              Trocar filtro de turma
            </button>
          </div>
          <div class="period-toggles">
            <button 
              type="button" 
              class="period-toggle" 
              class:active={period === 'today'} 
              onclick={() => onchangeperiod('today')}
            >
              Hoje
            </button>
            <button 
              type="button" 
              class="period-toggle" 
              class:active={period === '12h'} 
              onclick={() => onchangeperiod('12h')}
            >
              12h
            </button>
            <button 
              type="button" 
              class="period-toggle" 
              class:active={period === '7d'} 
              onclick={() => onchangeperiod('7d')}
            >
              7 Dias
            </button>
          </div>
        </div>
      {/if}

      {#if loading}
        <div class="loading-state leaderboard-state">
          <div class="spinner"></div>
          <p>Calculando posições...</p>
        </div>
      {:else if error}
        <div class="error-state leaderboard-state">
          <p class="error-text">⚠️ {error}</p>
          <button type="button" class="retry-btn" onclick={onretry}>Tentar novamente</button>
        </div>
      {:else if rankedEntries.length === 0}
        <div class="empty-state leaderboard-state">
          <p class="empty-text">Nenhuma tentativa encontrada.</p>
          <p class="empty-hint">Ninguém jogou neste período ainda.</p>
        </div>
      {:else}
        <div class="leaderboard-content">
          <!-- PODIUM FIXO -->
          <div class="podium-section">
            {#if top3[1]}
              <div class="podium-spot rank-2">
                <div class="podium-badge">🥈</div>
                <div class="podium-name" class:highlight={isCurrentStudent(top3[1])}>
                  {top3[1].student_name}
                </div>
                <div class="podium-score">{Math.round(top3[1].percentage * 100)}%</div>
                <div class="podium-points">{top3[1].score}/{top3[1].max_score}</div>
              </div>
            {/if}

            {#if top3[0]}
              <div class="podium-spot rank-1">
                <div class="podium-badge">🥇</div>
                <div class="podium-name" class:highlight={isCurrentStudent(top3[0])}>
                  👑 {top3[0].student_name}
                </div>
                <div class="podium-score">{Math.round(top3[0].percentage * 100)}%</div>
                <div class="podium-points">{top3[0].score}/{top3[0].max_score}</div>
              </div>
            {/if}

            {#if top3[2]}
              <div class="podium-spot rank-3">
                <div class="podium-badge">🥉</div>
                <div class="podium-name" class:highlight={isCurrentStudent(top3[2])}>
                  {top3[2].student_name}
                </div>
                <div class="podium-score">{Math.round(top3[2].percentage * 100)}%</div>
                <div class="podium-points">{top3[2].score}/{top3[2].max_score}</div>
              </div>
            {/if}
          </div>

          <!-- LISTA SCROLLÁVEL -->
          <div class="list-section" bind:this={listContainer}>
            {#each rankedEntries as entry, index}
              {@const isMe = isCurrentStudent(entry)}
              {@const pct = Math.round(entry.percentage * 100)}
              {@const barColor = pct >= 80 ? 'var(--color-correct)' : pct >= 50 ? 'var(--color-warning)' : 'var(--color-wrong)'}
              {@const isExpanded = expandedEntryId === entry.id}
              
              <button 
                class="list-row {isMe ? 'current-student-row' : ''} {isExpanded ? 'expanded' : ''}" 
                onclick={() => toggleExpand(entry.id)}
              >
                <div class="row-main">
                  <div class="row-rank">
                    #{index + 1}
                  </div>
                  <div class="row-info">
                    <div class="row-name">
                      {isMe ? '⭐ VOCÊ' : entry.student_name}
                      {#if !entry.completed}
                        <span class="tag-abandoned">Abandonou</span>
                      {/if}
                    </div>
                    {#if !classroomId && entry.classroom_name}
                      <div class="row-class">{entry.classroom_name}</div>
                    {/if}
                  </div>
                  <div class="row-stats-quick">
                    <span class="quick-pct" style="color: {barColor}">{pct}%</span>
                    <span class="quick-time">⏱ {getDuration(entry)}</span>
                  </div>
                </div>

                <div class="row-progress-track">
                  <div class="row-progress-fill" style="width: {pct}%; background-color: {barColor};"></div>
                </div>

                {#if isExpanded}
                  <div class="row-details">
                    <div class="detail-item">
                      <span class="detail-val">{entry.score}/{entry.max_score}</span>
                      <span class="detail-lbl">Pontos</span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-val">{entry.wrong_answers || 0}</span>
                      <span class="detail-lbl">Erros</span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-val">{entry.hints_used || 0}×</span>
                      <span class="detail-lbl">Bizu</span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-val">🔥 {entry.max_streak || 0}</span>
                      <span class="detail-lbl">Sequência</span>
                    </div>
                  </div>
                {/if}
              </button>
            {/each}

            {#if !currentStudentLeaderboard && studentName}
              <div class="row-not-found">
                <p>📍 Você ainda não jogou neste período/turma.</p>
              </div>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .help-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  }

  .leaderboard-modal {
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    width: 100%;
    max-width: 600px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 10px 40px rgba(0,0,0,0.5);
    overflow: hidden;
  }

  .help-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.2rem 1.5rem;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-surface);
  }

  .help-title {
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--color-text);
  }

  .help-close {
    background: rgba(255, 255, 255, 0.1);
    border: none;
    color: var(--color-muted);
    width: 32px;
    height: 32px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--transition-fast);
  }

  .help-close:hover {
    background: rgba(248, 113, 113, 0.2);
    color: var(--color-wrong);
  }

  .leaderboard-intro {
    padding: 1rem 1.5rem;
    background: rgba(15, 23, 42, 0.5);
    border-bottom: 1px solid var(--color-border);
  }

  .leaderboard-summary-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.8rem;
    margin-bottom: 0.8rem;
  }

  .summary-pills {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .pill {
    padding: 0.2rem 0.6rem;
    border-radius: 999px;
    font-size: 0.8rem;
    font-weight: 600;
  }

  .class-pill { background: rgba(56, 189, 248, 0.2); color: #bae6fd; }
  .count-pill { background: rgba(148, 163, 184, 0.2); color: #cbd5e1; }

  .leaderboard-filter-btn {
    padding: 0.4rem 0.8rem;
    background: transparent;
    border: 1px solid var(--color-primary);
    color: var(--color-primary);
    border-radius: var(--radius-md);
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .leaderboard-filter-btn:hover {
    background: var(--color-primary);
    color: white;
  }

  .period-toggles {
    display: flex;
    gap: 0.5rem;
    background: rgba(0, 0, 0, 0.2);
    padding: 0.3rem;
    border-radius: var(--radius-lg);
  }

  .period-toggle {
    flex: 1;
    background: transparent;
    border: none;
    color: var(--color-muted);
    font-size: 0.85rem;
    font-weight: 600;
    padding: 0.4rem 0;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .period-toggle:hover {
    color: var(--color-text);
    background: rgba(255, 255, 255, 0.05);
  }

  .period-toggle.active {
    background: rgba(139, 92, 246, 0.3);
    color: #c4b5fd;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  }

  .leaderboard-content {
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* PODIUM */
  .podium-section {
    display: flex;
    align-items: flex-end;
    justify-content: center;
    gap: 0.5rem;
    padding: 1.5rem 1rem;
    background: linear-gradient(to bottom, rgba(139, 92, 246, 0.05), rgba(15, 23, 42, 0.2));
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .podium-spot {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 30%;
    padding: 1rem 0.5rem;
    border-radius: 12px 12px 0 0;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-bottom: none;
    box-shadow: 0 -4px 12px rgba(0,0,0,0.2);
    position: relative;
    animation: slideUp 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) backwards;
  }

  .rank-1 { height: 140px; border-color: rgba(250, 204, 21, 0.5); z-index: 3; animation-delay: 0.2s; background: linear-gradient(to bottom, rgba(250,204,21,0.1), var(--color-surface)); }
  .rank-2 { height: 110px; border-color: rgba(148, 163, 184, 0.5); z-index: 2; animation-delay: 0.1s; }
  .rank-3 { height: 95px; border-color: rgba(180, 120, 60, 0.5); z-index: 1; animation-delay: 0s; }

  @keyframes slideUp {
    from { transform: translateY(50px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }

  .podium-badge {
    font-size: 1.8rem;
    margin-top: -1.8rem;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
  }

  .podium-name {
    font-size: 0.85rem;
    font-weight: 700;
    text-align: center;
    margin-top: 0.5rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: 100%;
    color: var(--color-text);
  }

  .podium-name.highlight {
    color: #fde047;
  }

  .podium-score {
    font-size: 1.4rem;
    font-weight: 800;
    margin-top: 0.2rem;
  }

  .rank-1 .podium-score { color: #facc15; }
  .rank-2 .podium-score { color: #cbd5e1; }
  .rank-3 .podium-score { color: #fdba74; }

  .podium-points {
    font-size: 0.75rem;
    color: var(--color-muted);
  }

  /* LISTA SCROLLÁVEL */
  .list-section {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .list-row {
    background: var(--color-surface);
    border: 1px solid transparent;
    border-radius: var(--radius-md);
    padding: 0.8rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    cursor: pointer;
    transition: all var(--transition-fast);
    text-align: left;
  }

  .list-row:hover {
    background: var(--color-surface-hover);
    border-color: rgba(148, 163, 184, 0.2);
  }

  .current-student-row {
    background: rgba(139, 92, 246, 0.1);
    border: 1px solid rgba(139, 92, 246, 0.4);
  }

  .current-student-row:hover {
    background: rgba(139, 92, 246, 0.15);
    border-color: rgba(139, 92, 246, 0.6);
  }

  .row-main {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .row-rank {
    font-size: 1.1rem;
    font-weight: 800;
    color: var(--color-muted);
    min-width: 2rem;
  }

  .current-student-row .row-rank {
    color: var(--color-primary);
  }

  .row-info {
    flex: 1;
    overflow: hidden;
  }

  .row-name {
    font-size: 0.95rem;
    font-weight: 700;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .row-class {
    font-size: 0.75rem;
    color: var(--color-muted);
  }

  .tag-abandoned {
    font-size: 0.65rem;
    padding: 0.1rem 0.4rem;
    background: rgba(248, 113, 113, 0.2);
    color: #fca5a5;
    border-radius: 4px;
    font-weight: 600;
  }

  .row-stats-quick {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }

  .quick-pct {
    font-size: 1.1rem;
    font-weight: 800;
  }

  .quick-time {
    font-size: 0.75rem;
    color: var(--color-muted);
  }

  .row-progress-track {
    width: 100%;
    height: 4px;
    background: rgba(0,0,0,0.3);
    border-radius: 2px;
    overflow: hidden;
  }

  .row-progress-fill {
    height: 100%;
    transition: width 1s ease-out;
  }

  .row-details {
    display: flex;
    justify-content: space-around;
    padding-top: 0.8rem;
    border-top: 1px dashed rgba(148, 163, 184, 0.2);
    animation: fadeIn 0.3s ease;
  }

  .detail-item {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .detail-val {
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--color-text);
  }

  .detail-lbl {
    font-size: 0.7rem;
    color: var(--color-muted);
    text-transform: uppercase;
  }

  .row-not-found {
    padding: 1rem;
    text-align: center;
    color: var(--color-muted);
    font-size: 0.9rem;
    background: rgba(255,255,255,0.02);
    border-radius: var(--radius-md);
    margin-top: 0.5rem;
  }

  /* LOADING & ERROR */
  .leaderboard-state {
    padding: 3rem 1rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .spinner {
    width: 30px;
    height: 30px;
    border: 3px solid var(--color-border);
    border-top-color: var(--color-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  @media (max-width: 600px) {
    .podium-name { font-size: 0.75rem; }
    .podium-score { font-size: 1.1rem; }
    .row-details { flex-wrap: wrap; gap: 0.5rem; }
    .detail-item { width: 45%; }
  }
</style>
