<script>
  let { challenge, onAnswer } = $props();

  let answered = $state(false);
  let playerOrder = $state([]);
  let dragIndex = $state(-1);
  let feedbackText = $state('');

  $effect(() => {
    playerOrder = [...challenge.displayFragments];
    answered = false;
    dragIndex = -1;
    feedbackText = '';
  });

  function onDragStart(index) {
    if (answered) return;
    dragIndex = index;
  }

  function onDragOver(event, index) {
    event.preventDefault();
    if (dragIndex < 0 || dragIndex === index) return;

    const newOrder = [...playerOrder];
    const [dragged] = newOrder.splice(dragIndex, 1);
    newOrder.splice(index, 0, dragged);
    playerOrder = newOrder;
    dragIndex = index;
  }

  function onDragEnd() {
    dragIndex = -1;
  }

  function confirm() {
    if (answered) return;

    answered = true;
    const result = onAnswer(playerOrder);

    if (!result.correct) {
      feedbackText = result.feedback || 'Bizu: tente montar a frase na ordem em que ela faria sentido quando lida em voz alta.';

      setTimeout(() => {
        answered = false;
        feedbackText = '';
      }, 2500);
    }
  }

  function isInCorrectPos(index) {
    if (!answered) return false;
    return playerOrder[index] === challenge.fragments[index];
  }

  function isInWrongPos(index) {
    if (!answered) return false;
    return playerOrder[index] !== challenge.fragments[index];
  }
</script>

<div class="renderer ordering-renderer">
  <p class="challenge-prompt">{challenge.prompt}</p>

  <div class="ordering-track">
    {#each playerOrder as fragment, index (fragment + '-' + index)}
      <div
        class="order-chip"
        class:dragging={dragIndex === index}
        class:correct={isInCorrectPos(index)}
        class:wrong={isInWrongPos(index)}
        draggable="true"
        ondragstart={() => onDragStart(index)}
        ondragover={(event) => onDragOver(event, index)}
        ondragend={onDragEnd}
        role="listitem"
      >
        <span class="order-number">{index + 1}</span>
        {fragment}
      </div>
    {/each}
  </div>

  <p class="hint-text">Arraste os cards para reordenar</p>

  {#if !answered}
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
  .ordering-renderer {
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

  .ordering-track {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    justify-content: center;
    max-width: 600px;
  }

  .order-chip {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.25rem;
    border: 2px solid var(--color-border, #334155);
    border-radius: 10px;
    background: var(--color-surface, #1e293b);
    color: var(--color-text, #e2e8f0);
    font-size: 1.05rem;
    cursor: grab;
    user-select: none;
    transition: all 0.15s ease;
  }

  .order-chip:hover {
    border-color: var(--color-primary, #8b5cf6);
    transform: translateY(-2px);
  }

  .order-chip.dragging {
    opacity: 0.5;
    cursor: grabbing;
  }

  .order-chip.correct {
    border-color: #4ade80;
    background: rgba(74, 222, 128, 0.15);
  }

  .order-chip.wrong {
    border-color: #f87171;
    background: rgba(248, 113, 113, 0.15);
  }

  .order-number {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--color-primary, #8b5cf6);
    color: white;
    font-size: 0.75rem;
    font-weight: 700;
    flex-shrink: 0;
  }

  .hint-text {
    font-size: 0.85rem;
    color: var(--color-muted, #94a3b8);
    font-style: italic;
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

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
