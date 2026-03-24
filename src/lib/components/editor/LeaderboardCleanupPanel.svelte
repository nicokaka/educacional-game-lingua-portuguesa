<script>
  import { fetchModuleAttemptRoster, removeStudentFromModuleLeaderboard } from '../../supabase/attempts.js';

  let { moduleId, moduleTitle = 'Placar', onBack } = $props();

  let loading = $state(true);
  let error = $state('');
  let rows = $state([]);
  let removingKey = $state('');
  let rowError = $state('');

  $effect(() => {
    moduleId;
    loadRoster();
  });

  function getIdentityKey(row) {
    return row.classroom_id ? `${row.classroom_id}::${row.student_name}` : `legacy::${row.student_name}`;
  }

  function getClassroomLabel(row) {
    return row?.classroom_name || 'Turma antiga ou nao informada';
  }

  function formatCount(count) {
    return count === 1 ? '1 tentativa' : `${count} tentativas`;
  }

  function formatDate(value) {
    if (!value) return 'Data indisponivel';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Data indisponivel';
    return date.toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  }

  async function loadRoster() {
    loading = true;
    error = '';
    rowError = '';

    try {
      rows = await fetchModuleAttemptRoster(moduleId);
    } catch (err) {
      console.error('Erro ao carregar limpeza do placar:', err);
      error = err?.message || 'Nao foi possivel carregar os resultados do modulo.';
      rows = [];
    } finally {
      loading = false;
    }
  }

  async function removeFromLeaderboard(row) {
    const classroomLabel = getClassroomLabel(row);
    const confirmed = confirm(`Remover "${row.student_name}" do placar deste modulo?\nTurma: ${classroomLabel}`);
    if (!confirmed) return;

    removingKey = getIdentityKey(row);
    rowError = '';

    try {
      await removeStudentFromModuleLeaderboard(moduleId, row.student_name, row.classroom_id);
      rows = rows.filter((item) => getIdentityKey(item) !== removingKey);
    } catch (err) {
      console.error('Erro ao remover do placar:', err);
      rowError = err?.message || 'Nao foi possivel remover do placar.';
    } finally {
      removingKey = '';
    }
  }
</script>

<div class="cleanup-panel">
  <div class="panel-header">
    <button type="button" class="back-btn" onclick={onBack}>← Voltar</button>
    <div class="header-copy">
      <h2 class="panel-title">🧹 Limpar placar</h2>
      <p class="panel-subtitle">{moduleTitle}</p>
    </div>
  </div>

  {#if loading}
    <div class="state-card">
      <div class="spinner"></div>
      <p>Carregando resultados...</p>
    </div>
  {:else if error}
    <div class="state-card">
      <p class="error-text">⚠️ {error}</p>
      <button type="button" class="retry-btn" onclick={loadRoster}>Tentar novamente</button>
    </div>
  {:else if rows.length === 0}
    <div class="state-card">
      <p class="empty-title">Nao ha alunos no placar deste modulo.</p>
      <p class="empty-copy">Quando houver tentativas salvas, elas aparecerao aqui para limpeza manual.</p>
    </div>
  {:else}
    <div class="roster-list">
      {#each rows as row (getIdentityKey(row))}
        <div class="roster-card">
          <div class="roster-copy">
            <p class="student-name">{row.student_name}</p>
            <p class="classroom-name">{getClassroomLabel(row)}</p>
            <div class="roster-meta">
              <span>{formatCount(row.attempt_count)}</span>
              <span>Ultima tentativa: {formatDate(row.last_attempt_at)}</span>
            </div>
          </div>

          <button
            type="button"
            class="remove-btn"
            onclick={() => removeFromLeaderboard(row)}
            disabled={removingKey === getIdentityKey(row)}
          >
            {removingKey === getIdentityKey(row) ? 'Removendo...' : 'Remover do placar'}
          </button>
        </div>
      {/each}
    </div>
  {/if}

  {#if rowError}
    <p class="error-text">{rowError}</p>
  {/if}
</div>

<style>
  .cleanup-panel {
    width: min(920px, 100%);
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .panel-header {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .header-copy {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .panel-title {
    font-size: 1.45rem;
    font-weight: 800;
    color: var(--color-text);
  }

  .panel-subtitle {
    color: var(--color-muted);
    font-size: 0.92rem;
  }

  .roster-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .roster-card,
  .state-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: 1rem;
  }

  .roster-card {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: center;
  }

  .roster-copy {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .student-name {
    font-size: 1rem;
    font-weight: 700;
    color: var(--color-text);
  }

  .classroom-name {
    color: var(--color-muted);
    font-size: 0.84rem;
  }

  .roster-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1rem;
    color: var(--color-muted);
    font-size: 0.82rem;
  }

  .back-btn,
  .retry-btn,
  .remove-btn {
    border-radius: var(--radius-md);
    font-weight: 700;
    transition: transform var(--transition-fast), border-color var(--transition-fast), background var(--transition-fast);
  }

  .back-btn,
  .retry-btn {
    padding: 0.7rem 1rem;
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-text);
  }

  .remove-btn {
    padding: 0.7rem 1rem;
    border: 1px solid rgba(248, 113, 113, 0.34);
    background: rgba(127, 29, 29, 0.18);
    color: #fecaca;
    white-space: nowrap;
  }

  .back-btn:hover,
  .retry-btn:hover,
  .remove-btn:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  .state-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.85rem;
    text-align: center;
  }

  .empty-title {
    color: var(--color-text);
    font-size: 1rem;
    font-weight: 700;
  }

  .empty-copy,
  .error-text {
    color: var(--color-muted);
  }

  .error-text {
    color: #fecaca;
  }

  .spinner {
    width: 34px;
    height: 34px;
    border: 3px solid var(--color-border);
    border-top-color: var(--color-primary);
    border-radius: 50%;
    animation: spin 0.9s linear infinite;
  }

  @media (max-width: 720px) {
    .roster-card {
      flex-direction: column;
      align-items: stretch;
    }

    .remove-btn,
    .back-btn,
    .retry-btn {
      width: 100%;
    }
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
