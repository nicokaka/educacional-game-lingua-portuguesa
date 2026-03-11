<script>
  import ChallengeForm from './ChallengeForm.svelte';
  import { createModule, updateModule } from '../../supabase/modules.js';

  let {
    moduleId = null,
    initialTitle = '',
    initialAuthor = '',
    initialChallenges = [],
    onsave,
    oncancel,
  } = $props();

  let title = $state('');
  let author = $state('');
  let challenges = $state([]);
  let saving = $state(false);
  let saveError = $state('');
  let saveSuccess = $state(false);
  let initialized = $state(false);

  // Inicializa com valores das props na primeira montagem
  $effect(() => {
    if (!initialized) {
      title = initialTitle;
      author = initialAuthor;
      challenges = initialChallenges.length > 0 ? structuredClone(initialChallenges) : [];
      initialized = true;
    }
  });

  function addChallenge() {
    challenges = [...challenges, {
      type: 'multiple_choice',
      prompt: '',
      difficulty: 1,
      monster: { name: 'Monstro', sprite: 'monster_01' },
      options: [
        { text: '', correct: true, feedback: '' },
        { text: '', correct: false, feedback: '' },
      ],
    }];
  }

  function removeChallenge(index) {
    challenges = challenges.filter((_, i) => i !== index);
  }

  async function handleSave() {
    // Validação básica
    if (!title.trim()) {
      saveError = 'O título do módulo é obrigatório.';
      return;
    }
    if (challenges.length === 0) {
      saveError = 'Adicione pelo menos 1 desafio.';
      return;
    }

    // Validação dos desafios
    for (let i = 0; i < challenges.length; i++) {
      const ch = challenges[i];
      if (!ch.prompt.trim()) {
        saveError = `Desafio ${i + 1}: preencha o enunciado.`;
        return;
      }
    }

    saving = true;
    saveError = '';
    saveSuccess = false;

    try {
      const moduleData = { title: title.trim(), author: author.trim() || 'Professor' };

      if (moduleId) {
        await updateModule(moduleId, moduleData, challenges);
      } else {
        await createModule(moduleData, challenges);
      }

      saveSuccess = true;
      setTimeout(() => {
        onsave?.();
      }, 1000);
    } catch (e) {
      saveError = e.message;
    } finally {
      saving = false;
    }
  }
</script>

<div class="module-editor">
  <div class="editor-header">
    <h2 class="editor-title">{moduleId ? '✏️ Editar Módulo' : '📝 Novo Módulo'}</h2>
    <button class="cancel-btn" onclick={oncancel}>← Voltar</button>
  </div>

  <!-- Dados do módulo -->
  <div class="module-fields">
    <div class="field">
      <label class="field-label" for="mod-title">Título do Módulo</label>
      <input id="mod-title" class="field-input" bind:value={title} placeholder="Ex: Ortografia - 6º Ano" />
    </div>
    <div class="field">
      <label class="field-label" for="mod-author">Autor</label>
      <input id="mod-author" class="field-input" bind:value={author} placeholder="Ex: Prof. Silva" />
    </div>
  </div>

  <!-- Lista de desafios -->
  <div class="challenges-section">
    <div class="section-header">
      <h3 class="section-title">Desafios ({challenges.length})</h3>
      <button class="add-btn" onclick={addChallenge}>+ Adicionar Desafio</button>
    </div>

    {#if challenges.length === 0}
      <div class="empty-challenges">
        <p>Nenhum desafio ainda. Clique em <strong>"+ Adicionar Desafio"</strong> para começar.</p>
      </div>
    {:else}
      <div class="challenges-list">
        {#each challenges as challenge, i (i)}
          <div class="challenge-wrapper">
            <span class="challenge-number">Desafio {i + 1}</span>
            <ChallengeForm bind:challenge={challenges[i]} onremove={() => removeChallenge(i)} />
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Salvar -->
  <div class="save-section">
    {#if saveError}
      <p class="save-error">⚠️ {saveError}</p>
    {/if}
    {#if saveSuccess}
      <p class="save-success">✅ Módulo salvo com sucesso!</p>
    {/if}
    <button class="save-btn" onclick={handleSave} disabled={saving}>
      {saving ? '💾 Salvando...' : '💾 Salvar Módulo'}
    </button>
  </div>
</div>

<style>
  .module-editor {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    max-width: 700px;
    width: 100%;
  }

  .editor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .editor-title {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--color-text);
  }

  .cancel-btn {
    padding: 0.4rem 0.8rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    color: var(--color-muted);
    font-size: 0.85rem;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .cancel-btn:hover {
    border-color: var(--color-primary);
    color: var(--color-text);
  }

  /* ── Module Fields ── */
  .module-fields {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: 1.25rem;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .field-label {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .field-input {
    padding: 0.55rem 0.75rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    color: var(--color-text);
    font-size: 0.95rem;
    font-family: var(--font-body);
    transition: border-color var(--transition-fast);
  }

  .field-input:focus {
    border-color: var(--color-primary);
    outline: none;
  }

  /* ── Challenges Section ── */
  .challenges-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .section-title {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--color-text);
  }

  .add-btn {
    padding: 0.5rem 1rem;
    background: rgba(139, 92, 246, 0.1);
    border: 1px solid var(--color-primary);
    border-radius: var(--radius-md);
    color: var(--color-primary);
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .add-btn:hover {
    background: rgba(139, 92, 246, 0.2);
  }

  .challenges-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .challenge-wrapper {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .challenge-number {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--color-primary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .empty-challenges {
    text-align: center;
    padding: 2rem;
    background: var(--color-surface);
    border: 1px dashed var(--color-border);
    border-radius: var(--radius-lg);
    color: var(--color-muted);
    font-size: 0.9rem;
  }

  /* ── Save Section ── */
  .save-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding-top: 0.5rem;
  }

  .save-error {
    color: var(--color-wrong);
    font-size: 0.85rem;
    text-align: center;
  }

  .save-success {
    color: var(--color-correct);
    font-size: 0.85rem;
    font-weight: 600;
  }

  .save-btn {
    padding: 0.85rem 2.5rem;
    background: linear-gradient(135deg, var(--color-primary), #6d28d9);
    border: none;
    border-radius: var(--radius-lg);
    color: white;
    font-size: 1.1rem;
    font-weight: 700;
    cursor: pointer;
    transition: all var(--transition-normal);
    box-shadow: 0 4px 20px var(--color-primary-glow);
  }

  .save-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 30px var(--color-primary-glow);
  }

  .save-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
