<script>
  import {
    createClassroom,
    deleteClassroom,
    fetchAllClassrooms,
    setClassroomActive,
    updateClassroom,
  } from '../../supabase/classrooms.js';

  let { onBack } = $props();

  let classrooms = $state([]);
  let loading = $state(true);
  let error = $state('');
  let newClassroomName = $state('');
  let formError = $state('');
  let savingNew = $state(false);
  let editingId = $state('');
  let editingName = $state('');
  let rowError = $state('');
  let rowSavingId = $state('');

  async function loadClassrooms() {
    loading = true;
    error = '';
    rowError = '';

    try {
      classrooms = await fetchAllClassrooms();
    } catch (err) {
      console.error('Erro ao carregar turmas:', err);
      error = err?.message || 'Nao foi possivel carregar as turmas.';
      classrooms = [];
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    loadClassrooms();
  });

  async function handleCreate(event) {
    event?.preventDefault?.();
    formError = '';
    savingNew = true;

    try {
      await createClassroom(newClassroomName);
      newClassroomName = '';
      await loadClassrooms();
    } catch (err) {
      formError = err?.message || 'Nao foi possivel criar a turma.';
    } finally {
      savingNew = false;
    }
  }

  function startEditing(classroom) {
    editingId = classroom.id;
    editingName = classroom.name;
    rowError = '';
  }

  function cancelEditing() {
    editingId = '';
    editingName = '';
    rowError = '';
  }

  async function saveEditing(classroomId) {
    rowSavingId = classroomId;
    rowError = '';

    try {
      await updateClassroom(classroomId, editingName);
      cancelEditing();
      await loadClassrooms();
    } catch (err) {
      rowError = err?.message || 'Nao foi possivel salvar a turma.';
    } finally {
      rowSavingId = '';
    }
  }

  async function toggleClassroom(classroom) {
    rowSavingId = classroom.id;
    rowError = '';

    try {
      await setClassroomActive(classroom.id, !classroom.active);
      await loadClassrooms();
    } catch (err) {
      rowError = err?.message || 'Nao foi possivel atualizar a turma.';
    } finally {
      rowSavingId = '';
    }
  }

  async function handleDelete(classroom) {
    if (!confirm(`Excluir a turma "${classroom.name}"?`)) return;

    rowSavingId = classroom.id;
    rowError = '';

    try {
      await deleteClassroom(classroom.id);
      if (editingId === classroom.id) {
        cancelEditing();
      }
      await loadClassrooms();
    } catch (err) {
      rowError = err?.message || 'Nao foi possivel excluir a turma.';
    } finally {
      rowSavingId = '';
    }
  }
</script>

