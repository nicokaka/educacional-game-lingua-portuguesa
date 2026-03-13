<script>
  import ChallengeForm from './ChallengeForm.svelte';
  import { createModule, updateModule } from '../../supabase/modules.js';

  let {
    moduleId = null,
    initialTitle = '',
    initialAuthor = '',
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
    (initialChallenges || []).map((c, i) => ({ 
      ...c, 
      id: c.id || Date.now() + i + Math.random() 
    }))
  );
  let saving = $state(false);
  let saveError = $state('');
  let saveSuccess = $state(false);

  function addChallenge() {
    challenges = [...challenges, {
      id: Date.now() + Math.random(),
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
        onSave?.();
      }, 1000);
    } catch (e) {
      saveError = e.message;
    } finally {
      saving = false;
    }
  }
</script>

<div class="module-editor">
  <div class="header-nav">
    <button class="cancel-btn" onclick={() => onCancel?.()}>← Voltar</button>
    <div class="save-controls">
      {#if saveError}
        <span class="save-error">⚠️ {saveError}</span>
      {/if}
      {#if saveSuccess}
        <span class="save-success">✅ Salvo!</span>
      {/if}
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
        <ChallengeForm bind:challenge={challenges[i]} onremove={() => removeChallenge(i)} />
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
