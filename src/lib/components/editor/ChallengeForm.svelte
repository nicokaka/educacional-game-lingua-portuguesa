<script>
  import TypeSelector from './TypeSelector.svelte';

  let { challenge = $bindable(), onremove } = $props();

  // Handlers para opções dinâmicas (múltipla escolha)
  function addOption() {
    if (!challenge.options) challenge.options = [];
    challenge.options = [...challenge.options, { text: '', correct: false, feedback: '' }];
  }

  function removeOption(index) {
    challenge.options = challenge.options.filter((_, i) => i !== index);
  }

  // Handlers para loot (drag_drop)
  function addLoot() {
    if (!challenge.loot) challenge.loot = [];
    challenge.loot = [...challenge.loot, { text: '', correct: false }];
  }

  function removeLoot(index) {
    challenge.loot = challenge.loot.filter((_, i) => i !== index);
  }

  // Handlers para fragmentos (ordering)
  function addFragment() {
    if (!challenge.fragments) challenge.fragments = [];
    challenge.fragments = [...challenge.fragments, ''];
  }

  function removeFragment(index) {
    challenge.fragments = challenge.fragments.filter((_, i) => i !== index);
  }

  // Quando muda o tipo, reseta campos específicos
  function handleTypeChange(newType) {
    const base = { type: newType, prompt: challenge.prompt, difficulty: challenge.difficulty, monster: challenge.monster || { name: 'Monstro', sprite: 'monster_01' } };

    if (newType === 'drag_drop') {
      Object.assign(challenge, base, { correctAnswer: '', loot: [{ text: '', correct: true }, { text: '', correct: false }] });
    } else if (newType === 'multiple_choice') {
      Object.assign(challenge, base, { options: [{ text: '', correct: true, feedback: '' }, { text: '', correct: false, feedback: '' }] });
    } else if (newType === 'true_false') {
      Object.assign(challenge, base, { correctAnswer: true, explanation: '' });
    } else if (newType === 'ordering') {
      Object.assign(challenge, base, { fragments: ['', ''], shuffled: true });
    }

    // Limpa campos que não pertencem ao novo tipo
    if (newType !== 'drag_drop') { delete challenge.loot; delete challenge.correctAnswer; delete challenge.hint; }
    if (newType !== 'multiple_choice') { delete challenge.options; }
    if (newType !== 'true_false') { delete challenge.explanation; if (newType !== 'drag_drop') delete challenge.correctAnswer; }
    if (newType !== 'ordering') { delete challenge.fragments; delete challenge.shuffled; }

    challenge.type = newType;
  }
</script>

