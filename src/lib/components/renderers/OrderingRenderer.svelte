<script>
  import './renderer-shared.css';
  let { challenge, onAnswer, onHint } = $props();

  let answered = $state(false);
  let playerOrder = $state([]);
  let feedbackText = $state('');

  // â”€â”€ Drag state (PointerEvents â€” funciona em mobile e desktop) â”€â”€
  let dragIndex = $state(-1);
  let dragPointerId = $state(null);
  let overIndex = $state(-1);
  let feedbackTimerId = null;

  // â”€â”€ Ghost (indicador visual do item sendo arrastado) â”€â”€
  let ghost = $state({ visible: false, text: '', x: 0, y: 0, width: 0, height: 0 });
  let dragOffset = { x: 0, y: 0 };
  let dragStartPoint = { x: 0, y: 0 };
  let suppressClick = false;

  $effect(() => {
    playerOrder = [...challenge.displayFragments];
    answered = false;
    dragIndex = -1;
    overIndex = -1;
    feedbackText = '';
    ghost = { visible: false, text: '', x: 0, y: 0, width: 0, height: 0 };
    return () => { if (feedbackTimerId) clearTimeout(feedbackTimerId); };
  });

  function handlePointerDown(event, index) {
    if (answered) return;

    const rect = event.currentTarget.getBoundingClientRect();
    dragIndex = index;
    dragPointerId = event.pointerId;
    suppressClick = false;

    dragOffset = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    dragStartPoint = { x: event.clientX, y: event.clientY };

    ghost = {
      visible: true,
      text: playerOrder[index] ?? '',
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
    };

    event.currentTarget.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }

  function handlePointerMove(event) {
    if (dragPointerId !== event.pointerId || dragIndex < 0) return;

    const movedEnough =
      Math.abs(event.clientX - dragStartPoint.x) > 6 ||
      Math.abs(event.clientY - dragStartPoint.y) > 6;

    if (movedEnough) suppressClick = true;

    ghost = {
      ...ghost,
      x: event.clientX - dragOffset.x,
      y: event.clientY - dragOffset.y,
    };
  }

  function handlePointerUp(event) {
    if (dragPointerId !== event.pointerId || dragIndex < 0) return;

    if (suppressClick && overIndex >= 0 && overIndex !== dragIndex) {
      reorder(dragIndex, overIndex);
    }

    dragIndex = -1;
    dragPointerId = null;
    overIndex = -1;
    suppressClick = false;
    ghost = { visible: false, text: '', x: 0, y: 0, width: 0, height: 0 };
  }

  function handlePointerCancel() {
    dragIndex = -1;
    dragPointerId = null;
    overIndex = -1;
    suppressClick = false;
    ghost = { visible: false, text: '', x: 0, y: 0, width: 0, height: 0 };
  }

  function handleChipPointerEnter(index) {
    if (dragIndex < 0 || index === dragIndex) return;
    overIndex = index;
  }

  /** Move item de fromIndex para toIndex. */
  function reorder(fromIndex, toIndex) {
    const next = [...playerOrder];
    const [item] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, item);
    playerOrder = next;
  }

  /**
   * Click simples (sem drag): troca o chip clicado com o vizinho seguinte.
   * Em mobile isso funciona como reordenaÃ§Ã£o simples.
   */
  function handleChipClick(index) {
    if (suppressClick) { suppressClick = false; return; }
    if (answered || playerOrder.length < 2) return;

    // Troca com o prÃ³ximo (ou vai para o inÃ­cio se for o Ãºltimo)
    const next = [...playerOrder];
    const swapWith = (index + 1) % next.length;
    [next[index], next[swapWith]] = [next[swapWith], next[index]];
    playerOrder = next;
  }

  function confirm() {
    if (answered) return;

    answered = true;
    const result = onAnswer(playerOrder);

    if (!result.correct) {
      feedbackText = result.feedback || 'Bizu: tente montar a frase na ordem em que ela faria sentido quando lida em voz alta.';

      if (feedbackTimerId) clearTimeout(feedbackTimerId);
      feedbackTimerId = setTimeout(() => {
        answered = false;
        feedbackText = '';
        feedbackTimerId = null;
      }, 4800);
    }
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

  <div class="ordering-track" role="list">
    {#each playerOrder as fragment, index (fragment + '-' + index)}
      <button
        type="button"
        class="order-chip"
        class:dragging={dragIndex === index}
        class:drag-over={overIndex === index && dragIndex >= 0}
        class:correct={isInCorrectPos(index)}
        class:wrong={isInWrongPos(index)}
        aria-label={`PosiÃ§Ã£o ${index + 1}: ${fragment}. Clique para trocar de posiÃ§Ã£o.`}
        onpointerdown={(e) => handlePointerDown(e, index)}
        onpointermove={handlePointerMove}
        onpointerup={handlePointerUp}
        onpointercancel={handlePointerCancel}
        onlostpointercapture={handlePointerCancel}
        onpointerenter={() => handleChipPointerEnter(index)}
        onclick={() => handleChipClick(index)}
        style="touch-action: none;"
        disabled={answered}
      >
        <span class="order-number">{index + 1}</span>
        {fragment}
      </button>
    {/each}
  </div>

  <p class="hint-text">Arraste os cards para reordenar â€¢ Toque para trocar de posiÃ§Ã£o</p>

  {#if !answered}
    <button class="confirm-btn" onclick={confirm}>
      Confirmar
    </button>
  {/if}

  <div class="hint-row">
    <button class="hint-btn" onclick={askHint} disabled={answered} aria-label="Pedir bizu" title="Pedir bizu">
      ðŸ’¡
    </button>
  </div>

  {#if feedbackText}
    <div class="bizu-box">
      <span class="bizu-label">BIZU DO PROFESSOR</span>
      <p>{feedbackText}</p>
    </div>
  {/if}

  {#if ghost.visible}
    <div
      class="drag-ghost"
      style={`left:${ghost.x}px; top:${ghost.y}px; width:${ghost.width}px; min-height:${ghost.height}px;`}
      aria-hidden="true"
    >
      {ghost.text}
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
    max-width: 620px;
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
    transition: all 0.15s ease;
  }

  .order-chip:hover:not(.dragging) {
    border-color: var(--color-primary, #8b5cf6);
    transform: translateY(-2px);
  }

  .order-chip.dragging {
    opacity: 0.18;
    cursor: grabbing;
    transform: scale(0.97);
  }

  .order-chip.drag-over {
    border-color: var(--color-primary, #8b5cf6);
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.22);
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
    text-align: center;
  }

  .drag-ghost {
    position: fixed;
    z-index: 1200;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem 1.25rem;
    border: 2px solid var(--color-primary, #8b5cf6);
    border-radius: 10px;
    background: rgba(15, 23, 42, 0.96);
    color: var(--color-text, #e2e8f0);
    font-size: 1.05rem;
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.3);
    pointer-events: none;
    opacity: 0.95;
  }

  @media (max-width: 640px) {
    .order-chip {
      padding: 0.85rem 1rem;
      width: 100%;
      justify-content: flex-start;
      cursor: pointer;
    }

    .ordering-track {
      flex-direction: column;
      align-items: stretch;
      width: 100%;
      max-width: 480px;
    }
  }
</style>
