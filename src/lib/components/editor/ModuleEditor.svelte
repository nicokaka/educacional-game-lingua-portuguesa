<script>
  import ChallengeForm from './ChallengeForm.svelte';
  import { createModule, updateModule } from '../../supabase/modules.js';

  const DRAFT_STORAGE_PREFIX = 'gramquest:module-draft';
  const DRAFT_VERSION = 1;
  const AUTO_SAVE_DELAY_MS = 1800;

  let {
    moduleId = null,
    initialTitle = '',
    initialAuthor = '',
    initialUpdatedAt = '',
    initialChallenges = [],
    onSave,
    onCancel,
  } = $props();

  // svelte-ignore state_referenced_locally
  let title = $state(initialTitle);
  // svelte-ignore state_referenced_locally
  let author = $state(initialAuthor);
  // svelte-ignore state_referenced_locally
  let challenges = $state(
    (initialChallenges || []).map((challenge) => hydrateChallenge(challenge))
  );
  let saving = $state(false);
  let saveError = $state('');
  let saveSuccess = $state(false);
  let draftTimestamp = $state(0);
  let draftMessage = $state('');
  let draftReady = $state(false);
  let previewing = $state(false);
  let currentModuleId = $state(null);

  let autoSaveTimer = null;
  let draftMessageTimer = null;

  let draftStorageKey = $derived(
    moduleId ? `${DRAFT_STORAGE_PREFIX}:${moduleId}` : `${DRAFT_STORAGE_PREFIX}:new`
  );
  let challengeErrors = $derived(challenges.map((challenge) => getChallengeErrors(challenge)));
  let readyCount = $derived(
    challengeErrors.reduce((total, errors) => total + (errors.length === 0 ? 1 : 0), 0)
  );
  let draftTimeLabel = $derived(
    draftTimestamp ? `Rascunho salvo as ${formatTime(draftTimestamp)}` : ''
  );

  function createChallengeId() {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function hydrateChallenge(challenge) {
    const clone = challenge
      ? JSON.parse(JSON.stringify(challenge))
      : {};
    clone.id = clone.id || createChallengeId();
    return clone;
  }

  function createDefaultChallenge() {
    return {
      id: createChallengeId(),
      type: 'multiple_choice',
      prompt: '',
      difficulty: 1,
      monster: { name: 'Monstro', sprite: '' },
      hint: '',
      options: [
        { text: '', correct: true, feedback: '' },
        { text: '', correct: false, feedback: '' },
      ],
    };
  }

  function formatTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function showDraftMessage(message) {
    draftMessage = message;
    if (draftMessageTimer) clearTimeout(draftMessageTimer);
    draftMessageTimer = setTimeout(() => {
      draftMessage = '';
    }, 3000);
  }

  function addChallenge() {
    challenges = [...challenges, createDefaultChallenge()];
  }

  function removeChallenge(index) {
    challenges = challenges.filter((_, i) => i !== index);
  }

  function duplicateChallenge(index) {
    const source = challenges[index];
    if (!source) return;

    const copy = hydrateChallenge(source);
    copy.id = createChallengeId();
    delete copy.challengeRecordId;
    challenges = [
      ...challenges.slice(0, index + 1),
      copy,
      ...challenges.slice(index + 1),
    ];
    showDraftMessage('Pergunta duplicada.');
  }

  function getChallengeErrors(challenge) {
    const errors = [];
    const prompt = challenge?.prompt?.trim?.() || '';

    if (!prompt) {
      errors.push('Preencha o enunciado.');
    }

    if (challenge?.type === 'true_false') {
      if (!Array.isArray(challenge.statements) || challenge.statements.length === 0) {
        errors.push('Adicione pelo menos 1 afirmacao.');
      } else {
        const emptyStatement = challenge.statements.findIndex((statement) => !statement.text?.trim());
        if (emptyStatement !== -1) {
          errors.push(`Preencha a afirmacao ${emptyStatement + 1}.`);
        }

        const invalidAnswer = challenge.statements.findIndex(
          (statement) => typeof statement?.correctAnswer !== 'boolean'
        );
        if (invalidAnswer !== -1) {
          errors.push(`Defina Verdadeiro ou Falso na afirmacao ${invalidAnswer + 1}.`);
        }
      }
    }

    if (challenge?.type === 'multiple_choice') {
      if (!Array.isArray(challenge.options) || challenge.options.length < 2) {
        errors.push('Adicione pelo menos 2 alternativas.');
      } else {
        const emptyOption = challenge.options.findIndex((option) => !option.text?.trim());
        if (emptyOption !== -1) {
          errors.push(`Preencha a alternativa ${emptyOption + 1}.`);
        }

        const correctCount = challenge.options.filter((option) => option.correct).length;
        if (correctCount !== 1) {
          errors.push('Marque exatamente 1 alternativa correta.');
        }
      }
    }

    if (challenge?.type === 'drag_drop') {
      if (prompt && !prompt.includes('_____')) {
        errors.push('Use "_____" no enunciado para marcar a lacuna da resposta.');
      }

      if (!challenge.correctAnswer?.trim()) {
        errors.push('Preencha a resposta correta.');
      }

      if (!Array.isArray(challenge.loot) || challenge.loot.length < 2) {
        errors.push('Adicione pelo menos 2 opcoes na mochila.');
      } else {
        const emptyLoot = challenge.loot.findIndex((item) => !item.text?.trim());
        if (emptyLoot !== -1) {
          errors.push(`Preencha a opcao ${emptyLoot + 1} da mochila.`);
        }
      }
    }

    if (challenge?.type === 'ordering') {
      if (!Array.isArray(challenge.fragments) || challenge.fragments.length < 2) {
        errors.push('Adicione pelo menos 2 fragmentos.');
      } else {
        const emptyFragment = challenge.fragments.findIndex((fragment) => !fragment?.trim());
        if (emptyFragment !== -1) {
          errors.push(`Preencha o fragmento ${emptyFragment + 1}.`);
        }
      }
    }

    return errors;
  }

  function clearDraft() {
    if (typeof window === 'undefined') return;

    try {
      window.localStorage.removeItem(draftStorageKey);
      draftTimestamp = 0;
      draftMessage = '';
    } catch (error) {
      console.warn('Nao foi possivel limpar rascunho local:', error.message);
    }
  }

  $effect(() => {
    moduleId;
    if (!currentModuleId && moduleId) {
      currentModuleId = moduleId;
    }
  });

  $effect(() => {
    draftStorageKey;
    draftReady = false;
    draftTimestamp = 0;
    draftMessage = '';
  });

  $effect(() => {
    if (typeof window === 'undefined') return;
    const key = draftStorageKey;
    const serverUpdatedAt = initialUpdatedAt ? new Date(initialUpdatedAt).getTime() : 0;

    try {
      const rawDraft = window.localStorage.getItem(key);
      if (!rawDraft) {
        draftReady = true;
        return;
      }

      const parsed = JSON.parse(rawDraft);
      if (parsed?.version !== DRAFT_VERSION || typeof parsed !== 'object') {
        draftReady = true;
        return;
      }

      if (moduleId && serverUpdatedAt > 0 && Number(parsed.updatedAt) < serverUpdatedAt) {
        showDraftMessage('Rascunho local ignorado porque o modulo salvo e mais recente.');
        draftReady = true;
        return;
      }

      title = typeof parsed.title === 'string' ? parsed.title : title;
      author = typeof parsed.author === 'string' ? parsed.author : author;
      if (Array.isArray(parsed.challenges)) {
        challenges = parsed.challenges.map((challenge) => hydrateChallenge(challenge));
      }

      draftTimestamp = Number(parsed.updatedAt) || 0;
      showDraftMessage('Rascunho restaurado.');
    } catch (error) {
      console.warn('Nao foi possivel restaurar rascunho local:', error.message);
    } finally {
      draftReady = true;
    }
  });

  $effect(() => {
    if (typeof window === 'undefined' || !draftReady) return;

    const key = draftStorageKey;
    const draftPayload = {
      version: DRAFT_VERSION,
      updatedAt: Date.now(),
      title,
      author,
      challenges: JSON.parse(JSON.stringify(challenges)),
    };

    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
      try {
        window.localStorage.setItem(key, JSON.stringify(draftPayload));
        draftTimestamp = draftPayload.updatedAt;
      } catch (error) {
        console.warn('Nao foi possivel salvar rascunho local:', error.message);
      }
    }, AUTO_SAVE_DELAY_MS);

    return () => {
      if (autoSaveTimer) clearTimeout(autoSaveTimer);
    };
  });

  $effect(() => {
    return () => {
      if (autoSaveTimer) clearTimeout(autoSaveTimer);
      if (draftMessageTimer) clearTimeout(draftMessageTimer);
    };
  });

  async function handleSave() {
    const savedId = await persistModule({ exitOnSuccess: true });
    if (savedId) currentModuleId = savedId;
  }

  async function handlePreview() {
    const savedId = await persistModule({ exitOnSuccess: false });
    if (!savedId || typeof window === 'undefined') return;

    previewing = true;
    try {
      window.open(`/#/play/${savedId}`, '_blank', 'noopener,noreferrer');
      showDraftMessage('Pre-visualizacao aberta em nova aba.');
    } finally {
      previewing = false;
    }
  }

  async function persistModule({ exitOnSuccess }) {
    // Validação básica
    if (!title.trim()) {
      saveError = 'O título do módulo é obrigatório.';
      return null;
    }
    if (challenges.length === 0) {
      saveError = 'Adicione pelo menos 1 desafio.';
      return null;
    }

    const firstInvalidIndex = challengeErrors.findIndex((errors) => errors.length > 0);
    if (firstInvalidIndex !== -1) {
      saveError = `Desafio ${firstInvalidIndex + 1}: ${challengeErrors[firstInvalidIndex][0]}`;
      return null;
    }

    saving = true;
    saveError = '';
    saveSuccess = false;
    let savedId = currentModuleId;

    try {
      const moduleData = { title: title.trim(), author: author.trim() || 'Professor' };

      if (savedId) {
        await updateModule(savedId, moduleData, challenges);
      } else {
        savedId = await createModule(moduleData, challenges);
        currentModuleId = savedId;
      }

      clearDraft();
      saveSuccess = true;
      if (exitOnSuccess) {
        setTimeout(() => {
          onSave?.();
        }, 1000);
      }
      return savedId;
    } catch (e) {
      saveError = e.message;
      return null;
    } finally {
      saving = false;
    }
  }