<div class="challenge-form">
  <div class="form-header">
    <TypeSelector value={challenge.type} onchange={handleTypeChange} />
    <button class="remove-btn" onclick={onremove} title="Remover desafio">🗑️</button>
  </div>

  <!-- Prompt (todos os tipos) -->
  <div class="field">
    <label class="field-label">Enunciado / Pergunta</label>
    <textarea
      class="field-input textarea"
      bind:value={challenge.prompt}
      placeholder={challenge.type === 'drag_drop' ? 'Use _____ para indicar a lacuna' : 'Digite a pergunta...'}
      rows="2"
    ></textarea>
  </div>

  <!-- Dificuldade -->
  <div class="field inline">
    <label class="field-label">Dificuldade</label>
    <select class="field-input small" bind:value={challenge.difficulty}>
      <option value={1}>⭐ Fácil</option>
      <option value={2}>⭐⭐ Médio</option>
      <option value={3}>⭐⭐⭐ Difícil</option>
    </select>
  </div>

  <!-- Nome do monstro -->
  <div class="field">
    <label class="field-label">Nome do Monstro</label>
    <input class="field-input" bind:value={challenge.monster.name} placeholder="Ex: Gram-Monstro" />
  </div>

  <!-- ═══ Campos por tipo ═══ -->

  {#if challenge.type === 'drag_drop'}
    <div class="field">
      <label class="field-label">Resposta Correta</label>
      <input class="field-input" bind:value={challenge.correctAnswer} placeholder="Palavra que preenche a lacuna" />
    </div>

    <div class="field">
      <label class="field-label">Opções (Loot da Mochila)</label>
      {#each challenge.loot || [] as item, i}
        <div class="option-row">
          <input class="field-input flex-1" bind:value={item.text} placeholder="Opção {i + 1}" />
          <label class="checkbox-label">
            <input type="checkbox" bind:checked={item.correct} /> ✅
          </label>
          <button class="mini-btn danger" onclick={() => removeLoot(i)}>✕</button>
        </div>
      {/each}
      <button class="mini-btn add" onclick={addLoot}>+ Adicionar opção</button>
    </div>

  {:else if challenge.type === 'multiple_choice'}
    <div class="field">
      <label class="field-label">Alternativas</label>
      {#each challenge.options || [] as opt, i}
        <div class="option-block">
          <div class="option-row">
            <input class="field-input flex-1" bind:value={opt.text} placeholder="Alternativa {i + 1}" />
            <label class="checkbox-label">
              <input type="checkbox" bind:checked={opt.correct} /> ✅
            </label>
            <button class="mini-btn danger" onclick={() => removeOption(i)}>✕</button>
          </div>
          <input class="field-input feedback-input" bind:value={opt.feedback} placeholder="Feedback (exibido se o aluno escolher esta)" />
        </div>
      {/each}
      <button class="mini-btn add" onclick={addOption}>+ Adicionar alternativa</button>
    </div>

  {:else if challenge.type === 'true_false'}
    <div class="field inline">
      <label class="field-label">Resposta Correta</label>
      <select class="field-input small" bind:value={challenge.correctAnswer}>
        <option value={true}>✅ Verdadeiro</option>
        <option value={false}>❌ Falso</option>
      </select>
    </div>

    <div class="field">
      <label class="field-label">Explicação (exibida após resposta)</label>
      <textarea class="field-input textarea" bind:value={challenge.explanation} placeholder="Explique por que é verdadeiro ou falso..." rows="2"></textarea>
    </div>

  {:else if challenge.type === 'ordering'}
    <div class="field">
      <label class="field-label">Fragmentos (na ordem correta)</label>
      {#each challenge.fragments || [] as frag, i}
        <div class="option-row">
          <span class="order-num">{i + 1}.</span>
          <input class="field-input flex-1" bind:value={challenge.fragments[i]} placeholder="Fragmento {i + 1}" />
          <button class="mini-btn danger" onclick={() => removeFragment(i)}>✕</button>
        </div>
      {/each}
      <button class="mini-btn add" onclick={addFragment}>+ Adicionar fragmento</button>
      <p class="field-hint">Os fragmentos serão embaralhados automaticamente para o aluno.</p>
    </div>
  {/if}
</div>

<style>
  .challenge-form {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .form-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
  }

  .remove-btn {
    background: none;
    border: 1px solid transparent;
    font-size: 1.2rem;
    cursor: pointer;
    padding: 0.4rem;
    border-radius: var(--radius-sm);
    transition: all var(--transition-fast);
  }

  .remove-btn:hover {
    background: rgba(248, 113, 113, 0.1);
    border-color: var(--color-wrong);
  }

  /* ── Fields ── */
  .field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .field.inline {
    flex-direction: row;
    align-items: center;
    gap: 0.75rem;
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
    font-size: 0.9rem;
    font-family: var(--font-body);
    transition: border-color var(--transition-fast);
  }

  .field-input:focus {
    border-color: var(--color-primary);
    outline: none;
  }

  .field-input.textarea {
    resize: vertical;
    min-height: 60px;
  }

  .field-input.small {
    max-width: 200px;
  }

  .field-input.flex-1 {
    flex: 1;
  }

  .field-hint {
    font-size: 0.75rem;
    color: var(--color-muted);
    opacity: 0.7;
    font-style: italic;
  }

  .feedback-input {
    margin-left: 0;
    font-size: 0.8rem;
    opacity: 0.8;
  }

  /* ── Options/Fragments ── */
  .option-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.35rem;
  }

  .option-block {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-bottom: 0.5rem;
  }

  .order-num {
    font-weight: 700;
    color: var(--color-primary);
    font-size: 0.9rem;
    min-width: 1.5rem;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.85rem;
    cursor: pointer;
    white-space: nowrap;
  }

  .checkbox-label input[type="checkbox"] {
    width: 16px;
    height: 16px;
    accent-color: var(--color-correct);
  }

  /* ── Mini buttons ── */
  .mini-btn {
    padding: 0.3rem 0.6rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    color: var(--color-muted);
    font-size: 0.75rem;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .mini-btn:hover {
    border-color: var(--color-primary);
    color: var(--color-text);
  }

  .mini-btn.danger:hover {
    border-color: var(--color-wrong);
    color: var(--color-wrong);
  }

  .mini-btn.add {
    align-self: flex-start;
    margin-top: 0.25rem;
  }
</style>
