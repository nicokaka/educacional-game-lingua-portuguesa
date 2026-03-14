<script>
  let { challenge, onAnswer, onHint } = $props();

  let selectedId = $state(null);
  let feedbackText = $state('');
  let answered = $state(false);

  function select(optionId) {
    if (answered) return;
    selectedId = optionId;
    feedbackText = '';
  }

  function askHint() {
    if (answered) return;

    const result = onHint?.();
    if (!result?.available) {
      feedbackText = result?.message || 'Bizu indisponivel agora.';
      return;
    }

    feedbackText = result.hint;
  }

  function confirm() {
    if (!selectedId || answered) return;

    answered = true;
    const result = onAnswer(selectedId);

    if (!result.correct) {
      feedbackText = result.feedback || 'Bizu: leia com calma e elimine a alternativa que nao combina com o enunciado.';

      setTimeout(() => {
        answered = false;
        selectedId = null;
        feedbackText = '';
      }, 4800);
    }
  }
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

  .hint-row {
    width: 100%;
    max-width: 620px;
    display: flex;
    justify-content: flex-end;
  }

  .hint-btn {
    width: 42px;
    height: 42px;
    border-radius: 999px;
    border: 1px solid rgba(250, 204, 21, 0.45);
    background: rgba(250, 204, 21, 0.12);
    color: #fde68a;
    font-size: 1.2rem;
    line-height: 1;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s ease;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .hint-btn:hover:not(:disabled) {
    transform: translateY(-1px) scale(1.04);
    background: rgba(250, 204, 21, 0.18);
    box-shadow: 0 8px 18px rgba(15, 23, 42, 0.2);
  }

  .hint-btn:disabled {
    opacity: 0.55;
    cursor: default;
  }

  .bizu-box {
    width: 100%;
    max-width: 620px;
    padding: 1rem 1.15rem;
    border-radius: 16px;
    border: 1px solid rgba(250, 204, 21, 0.45);
    border-left: 4px solid #facc15;
    background: linear-gradient(
      135deg,
      rgba(250, 204, 21, 0.18),
      rgba(251, 191, 36, 0.08) 45%,
      rgba(15, 23, 42, 0.25)
    );
    color: #fef3c7;
    text-align: left;
    box-shadow: 0 8px 22px rgba(15, 23, 42, 0.2);
    animation: bizu-enter 0.25s ease;
  }

  .bizu-label {
    display: inline-block;
    margin-bottom: 0.4rem;
    font-size: 0.76rem;
    font-weight: 800;
    letter-spacing: 0.09em;
    color: #fde68a;
  }

  .bizu-box p {
    line-height: 1.6;
    font-size: 0.98rem;
  }

  @keyframes bizu-enter {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
