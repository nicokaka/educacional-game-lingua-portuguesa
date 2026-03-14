<script>
  let { challenge, onAnswer } = $props();

  let answered = $state(false);
  let selections = $state([]);
  let feedbackText = $state('');

  let statements = $derived(
    Array.isArray(challenge?.statements) && challenge.statements.length > 0
      ? challenge.statements
      : [{ text: challenge?.prompt || '', correctAnswer: challenge?.correctAnswer }]
  );

  let isMultiStatement = $derived(statements.length > 1);

  let showPrompt = $derived(
    Array.isArray(challenge?.statements) && challenge.statements.length > 0
  );

  $effect(() => {
    selections = statements.map(() => null);
    answered = false;
    feedbackText = '';
  });

  function choose(index, value) {
    if (answered) return;
    selections = selections.map((current, currentIndex) =>
      currentIndex === index ? value : current
    );
  }

  function canConfirm() {
    return selections.length > 0 && selections.every((value) => typeof value === 'boolean');
  }

  function confirm() {
    if (!canConfirm() || answered) return;

    answered = true;
    const result = onAnswer(selections);

    if (!result.correct) {
      feedbackText = result.feedback || 'Bizu: leia cada afirmacao com calma e procure a palavra que muda o sentido.';

      setTimeout(() => {
        answered = false;
        selections = statements.map(() => null);
        feedbackText = '';
      }, 3000);
    }
  }

  function isStatementCorrect(index, value) {
    return answered && selections[index] === value && statements[index]?.correctAnswer === value;
  }

  function isStatementWrong(index, value) {
    return answered && selections[index] === value && statements[index]?.correctAnswer !== value;
  }
</script>

