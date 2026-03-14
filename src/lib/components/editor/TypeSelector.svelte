<script>
  let { value = 'drag_drop', onchange } = $props();

  const types = [
    { value: 'drag_drop', label: '🎯 Arrastar e Soltar', desc: 'Preencher lacuna arrastando a palavra' },
    { value: 'multiple_choice', label: '📝 Múltipla Escolha', desc: 'Escolher entre 4 alternativas' },
    { value: 'true_false', label: '✅ Verdadeiro ou Falso', desc: 'Marcar cada afirmação como verdadeira ou falsa' },
    { value: 'ordering', label: '🔢 Ordenação', desc: 'Colocar fragmentos na ordem certa' },
  ];

  function handleChange(e) {
    onchange?.(e.target.value);
  }
</script>

<div class="type-selector">
  <label class="type-label" for="type-select">Tipo de Desafio</label>
  <select id="type-select" class="type-select" {value} onchange={handleChange}>
    {#each types as t}
      <option value={t.value}>{t.label}</option>
    {/each}
  </select>
  <p class="type-desc">
    {types.find(t => t.value === value)?.desc || ''}
  </p>
</div>

<style>
  .type-selector {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .type-label {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .type-select {
    padding: 0.6rem 0.75rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    color: var(--color-text);
    font-size: 0.95rem;
    font-family: var(--font-body);
    cursor: pointer;
    transition: border-color var(--transition-fast);
  }

  .type-select:focus {
    border-color: var(--color-primary);
    outline: none;
  }

  .type-desc {
    font-size: 0.75rem;
    color: var(--color-muted);
    opacity: 0.7;
  }
</style>
