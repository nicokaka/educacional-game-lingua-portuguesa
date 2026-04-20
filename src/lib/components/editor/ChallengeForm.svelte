<script>
  import TypeSelector from './TypeSelector.svelte';
  import ChallengePreviewModal from './ChallengePreviewModal.svelte';
  import { supabase } from '../../supabase/client.js';

  let { challenge = $bindable(), onremove, onduplicate, errors = [] } = $props();
  let imageUploadError = $state('');
  let uploadingImage = $state(false);
  let imageInput = $state();
  let showPreview = $state(false);

  function addOption() {
    if (!challenge.options) challenge.options = [];
    challenge.options = [...challenge.options, { text: '', correct: false, feedback: '' }];
  }

  function removeOption(index) {
    challenge.options = challenge.options.filter((_, i) => i !== index);
  }

  function addLoot() {
    if (!challenge.loot) challenge.loot = [];
    challenge.loot = [...challenge.loot, { text: '', correct: false }];
  }

  function removeLoot(index) {
    challenge.loot = challenge.loot.filter((_, i) => i !== index);
  }

  function addFragment() {
    if (!challenge.fragments) challenge.fragments = [];
    challenge.fragments = [...challenge.fragments, ''];
  }

  function removeFragment(index) {
    challenge.fragments = challenge.fragments.filter((_, i) => i !== index);
  }

  function addTrueFalseStatement() {
    if (!challenge.statements) challenge.statements = [];
    challenge.statements = [...challenge.statements, { text: '', correctAnswer: true }];
  }

  function removeTrueFalseStatement(index) {
    challenge.statements = challenge.statements.filter((_, i) => i !== index);
  }

  function updateTrueFalseText(index, value) {
    challenge.statements = challenge.statements.map((statement, i) =>
      i === index ? { ...statement, text: value } : statement
    );
  }

  function updateTrueFalseAnswer(index, value) {
    challenge.statements = challenge.statements.map((statement, i) =>
      i === index ? { ...statement, correctAnswer: value === 'true' } : statement
    );
  }

  function normalizeTrueFalseChallenge() {
    if (challenge.type !== 'true_false') return;
    if (Array.isArray(challenge.statements) && challenge.statements.length > 0) return;

    challenge.statements = [
      {
        text: challenge.prompt || '',
        correctAnswer: typeof challenge.correctAnswer === 'boolean' ? challenge.correctAnswer : true,
      },
    ];

    challenge.prompt = 'Marque verdadeiro ou falso para cada afirmacao.';
    delete challenge.correctAnswer;
  }

  $effect(() => {
    normalizeTrueFalseChallenge();
  });

  function handleTypeChange(newType) {
    const base = {
      type: newType,
      prompt: challenge.prompt,
      difficulty: challenge.difficulty,
      monster: challenge.monster || { name: 'Monstro', sprite: '' },
      imageUrl: challenge.imageUrl || '',
      imageAlt: challenge.imageAlt || '',
      imageCaption: challenge.imageCaption || '',
    };

    if (newType === 'drag_drop') {
      Object.assign(challenge, base, {
        correctAnswer: '',
        loot: [{ text: '', correct: true }, { text: '', correct: false }],
        hint: '',
      });
    } else if (newType === 'multiple_choice') {
      Object.assign(challenge, base, {
        options: [{ text: '', correct: true, feedback: '' }, { text: '', correct: false, feedback: '' }],
        hint: challenge.hint || '',
      });
    } else if (newType === 'true_false') {
      Object.assign(challenge, base, {
        prompt: challenge.prompt || 'Marque verdadeiro ou falso para cada afirmacao.',
        statements: [{ text: '', correctAnswer: true }],
        hint: '',
      });
    } else if (newType === 'ordering') {
      Object.assign(challenge, base, { fragments: ['', ''], shuffled: true, hint: '' });
    } else if (newType === 'open_text') {
      Object.assign(challenge, base);
      delete challenge.hint;
    }

    if (!['drag_drop', 'true_false', 'ordering'].includes(newType)) {
      delete challenge.loot;
      delete challenge.correctAnswer;
    }
    if (newType !== 'multiple_choice') {
      delete challenge.options;
    }
    if (newType !== 'true_false') {
      delete challenge.statements;
      if (newType !== 'drag_drop') delete challenge.correctAnswer;
    }
    if (newType !== 'ordering') {
      delete challenge.fragments;
      delete challenge.shuffled;
    }
    if (newType === 'open_text') {
      delete challenge.hint;
    }

    challenge.type = newType;
  }

  function triggerImagePicker() {
    imageInput?.click();
  }

  function createImageFilePath(file) {
    const safeName = (file.name || 'imagem')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]/g, '-')
      .replace(/-+/g, '-')
      .toLowerCase();
    const uniqueId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return `questions/${uniqueId}-${safeName}`;
  }

  async function handleImageSelected(event) {
    const file = event.currentTarget?.files?.[0];
    if (!file) return;

    imageUploadError = '';
    uploadingImage = true;

    try {
      const filePath = createImageFilePath(file);
      const { error: uploadError } = await supabase.storage
        .from('challenge-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('challenge-images')
        .getPublicUrl(filePath);

      challenge.imageUrl = data.publicUrl;

      if (!challenge.imageAlt?.trim()) {
        challenge.imageAlt = file.name.replace(/\.[^/.]+$/, '');
      }
    } catch (error) {
      imageUploadError = error?.message || 'Nao foi possivel enviar a imagem.';
    } finally {
      uploadingImage = false;
      if (event.currentTarget) {
        event.currentTarget.value = '';
      }
    }
  }

  function removeImage() {
    challenge.imageUrl = '';
    challenge.imageAlt = '';
    challenge.imageCaption = '';
    imageUploadError = '';
  }
</script>

<div class="challenge-form">
  <div class="form-header">
    <textarea
      class="field-input google-textarea prompt-input"
      bind:value={challenge.prompt}
      placeholder={challenge.type === 'drag_drop'
        ? 'Digite o enunciado da atividade...'
        : challenge.type === 'true_false'
          ? 'Digite a instrucao do desafio...'
          : 'Digite a pergunta...'}
      rows="1"
    ></textarea>
    <div class="header-actions">
      <TypeSelector value={challenge.type} onchange={handleTypeChange} />
    </div>
  </div>

  <div class="form-body">
    {#if challenge.type === 'drag_drop'}
      <div class="field line-focus">
        <p class="field-label">Resposta Correta</p>
        <input class="field-input google-input" bind:value={challenge.correctAnswer} placeholder="Palavra que preenche a lacuna" />
      </div>

      <div class="field">
        <p class="field-label">Opcoes da Mochila</p>
        <p class="field-hint">Voce pode inserir apenas distratores. A resposta correta e adicionada automaticamente no jogo.</p>
        {#each challenge.loot || [] as item, i}
          <div class="option-row">
            <span class="icon">-</span>
            <input class="field-input google-input flex-1" bind:value={item.text} placeholder="Opcao da mochila {i + 1}" />
            <button class="icon-btn danger" onclick={() => removeLoot(i)}>x</button>
          </div>
        {/each}
        <button class="mini-btn add" onclick={addLoot}>+ Adicionar opcao</button>
      </div>

      <div class="field">
        <p class="field-label">Bizu (opcional)</p>
        <textarea
          class="field-input google-textarea feedback-textarea"
          bind:value={challenge.hint}
          placeholder="Dica curta para ajudar o aluno a descobrir a resposta"
          rows="2"
        ></textarea>
      </div>

    {:else if challenge.type === 'multiple_choice'}
      <div class="field">
        <p class="field-label">Alternativas</p>
        {#each challenge.options || [] as opt, i}
          <div class="option-block">
            <div class="option-row">
              <label class="radio-label">
                <span class="sr-only">Marcar opcao {i + 1} como correta</span>
                <input type="radio" name="correct_{challenge.id || Math.random()}" checked={opt.correct} onchange={() => {
                  challenge.options.forEach((o) => o.correct = false);
                  opt.correct = true;
                }} />
              </label>
              <input class="field-input google-input flex-1" bind:value={opt.text} placeholder="Opcao {i + 1}" />
              <button class="icon-btn danger" onclick={() => removeOption(i)}>x</button>
            </div>
            <input
              class="field-input google-input feedback-input"
              bind:value={opt.feedback}
              placeholder="Bizu exibido se o aluno marcar esta alternativa errada"
            />
          </div>
        {/each}
        <div class="option-row">
          <span class="icon radio-placeholder">o</span>
          <button class="mini-btn add-inline" onclick={addOption}>Adicionar opcao</button>
        </div>
      </div>

      <div class="field">
        <p class="field-label">Bizu (opcional)</p>
        <textarea
          class="field-input google-textarea feedback-textarea"
          bind:value={challenge.hint}
          placeholder="Dica geral para ajudar o aluno antes de responder"
          rows="2"
        ></textarea>
      </div>

    {:else if challenge.type === 'true_false'}
      <div class="field">
        <p class="field-label">Afirmacoes</p>
        {#each challenge.statements || [] as statement, i}
          <div class="true-false-row">
            <input
              class="field-input google-input flex-1"
              value={statement.text}
              oninput={(e) => updateTrueFalseText(i, /** @type {HTMLInputElement} */ (e.target).value)}
              placeholder="Afirmacao {i + 1}"
            />
            <select
              class="field-input google-input small-input tf-select"
              value={statement.correctAnswer ? 'true' : 'false'}
              onchange={(e) => updateTrueFalseAnswer(i, /** @type {HTMLSelectElement} */ (e.target).value)}
            >
              <option value="true">Verdadeiro</option>
              <option value="false">Falso</option>
            </select>
            <button class="icon-btn danger" onclick={() => removeTrueFalseStatement(i)}>x</button>
          </div>
        {/each}
        <button class="mini-btn add" onclick={addTrueFalseStatement}>+ Adicionar afirmacao</button>
      </div>

      <div class="field">
        <p class="field-label">Bizu (opcional)</p>
        <textarea
          class="field-input google-textarea feedback-textarea"
          bind:value={challenge.hint}
          placeholder="Dica curta para ajudar o aluno a corrigir a afirmacao"
          rows="2"
        ></textarea>
      </div>

    {:else if challenge.type === 'ordering'}
      <div class="field">
        <p class="field-label">Fragmentos (na ordem correta da frase)</p>
        {#each challenge.fragments || [] as frag, i}
          <div class="option-row">
            <span class="order-num">{i + 1}.</span>
            <input class="field-input google-input flex-1" bind:value={challenge.fragments[i]} placeholder="Fragmento {i + 1}" />
            <button class="icon-btn danger" onclick={() => removeFragment(i)}>x</button>
          </div>
        {/each}
        <button class="mini-btn add" onclick={addFragment}>+ Adicionar fragmento</button>
      </div>

      <div class="field">
        <p class="field-label">Bizu (opcional)</p>
        <textarea
          class="field-input google-textarea feedback-textarea"
          bind:value={challenge.hint}
          placeholder="Dica curta para ajudar o aluno a ordenar a frase"
          rows="2"
        ></textarea>
      </div>
    {:else if challenge.type === 'open_text'}
      <div class="field">
        <p class="field-label">Resposta do aluno</p>
        <p class="field-hint">O aluno respondera em texto livre. A resposta sera enviada para correcao posterior do professor.</p>
      </div>
    {/if}

    <div class="field media-fieldset">
      <p class="field-label">Imagem da pergunta (opcional)</p>
      <div class="image-actions">
        <input
          class="sr-only"
          type="file"
          accept="image/*"
          bind:this={imageInput}
          onchange={handleImageSelected}
        />
        <button
          type="button"
          class="media-btn"
          onclick={triggerImagePicker}
          disabled={uploadingImage}
        >
          {uploadingImage ? 'Enviando imagem...' : challenge.imageUrl?.trim() ? 'Trocar imagem' : 'Anexar imagem'}
        </button>

        {#if challenge.imageUrl?.trim()}
          <button type="button" class="media-btn secondary" onclick={removeImage}>
            Remover imagem
          </button>
        {/if}
      </div>

      {#if imageUploadError}
        <p class="media-error">{imageUploadError}</p>
      {/if}

      {#if challenge.imageUrl?.trim()}
        <div class="image-preview-card">
          <img
            class="image-preview"
            src={challenge.imageUrl}
            alt={challenge.imageAlt?.trim() || 'Imagem da questão'}
          />
          {#if challenge.imageCaption?.trim()}
            <p class="image-preview-caption">{challenge.imageCaption}</p>
          {/if}
        </div>
      {/if}

      <input
        class="field-input google-input"
        bind:value={challenge.imageCaption}
        placeholder="Legenda da imagem (opcional)"
      />
    </div>
  </div>

  {#if errors.length > 0}
    <div class="inline-errors" role="status" aria-live="polite">
      <p class="inline-errors-title">Falta ajustar nesta pergunta:</p>
      <ul>
        {#each errors as error}
          <li>{error}</li>
        {/each}
      </ul>
    </div>
  {/if}

  <div class="card-footer">
    <div class="footer-tools">
      <div class="field inline">
        <label class="field-label-small" for={"difficulty-" + (challenge.id || 'new')}>Dificuldade:</label>
        <select
          id={"difficulty-" + (challenge.id || 'new')}
          class="field-input google-input small-input"
          bind:value={challenge.difficulty}
        >
          <option value={1}>Facil</option>
          <option value={2}>Medio</option>
          <option value={3}>Dificil</option>
        </select>
      </div>
    </div>

    <div class="footer-actions">
      <button
        class="icon-btn preview-btn-inline"
        onclick={() => showPreview = true}
        title="Pré-visualizar esta pergunta"
        aria-label="Pré-visualizar esta pergunta"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
      </button>
      <button class="icon-btn" onclick={onduplicate} title="Duplicar Pergunta" aria-label="Duplicar Pergunta">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
      </button>
      <button class="icon-btn danger remove-card" onclick={onremove} title="Excluir Pergunta">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/></svg>
      </button>
    </div>
  </div>
</div>

{#if showPreview}
  <ChallengePreviewModal
    challenge={challenge}
    onclose={() => showPreview = false}
  />
{/if}

<style>
  .challenge-form {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    display: flex;
    flex-direction: column;
    position: relative;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    transition: box-shadow var(--transition-normal);
    border-left: 6px solid transparent;
    margin-bottom: 1rem;
    overflow: hidden;
  }

  .challenge-form:focus-within {
    border-left-color: var(--color-primary);
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  }

  .form-header {
    display: flex;
    flex-direction: column;
  }

  .header-actions {
    align-self: flex-start;
    padding: 0 1.5rem 1rem 1.5rem;
  }

  .form-body {
    padding: 0 1.5rem 1rem 1.5rem;
  }

  .google-input, .google-textarea {
    background: transparent;
    border: none;
    border-bottom: 1px solid var(--color-border);
    border-radius: 0;
    color: var(--color-text);
    font-size: 1rem;
    font-family: var(--font-body);
    padding: 0.5rem 0.2rem;
    transition: border-bottom-color var(--transition-fast);
  }

  .google-input:focus, .google-textarea:focus {
    outline: none;
    border-bottom-color: var(--color-primary);
    border-bottom-width: 2px;
    padding-bottom: 0.4rem;
  }

  .prompt-input {
    font-size: 1.15rem;
    font-weight: 500;
    width: 100%;
    resize: none;
    background: rgba(255, 255, 255, 0.02);
    padding: 1.5rem 1.5rem 0.5rem 1.5rem;
    border-bottom: none;
  }

  .prompt-input:focus {
    background: rgba(255, 255, 255, 0.04);
    border-bottom-width: 1px;
    padding-bottom: 0.5rem;
  }

  .small-input {
    font-size: 0.9rem;
    padding: 0.2rem;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .field.inline {
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0;
  }

  .field-label {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--color-muted);
  }

  .field-hint {
    font-size: 0.76rem;
    color: var(--color-muted);
    opacity: 0.9;
    margin-top: -0.2rem;
  }

  .field-label-small {
    font-size: 0.75rem;
    color: var(--color-muted);
  }

  .flex-1 {
    flex: 1;
  }

  .option-row,
  .true-false-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }

  .icon {
    font-size: 1rem;
    color: var(--color-muted);
    min-width: 24px;
    text-align: center;
  }

  .radio-placeholder {
    font-size: 1.2rem;
  }

  .order-num {
    font-weight: 600;
    color: var(--color-text);
    font-size: 0.95rem;
    min-width: 24px;
    text-align: center;
  }

  .radio-label {
    display: flex;
    align-items: center;
    cursor: pointer;
  }

  .radio-label input[type="radio"] {
    width: 18px;
    height: 18px;
    accent-color: var(--color-primary);
  }

  .option-block {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    margin-bottom: 0.85rem;
    padding: 0.8rem 0.9rem;
    border: 1px solid rgba(255, 255, 255, 0.04);
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.015);
  }

  .feedback-input,
  .feedback-textarea {
    font-size: 0.92rem;
    color: var(--color-muted);
  }

  .media-fieldset {
    padding-top: 0.35rem;
    border-top: 1px solid rgba(148, 163, 184, 0.16);
  }

  .image-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem;
  }

  .media-btn {
    border: 1px solid rgba(139, 92, 246, 0.45);
    border-radius: 999px;
    background: rgba(139, 92, 246, 0.14);
    color: var(--color-text);
    font-size: 0.88rem;
    font-weight: 600;
    padding: 0.6rem 1rem;
    transition: background var(--transition-fast), border-color var(--transition-fast), transform var(--transition-fast);
  }

  .media-btn:hover:not(:disabled) {
    background: rgba(139, 92, 246, 0.22);
    border-color: rgba(139, 92, 246, 0.7);
    transform: translateY(-1px);
  }

  .media-btn:disabled {
    opacity: 0.7;
    cursor: wait;
  }

  .media-btn.secondary {
    border-color: rgba(148, 163, 184, 0.32);
    background: rgba(15, 23, 42, 0.35);
    color: var(--color-muted);
  }

  .media-btn.secondary:hover:not(:disabled) {
    border-color: rgba(248, 113, 113, 0.45);
    color: var(--color-text);
    background: rgba(127, 29, 29, 0.18);
  }

  .media-error {
    font-size: 0.82rem;
    color: var(--color-wrong);
    line-height: 1.4;
  }

  .image-preview-card {
    margin-top: 0.25rem;
    border: 1px solid rgba(148, 163, 184, 0.2);
    border-radius: 14px;
    background: rgba(15, 23, 42, 0.45);
    overflow: hidden;
    max-width: 420px;
  }

  .image-preview {
    width: 100%;
    display: block;
    height: auto;
    object-fit: contain;
    max-height: 240px;
    background: rgba(15, 23, 42, 0.55);
  }

  .image-preview-caption {
    padding: 0.65rem 0.8rem 0.75rem;
    font-size: 0.82rem;
    color: var(--color-muted);
    line-height: 1.4;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .feedback-textarea {
    resize: vertical;
    min-height: 72px;
  }

  .mini-btn {
    background: none;
    border: none;
    color: var(--color-muted);
    font-size: 0.9rem;
    cursor: pointer;
    padding: 0.4rem;
    transition: color var(--transition-fast);
  }

  .mini-btn:hover {
    color: var(--color-text);
  }

  .mini-btn.add {
    align-self: flex-start;
    margin-top: 0.5rem;
    color: var(--color-primary);
    font-weight: 500;
  }

  .mini-btn.add-inline {
    color: var(--color-muted);
    padding: 0.5rem 0.2rem;
  }

  .mini-btn.add-inline:hover {
    color: var(--color-primary);
    border-bottom: 1px solid var(--color-primary);
    padding-bottom: 0.4rem;
  }

  .card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    border-top: 1px solid var(--color-border);
    background: rgba(0,0,0,0.1);
  }

  .inline-errors {
    margin: 0 1.5rem 1rem 1.5rem;
    padding: 0.75rem 0.9rem;
    border: 1px solid rgba(248, 113, 113, 0.35);
    border-radius: 10px;
    background: rgba(248, 113, 113, 0.1);
    color: #fecaca;
  }

  .inline-errors-title {
    font-size: 0.8rem;
    font-weight: 700;
    margin-bottom: 0.35rem;
  }

  .inline-errors ul {
    margin: 0;
    padding-left: 1.05rem;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    font-size: 0.82rem;
  }

  .footer-tools {
    display: flex;
    gap: 1.5rem;
  }

  .footer-actions {
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }

  .icon-btn {
    background: none;
    border: none;
    color: var(--color-muted);
    cursor: pointer;
    padding: 0.4rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color var(--transition-fast), color var(--transition-fast);
  }

  .icon-btn:hover {
    background: rgba(255, 255, 255, 0.05);
    color: var(--color-text);
  }

  .icon-btn.preview-btn-inline:hover {
    background: rgba(139, 92, 246, 0.12);
    color: #c4b5fd;
  }

  .icon-btn.danger:hover {
    background: rgba(248, 113, 113, 0.1);
    color: var(--color-wrong);
  }

  .remove-card {
    padding: 0.5rem;
  }

  .tf-select {
    min-width: 140px;
  }
</style>
