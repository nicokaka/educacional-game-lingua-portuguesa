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
    <textarea
      class="field-input google-textarea prompt-input"
      bind:value={challenge.prompt}
      placeholder={challenge.type === 'drag_drop' ? 'Use _____ para indicar a lacuna' : 'Digite a pergunta...'}
      rows="1"
    ></textarea>
    <div class="header-actions">
      <TypeSelector value={challenge.type} onchange={handleTypeChange} />
    </div>
  </div>

  <div class="form-body">
    {#if challenge.type === 'drag_drop'}
      <div class="field line-focus">
        <label class="field-label">Resposta Correta</label>
        <input class="field-input google-input" bind:value={challenge.correctAnswer} placeholder="Palavra que preenche a lacuna" />
      </div>

      <div class="field">
        <label class="field-label">Opções Falsas (Loot da Mochila)</label>
        {#each challenge.loot || [] as item, i}
          <div class="option-row">
            <span class="icon">🔹</span>
            <input class="field-input google-input flex-1" bind:value={item.text} placeholder="Opção falsa {i + 1}" />
            <button class="icon-btn danger" onclick={() => removeLoot(i)}>✕</button>
          </div>
        {/each}
        <button class="mini-btn add" onclick={addLoot}>+ Adicionar opção</button>
      </div>

    {:else if challenge.type === 'multiple_choice'}
      <div class="field">
        {#each challenge.options || [] as opt, i}
          <div class="option-block">
            <div class="option-row">
              <label class="radio-label">
                <!-- Truque visual: radio button ao inves de checkbox -->
                <input type="radio" name="correct_{challenge.id || Math.random()}" checked={opt.correct} onchange={() => {
                  challenge.options.forEach(o => o.correct = false);
                  opt.correct = true;
                }} />
              </label>
              <input class="field-input google-input flex-1" bind:value={opt.text} placeholder="Opção {i + 1}" />
              <button class="icon-btn danger" onclick={() => removeOption(i)}>✕</button>
            </div>
          </div>
        {/each}
        <div class="option-row">
           <span class="icon radio-placeholder">○</span>
           <button class="mini-btn add-inline" onclick={addOption}>Adicionar opção</button>
        </div>
      </div>

    {:else if challenge.type === 'true_false'}
      <div class="field line-focus">
        <label class="field-label">Resposta Correta</label>
        <select class="field-input google-input small-input" bind:value={challenge.correctAnswer}>
          <option value={true}>✅ Verdadeiro</option>
          <option value={false}>❌ Falso</option>
        </select>
      </div>

    {:else if challenge.type === 'ordering'}
      <div class="field">
        <label class="field-label">Fragmentos (na ordem correta da frase)</label>
        {#each challenge.fragments || [] as frag, i}
          <div class="option-row">
            <span class="order-num">{i + 1}.</span>
            <input class="field-input google-input flex-1" bind:value={challenge.fragments[i]} placeholder="Fragmento {i + 1}" />
            <button class="icon-btn danger" onclick={() => removeFragment(i)}>✕</button>
          </div>
        {/each}
        <button class="mini-btn add" onclick={addFragment}>+ Adicionar fragmento</button>
      </div>
    {/if}
  </div>

  <div class="card-footer">
    <div class="footer-tools">
      <div class="field inline">
        <label class="field-label-small">Dificuldade:</label>
        <select class="field-input google-input small-input" bind:value={challenge.difficulty}>
          <option value={1}>Fácil</option>
          <option value={2}>Médio</option>
          <option value={3}>Difícil</option>
        </select>
      </div>
    </div>
    
    <div class="footer-actions">
      <button class="icon-btn danger remove-card" onclick={onremove} title="Excluir Pergunta">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/></svg>
      </button>
    </div>
  </div>
</div>

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

  /* Efeito de foco tipo Google Forms */
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

  /* ── Google Forms Style Inputs ── */
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
    padding-bottom: 0.4rem; /* compensar 2px border */
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

  /* ── Fields ── */
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

  .field-label-small {
    font-size: 0.75rem;
    color: var(--color-muted);
  }

  .flex-1 {
    flex: 1;
  }

  /* ── Options/Fragments ── */
  .option-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.25rem;
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

  /* ── Mini buttons ── */
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
  
  /* ── Footer ── */
  .card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    border-top: 1px solid var(--color-border);
    background: rgba(0,0,0,0.1);
  }
  
  .footer-tools {
    display: flex;
    gap: 1.5rem;
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
  
  .icon-btn.danger:hover {
    background: rgba(248, 113, 113, 0.1);
    color: var(--color-wrong);
  }

  .remove-card {
    padding: 0.5rem;
  }
</style>