</script>

<div class="module-editor">
  <div class="header-nav">
    <button class="cancel-btn" onclick={() => onCancel?.()}>← Voltar</button>
    <div class="save-controls">
      {#if draftMessage}
        <span class="draft-status">{draftMessage}</span>
      {:else if draftTimeLabel}
        <span class="draft-status">{draftTimeLabel}</span>
      {/if}
      {#if saveError}
        <span class="save-error">⚠️ {saveError}</span>
      {/if}
      {#if saveSuccess}
        <span class="save-success">✅ Salvo!</span>
      {/if}
      <button
        class="preview-btn"
        onclick={handlePreview}
        disabled={saving || previewing}
        title="Abrir uma pre-visualizacao para testar como aluno"
      >
        {previewing ? 'Abrindo...' : 'Pre-visualizar'}
      </button>
      <button class="save-btn" onclick={handleSave} disabled={saving}>
        {saving ? 'Gravando...' : 'Salvar Módulo'}
      </button>
    </div>
  </div>

  <!-- Cabeçalho do formulário (estilo Google Forms com barra roxa no topo) -->
  <div class="top-card">
    <input 
      class="title-input" 
      bind:value={title} 
      placeholder="Título do Formulário (Ex: Ortografia - 6º Ano)" 
    />
    <input 
      class="desc-input" 
      bind:value={author} 
      placeholder="Nome do Professor" 
    />

    {#if challenges.length > 0}
      <p class="progress-text">
        {readyCount}/{challenges.length} perguntas prontas
      </p>
    {/if}
  </div>

  <!-- Lista de desafios -->
  <div class="challenges-list">
    {#if challenges.length === 0}
      <div class="empty-state">
        <p>Módulo vazio. Comece a adicionar perguntas!</p>
      </div>
    {/if}

    {#each challenges as challenge, i (challenge.id || i)}
      <div class="challenge-wrapper">
        <div class="challenge-index">
          <span class="challenge-badge">{i + 1}</span>
          <span class="challenge-label">Pergunta {i + 1}</span>
          <span
            class="challenge-status"
            class:ready={challengeErrors[i].length === 0}
            class:pending={challengeErrors[i].length > 0}
          >
            {challengeErrors[i].length === 0 ? 'Pronta' : 'Incompleta'}
          </span>
        </div>
        <ChallengeForm
          bind:challenge={challenges[i]}
          errors={challengeErrors[i]}
          onremove={() => removeChallenge(i)}
          onduplicate={() => duplicateChallenge(i)}
        />
      </div>
    {/each}
  </div>

  <!-- Botão Flutuante Central para Adicionar -->
  <div class="add-section">
    <button class="fab-btn" onclick={addChallenge} title="Adicionar Pergunta">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
      Adicionar Pergunta
    </button>
  </div>
</div>

<style>
  .module-editor {
    display: flex;
    flex-direction: column;
    max-width: 768px;
    width: 100%;
    margin: 0 auto;
    padding-bottom: 5rem; /* espaço extra pro scroll */
  }

  .header-nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: sticky;
    top: 0;
    z-index: 50;
    background: var(--color-bg);
    padding: 1rem 0;
    margin-bottom: 2rem;
    border-bottom: 1px solid var(--color-border);
  }

  .cancel-btn {
    padding: 0.5rem 1rem;
    background: transparent;
    border: none;
    color: var(--color-muted);
    font-size: 0.95rem;
    font-weight: 500;
    cursor: pointer;
    transition: color var(--transition-fast);
  }

  .cancel-btn:hover {
    color: var(--color-text);
  }

  .save-controls {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .save-error {
    color: var(--color-wrong);
    font-size: 0.85rem;
  }

  .save-success {
    color: var(--color-correct);
    font-size: 0.85rem;
    font-weight: 600;
  }

  .draft-status {
    color: var(--color-muted);
    font-size: 0.8rem;
  }

  .save-btn {
    padding: 0.6rem 1.5rem;
    background: var(--color-primary);
    border: none;
    border-radius: var(--radius-sm);
    color: white;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition: background-color var(--transition-fast);
  }

  .preview-btn {
    padding: 0.68rem 1rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: rgba(30, 41, 59, 0.9);
    color: var(--color-text);
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .preview-btn:hover:not(:disabled) {
    border-color: var(--color-primary);
    color: var(--color-primary);
  }

  .preview-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .save-btn:hover:not(:disabled) {
    background: var(--color-primary-hover);
  }

  .save-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* ── Top Card (Google Forms Style) ── */
  .top-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 2rem 1.5rem;
    position: relative;
    border-top: 10px solid var(--color-primary); /* Barra roxa icônica */
    box-shadow: 0 2px 6px rgba(0,0,0,0.1);
    margin-bottom: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .progress-text {
    font-size: 0.8rem;
    color: var(--color-muted);
    margin-top: 0.5rem;
  }

  .title-input {
    background: transparent;
    border: none;
    border-bottom: 1px solid transparent;
    color: var(--color-text);
    font-size: 1.4rem; /* Reduzido de 2rem para caber no desktop/mobile */
    font-weight: 500;
    padding-bottom: 0.5rem;
    width: 100%;
    transition: border-bottom-color var(--transition-fast);
  }

  .title-input:focus {
    outline: none;
    border-bottom: 2px solid var(--color-primary);
    padding-bottom: calc(0.5rem - 1px);
  }

  .desc-input {
    background: transparent;
    border: none;
    border-bottom: 1px solid transparent;
    color: var(--color-muted);
    font-size: 1rem;
    padding-top: 0.5rem;
    padding-bottom: 0.2rem;
    width: 100%;
    transition: border-bottom-color var(--transition-fast);
  }

  .desc-input:focus {
    outline: none;
    border-bottom: 1px solid var(--color-border);
  }

  /* ── Challenges ── */
  .challenges-list {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .empty-state {
    text-align: center;
    padding: 3rem;
    background: rgba(255, 255, 255, 0.02);
    border: 2px dashed var(--color-border);
    border-radius: var(--radius-md);
    color: var(--color-muted);
  }

  .challenge-wrapper {
    display: flex;
    flex-direction: column;
  }

  .challenge-index {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin: 0 0 0.75rem 0.25rem;
    flex-wrap: wrap;
  }

  .challenge-badge {
    width: 2rem;
    height: 2rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    background: rgba(139, 92, 246, 0.16);
    border: 1px solid rgba(139, 92, 246, 0.35);
    color: var(--color-primary);
    font-weight: 700;
  }

  .challenge-label {
    color: var(--color-muted);
    font-size: 0.9rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .challenge-status {
    padding: 0.2rem 0.55rem;
    border-radius: 999px;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    border: 1px solid transparent;
  }

  .challenge-status.ready {
    color: var(--color-correct);
    border-color: rgba(74, 222, 128, 0.35);
    background: rgba(74, 222, 128, 0.1);
  }

  .challenge-status.pending {
    color: #fcd34d;
    border-color: rgba(251, 191, 36, 0.35);
    background: rgba(251, 191, 36, 0.08);
  }

  /* ── FAB Button ── */
  .add-section {
    display: flex;
    justify-content: center;
    margin-top: 1rem;
  }

  .fab-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.8rem 1.5rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 9999px;
    color: var(--color-text);
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    transition: all var(--transition-fast);
  }

  .fab-btn:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0,0,0,0.3);
  }
</style>
