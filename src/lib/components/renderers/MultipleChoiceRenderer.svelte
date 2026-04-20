<script>
  import './renderer-shared.css';
  let { challenge, onAnswer, onHint } = $props();

  let selectedId = $state(null);
  let feedbackText = $state('');
  let answered = $state(false);

  let feedbackTimerId = $state(null);

  function select(optionId) {
    if (answered) return;
    selectedId = optionId;
    feedbackText = '';
  }

  function askHint() {
    if (answered) return;

    const result = onHint?.();
    if (!result?.available) {
      feedbackText = result?.message || 'Bizu indisponível agora.';
      return;
    }

    feedbackText = result.hint;
  }

  function confirm() {
    if (!selectedId || answered) return;

    answered = true;
    const result = onAnswer(selectedId);

    if (!result.correct) {
      feedbackText = result.feedback || 'Bizu: leia com calma e elimine a alternativa que não combina com o enunciado.';

      if (feedbackTimerId) clearTimeout(feedbackTimerId);
      feedbackTimerId = setTimeout(() => {
        answered = false;
        selectedId = null;
        feedbackText = '';
        feedbackTimerId = null;
      }, 4800);
    }
  }

  $effect(() => {
    return () => {
      if (feedbackTimerId) clearTimeout(feedbackTimerId);
    };
  });
</script>

<div class="renderer multiple-choice-renderer">
  <p class="challenge-prompt">{challenge.prompt}</p>

  <div class="options-grid">
    {#each challenge.options as option (option.id)}
      <button
        class="option-btn"
        class:selected={selectedId === option.id}
        class:correct={answered && selectedId === option.id && option.correct}
        class:wrong={answered && selectedId === option.id && !option.correct}
        onclick={() => select(option.id)}
        disabled={answered}
      >
        {option.text}
      </button>
    {/each}
  </div>

  {#if selectedId && !answered}
    <button class="confirm-btn" onclick={confirm}>
      Confirmar
    </button>
  {/if}

  <div class="hint-row">
    <button class="hint-btn" onclick={askHint} disabled={answered} aria-label="Pedir bizu" title="Pedir bizu">
      💡
    </button>
  </div>

  {#if feedbackText}
    <div class="bizu-box">
      <span class="bizu-label">BIZU DO PROFESSOR</span>
      <p>{feedbackText}</p>
    </div>
  {/if}
</div>

<style>
  .multiple-choice-renderer {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
  }

  .challenge-prompt {
    font-size: 1.3rem;
    text-align: center;
    color: var(--color-text, #e2e8f0);
    line-height: 1.6;
    max-width: 600px;
  }

  .options-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
    width: 100%;
    max-width: 600px;
  }

  .option-btn {
    padding: 1rem 1.25rem;
    border: 2px solid var(--color-border, #334155);
    border-radius: 12px;
    background: var(--color-surface, #1e293b);
    color: var(--color-text, #e2e8f0);
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;
    line-height: 1.4;
  }

  .option-btn:hover:not(:disabled) {
    border-color: var(--color-primary, #8b5cf6);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.2);
  }

  .option-btn.selected {
    border-color: var(--color-primary, #8b5cf6);
    background: rgba(139, 92, 246, 0.15);
  }

  .option-btn.correct {
    border-color: #4ade80;
    background: rgba(74, 222, 128, 0.15);
    animation: glow-correct 0.3s ease-in-out alternate 2;
  }

  .option-btn.wrong {
    border-color: #f87171;
    background: rgba(248, 113, 113, 0.15);
    animation: glow-wrong 0.3s ease-in-out alternate 2;
  }

  .option-btn:disabled {
    cursor: default;
    opacity: 0.7;
  }

  .confirm-btn {
    padding: 0.75rem 2rem;
    border: none;
    border-radius: 10px;
    background: var(--color-primary, #8b5cf6);
    color: white;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .confirm-btn:hover {
    background: var(--color-primary-hover, #7c3aed);
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(139, 92, 246, 0.4);
  }


  @keyframes glow-correct {
    from { box-shadow: 0 0 5px var(--color-correct, #4ade80); }
    to   { box-shadow: 0 0 20px var(--color-correct, #4ade80), 0 0 40px rgba(74, 222, 128, 0.3); }
  }

  @keyframes glow-wrong {
    from { box-shadow: 0 0 5px var(--color-wrong, #f87171); }
    to   { box-shadow: 0 0 20px var(--color-wrong, #f87171), 0 0 40px rgba(248, 113, 113, 0.3); }
  }
</style>