<div class="classrooms-panel">
  <div class="panel-header">
    <button type="button" class="back-btn" onclick={onBack}>← Voltar</button>
    <div class="header-copy">
      <h2 class="panel-title">🏫 Turmas</h2>
      <p class="panel-subtitle">Cadastre apenas o nome da turma. Ex.: Ano 7 - Turma A</p>
    </div>
  </div>

  <form class="create-card" onsubmit={handleCreate}>
    <label class="field">
      <span class="field-label">Nova turma</span>
      <input
        class="field-input"
        bind:value={newClassroomName}
        placeholder="Ex.: Ano 7 - Turma A"
        maxlength="120"
      />
    </label>

    {#if formError}
      <p class="form-error">{formError}</p>
    {/if}

    <button type="submit" class="save-btn" disabled={savingNew}>
      {savingNew ? 'Salvando...' : 'Adicionar turma'}
    </button>
  </form>

  {#if loading}
    <div class="state-card">
      <div class="spinner"></div>
      <p>Carregando turmas...</p>
    </div>
  {:else if error}
    <div class="state-card">
      <p class="form-error">⚠️ {error}</p>
      <button type="button" class="ghost-btn" onclick={loadClassrooms}>Tentar novamente</button>
    </div>
  {:else if classrooms.length === 0}
    <div class="state-card">
      <p class="empty-title">Nenhuma turma cadastrada ainda.</p>
      <p class="empty-copy">Adicione a primeira turma para liberar o acesso dos alunos.</p>
    </div>
  {:else}
    <div class="classrooms-list">
      {#each classrooms as classroom (classroom.id)}
        <div class="classroom-card">
          {#if editingId === classroom.id}
            <div class="edit-row">
              <input class="field-input" bind:value={editingName} maxlength="120" />
              <div class="row-actions">
                <button type="button" class="mini-btn save" onclick={() => saveEditing(classroom.id)} disabled={rowSavingId === classroom.id}>
                  {rowSavingId === classroom.id ? 'Salvando...' : 'Salvar'}
                </button>
                <button type="button" class="mini-btn" onclick={cancelEditing}>Cancelar</button>
              </div>
            </div>
          {:else}
            <div class="classroom-main">
              <div class="classroom-copy">
                <p class="classroom-name">{classroom.name}</p>
                <span class={`status-pill ${classroom.active ? 'active' : 'inactive'}`}>
                  {classroom.active ? 'Ativa' : 'Inativa'}
                </span>
              </div>
              <div class="row-actions">
                <button type="button" class="mini-btn" onclick={() => startEditing(classroom)}>Editar</button>
                <button
                  type="button"
                  class="mini-btn"
                  onclick={() => toggleClassroom(classroom)}
                  disabled={rowSavingId === classroom.id}
                >
                  {rowSavingId === classroom.id
                    ? 'Salvando...'
                    : classroom.active
                      ? 'Desativar'
                      : 'Reativar'}
                </button>
                <button
                  type="button"
                  class="mini-btn delete"
                  onclick={() => handleDelete(classroom)}
                  disabled={rowSavingId === classroom.id}
                >
                  {rowSavingId === classroom.id ? 'Salvando...' : 'Excluir'}
                </button>
              </div>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}

  {#if rowError}
    <p class="form-error">{rowError}</p>
  {/if}
</div>

<style>
  .classrooms-panel {
    width: min(760px, 100%);
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
    font-size: 0.9rem;
  }

  .back-btn,
  .ghost-btn,
  .save-btn,
  .mini-btn {
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-text);
    transition: all var(--transition-fast);
  }

  .back-btn,
  .ghost-btn,
  .save-btn {
    padding: 0.7rem 1rem;
    font-size: 0.9rem;
    font-weight: 600;
  }

  .save-btn,
  .mini-btn.save {
    background: rgba(139, 92, 246, 0.18);
    border-color: rgba(139, 92, 246, 0.6);
  }

  .back-btn:hover,
  .ghost-btn:hover,
  .save-btn:hover:not(:disabled),
  .mini-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    border-color: var(--color-primary);
  }

  .create-card,
  .state-card,
  .classroom-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: 1rem;
  }

  .create-card,
  .state-card {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
  }

  .classrooms-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }

  .field-label {
    color: var(--color-muted);
    font-size: 0.82rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .field-input {
    width: 100%;
    border: 1px solid rgba(148, 163, 184, 0.2);
    border-radius: 14px;
    background: rgba(15, 23, 42, 0.68);
    color: var(--color-text);
    padding: 0.9rem 1rem;
    font-size: 0.96rem;
  }

  .field-input:focus {
    outline: none;
    border-color: rgba(139, 92, 246, 0.82);
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.12);
  }

  .classroom-main,
  .edit-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.85rem;
  }

  .classroom-copy {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .classroom-name {
    font-size: 0.98rem;
    font-weight: 700;
    color: var(--color-text);
  }

  .status-pill {
    width: fit-content;
    border-radius: 999px;
    padding: 0.25rem 0.55rem;
    font-size: 0.72rem;
    font-weight: 700;
  }

  .status-pill.active {
    background: rgba(34, 197, 94, 0.12);
    color: #bbf7d0;
    border: 1px solid rgba(74, 222, 128, 0.34);
  }

  .status-pill.inactive {
    background: rgba(148, 163, 184, 0.12);
    color: #e2e8f0;
    border: 1px solid rgba(148, 163, 184, 0.28);
  }

  .row-actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .mini-btn {
    padding: 0.45rem 0.72rem;
    font-size: 0.82rem;
    color: var(--color-muted);
  }

  .mini-btn.delete:hover:not(:disabled) {
    border-color: rgba(248, 113, 113, 0.45);
    color: #fecaca;
  }

  .mini-btn:disabled,
  .save-btn:disabled {
    opacity: 0.72;
    cursor: wait;
    transform: none;
  }

  .state-card {
    align-items: center;
    text-align: center;
  }

  .empty-title {
    color: var(--color-text);
    font-size: 1rem;
    font-weight: 700;
  }

  .empty-copy {
    color: var(--color-muted);
  }

  .form-error {
    color: var(--color-wrong);
    font-size: 0.85rem;
  }

  .spinner {
    width: 34px;
    height: 34px;
    border: 3px solid var(--color-border);
    border-top-color: var(--color-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @media (max-width: 640px) {
    .classroom-main,
    .edit-row {
      flex-direction: column;
      align-items: stretch;
    }

    .save-btn,
    .ghost-btn,
    .back-btn {
      width: 100%;
    }
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