<div class="renderer true-false-renderer">
  {#if showPrompt}
    <p class="challenge-prompt">{challenge.prompt}</p>
  {/if}

  <div class="statements-list">
    {#each statements as statement, index}
      <div class="statement-card" class:single-statement={!isMultiStatement}>
        {#if isMultiStatement}
          <div class="statement-meta">Afirmacao {index + 1}</div>
        {/if}
        <p class="statement-text">{statement.text}</p>
        <div class="tf-buttons">
          <button
            class="tf-btn verdadeiro"
            class:selected={selections[index] === true}
            class:correct={isStatementCorrect(index, true)}
            class:wrong={isStatementWrong(index, true)}
            onclick={() => choose(index, true)}
            disabled={answered}
          >
            <span class="tf-badge" aria-hidden="true">✓</span>
            <span class="tf-label">Verdadeiro</span>
          </button>
          <button
            class="tf-btn falso"
            class:selected={selections[index] === false}
            class:correct={isStatementCorrect(index, false)}
            class:wrong={isStatementWrong(index, false)}
            onclick={() => choose(index, false)}
            disabled={answered}
          >
            <span class="tf-badge" aria-hidden="true">✕</span>
            <span class="tf-label">Falso</span>
          </button>
        </div>
      </div>
    {/each}
  </div>

  {#if canConfirm() && !answered}
    <button class="confirm-btn" onclick={confirm}>
      Confirmar
    </button>
  {/if}

  {#if feedbackText}
    <div class="bizu-box">
      <span class="bizu-label">BIZU</span>
      <p>{feedbackText}</p>
    </div>
  {/if}
</div>

<style>
  .true-false-renderer {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.25rem;
  }

  .challenge-prompt {
    font-size: 1.2rem;
    text-align: center;
    color: var(--color-text, #e2e8f0);
    line-height: 1.6;
    max-width: 680px;
  }

  .statements-list {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .statement-card {
    width: 100%;
    max-width: 680px;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.015));
    border: 1px solid rgba(148, 163, 184, 0.18);
    border-radius: 18px;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 1.15rem;
    box-shadow: 0 14px 32px rgba(2, 6, 23, 0.18);
  }

  .statement-card.single-statement {
    max-width: 780px;
    padding: 1.6rem;
  }

  .statement-meta {
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-muted, #94a3b8);
    text-align: left;
  }

  .statement-text {
    font-size: 1.08rem;
    color: var(--color-text, #e2e8f0);
    line-height: 1.65;
    text-align: center;
  }

  .single-statement .statement-text {
    font-size: 1.4rem;
    line-height: 1.6;
    max-width: 32ch;
    align-self: center;
  }

  .tf-buttons {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 220px));
    gap: 0.9rem;
    justify-content: center;
    align-self: center;
    width: 100%;
    max-width: 520px;
  }

  .tf-btn {
    padding: 1rem 1.15rem;
    border: 2px solid rgba(148, 163, 184, 0.22);
    border-radius: 16px;
    background: rgba(15, 23, 42, 0.72);
    color: var(--color-text, #e2e8f0);
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
    min-width: 150px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.8rem;
    text-align: center;
    min-height: 74px;
  }

  .tf-btn:hover:not(:disabled) {
    transform: translateY(-2px);
  }

  .tf-btn.verdadeiro:hover:not(:disabled) {
    border-color: #4ade80;
    box-shadow: 0 10px 24px rgba(74, 222, 128, 0.18);
  }

  .tf-btn.falso:hover:not(:disabled) {
    border-color: #f87171;
    box-shadow: 0 10px 24px rgba(248, 113, 113, 0.18);
  }

  .tf-btn.selected.verdadeiro {
    border-color: #4ade80;
    background: linear-gradient(180deg, rgba(34, 197, 94, 0.22), rgba(34, 197, 94, 0.1));
  }

  .tf-btn.selected.falso {
    border-color: #f87171;
    background: linear-gradient(180deg, rgba(239, 68, 68, 0.22), rgba(239, 68, 68, 0.1));
  }

  .tf-btn.correct {
    border-color: #4ade80;
    background: linear-gradient(180deg, rgba(74, 222, 128, 0.24), rgba(74, 222, 128, 0.12));
    animation: glow-correct 0.3s ease-in-out alternate 2;
  }

  .tf-btn.wrong {
    border-color: #f87171;
    background: linear-gradient(180deg, rgba(248, 113, 113, 0.24), rgba(248, 113, 113, 0.12));
    animation: glow-wrong 0.3s ease-in-out alternate 2;
  }

  .tf-btn:disabled {
    cursor: default;
    opacity: 0.75;
  }

  .tf-badge {
    width: 2.5rem;
    height: 2.5rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.08);
    font-size: 1.1rem;
    font-weight: 800;
    flex-shrink: 0;
  }

  .verdadeiro .tf-badge {
    color: #86efac;
  }

  .falso .tf-badge {
    color: #fca5a5;
  }

  .tf-label {
    font-size: 1rem;
    font-weight: 700;
    letter-spacing: 0.01em;
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

  .bizu-box {
    width: 100%;
    max-width: 560px;
    padding: 1rem 1.15rem;
    border-radius: 14px;
    border: 1px solid rgba(251, 191, 36, 0.35);
    background: linear-gradient(180deg, rgba(251, 191, 36, 0.12), rgba(245, 158, 11, 0.08));
    color: #fde68a;
    text-align: left;
    animation: fadeIn 0.25s ease;
  }

  .bizu-label {
    display: inline-block;
    margin-bottom: 0.4rem;
    font-size: 0.78rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    color: #fcd34d;
  }

  .bizu-box p {
    line-height: 1.55;
  }

  @media (max-width: 640px) {
    .statement-card,
    .statement-card.single-statement {
      padding: 1.15rem;
    }

    .tf-buttons {
      grid-template-columns: 1fr;
      max-width: 100%;
    }

    .tf-btn {
      width: 100%;
      min-height: 70px;
    }

    .single-statement .statement-text {
      font-size: 1.22rem;
    }
  }
</style>
