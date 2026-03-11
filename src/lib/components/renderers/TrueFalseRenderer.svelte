<script>
  let { challenge, onAnswer } = $props();
  let selected = $state(null); // true | false | null
  let answered = $state(false);
  let showExplanation = $state(false);
  let isCorrect = $state(false);

  function choose(value) {
    if (answered) return;
    selected = value;
  }

  function confirm() {
    if (selected === null || answered) return;
    answered = true;
    const result = onAnswer(selected);
    isCorrect = result.correct;
    showExplanation = true;

    if (!result.correct) {
      setTimeout(() => {
        answered = false;
        selected = null;
        showExplanation = false;
      }, 3000);
    }
  }
</script>

<div class="renderer true-false-renderer">
  <p class="challenge-prompt">{challenge.prompt}</p>

  <div class="tf-buttons">
    <button
      class="tf-btn verdadeiro"
      class:selected={selected === true}
      class:correct={answered && selected === true && isCorrect}
      class:wrong={answered && selected === true && !isCorrect}
      onclick={() => choose(true)}
      disabled={answered}
    >
      ✓ Verdadeiro
    </button>
    <button
      class="tf-btn falso"
      class:selected={selected === false}
      class:correct={answered && selected === false && isCorrect}
      class:wrong={answered && selected === false && !isCorrect}
      onclick={() => choose(false)}
      disabled={answered}
    >
      ✗ Falso
    </button>
  </div>

  {#if selected !== null && !answered}
    <button class="confirm-btn" onclick={confirm}>
      Confirmar ✓
    </button>
  {/if}

  {#if showExplanation && challenge.explanation}
    <div class="explanation-box" class:correct-box={isCorrect} class:wrong-box={!isCorrect}>
      <p>{challenge.explanation}</p>
    </div>
  {/if}
</div>

<style>
  .true-false-renderer {
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

  .tf-buttons {
    display: flex;
    gap: 1.5rem;
  }

  .tf-btn {
    padding: 1.25rem 2.5rem;
    border: 2px solid var(--color-border, #334155);
    border-radius: 14px;
    background: var(--color-surface, #1e293b);
    color: var(--color-text, #e2e8f0);
    font-size: 1.15rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    min-width: 160px;
  }

  .tf-btn:hover:not(:disabled) {
    transform: translateY(-3px);
  }

  .tf-btn.verdadeiro:hover:not(:disabled) {
    border-color: #4ade80;
    box-shadow: 0 4px 16px rgba(74, 222, 128, 0.2);
  }

  .tf-btn.falso:hover:not(:disabled) {
    border-color: #f87171;
    box-shadow: 0 4px 16px rgba(248, 113, 113, 0.2);
  }

  .tf-btn.selected.verdadeiro {
    border-color: #4ade80;
    background: rgba(74, 222, 128, 0.1);
  }

  .tf-btn.selected.falso {
    border-color: #f87171;
    background: rgba(248, 113, 113, 0.1);
  }

  .tf-btn.correct {
    border-color: #4ade80;
    background: rgba(74, 222, 128, 0.2);
    animation: glow-correct 0.3s ease-in-out alternate 2;
  }

  .tf-btn.wrong {
    border-color: #f87171;
    background: rgba(248, 113, 113, 0.2);
    animation: glow-wrong 0.3s ease-in-out alternate 2;
  }

  .tf-btn:disabled {
    cursor: default;
    opacity: 0.6;
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

  .explanation-box {
    padding: 1rem 1.5rem;
    border-radius: 12px;
    max-width: 500px;
    text-align: center;
    animation: fadeIn 0.3s ease;
    font-size: 0.95rem;
    line-height: 1.5;
  }

  .correct-box {
    background: rgba(74, 222, 128, 0.1);
    border: 1px solid rgba(74, 222, 128, 0.3);
    color: #86efac;
  }

  .wrong-box {
    background: rgba(248, 113, 113, 0.1);
    border: 1px solid rgba(248, 113, 113, 0.3);
    color: #fca5a5;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
