<script>
  import './renderer-shared.css';
  let { challenge, onAnswer, onHint } = $props();

  let answered = $state(false);
  let items = $state([]);
  let slotted = $state(null);
  let answerWasCorrect = $state(null);
  let draggingIndex = $state(null);
  let isDropZoneActive = $state(false);
  let suppressClick = $state(false);
  let feedbackText = $state('');
  let ghost = $state({
    visible: false,
    text: '',
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  let dropZoneEl = $state(null);
  let dragPointerId = null;
  let dragOffset = { x: 0, y: 0 };
  let dragStartPoint = { x: 0, y: 0 };
  let feedbackTimerId = null;

  $effect(() => {
    items = [...challenge.loot];
    slotted = null;
    answered = false;
    answerWasCorrect = null;
    feedbackText = '';
    clearDragState();
  });

  function clearDragState() {
    draggingIndex = null;
    dragPointerId = null;
    isDropZoneActive = false;
    ghost = {
      visible: false,
      text: '',
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    };
  }

  function placeItem(index) {
    if (answered || index === null || index < 0 || index >= items.length) return;

    const selectedItem = items[index];
    if (!selectedItem) return;

    if (slotted) {
      items = [...items.filter((_, currentIndex) => currentIndex !== index), slotted];
    } else {
      items = items.filter((_, currentIndex) => currentIndex !== index);
    }

    slotted = selectedItem;
  }

  function removeSlot() {
    if (answered || !slotted) return;
    items = [...items, slotted];
    slotted = null;
    answerWasCorrect = null;
    feedbackText = '';
  }

  function isPointerInsideDropZone(clientX, clientY) {
    if (!dropZoneEl) return false;
    const rect = dropZoneEl.getBoundingClientRect();
    return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
  }

  function handlePointerDown(event, index) {
    if (answered) return;

    const rect = event.currentTarget.getBoundingClientRect();
    draggingIndex = index;
    dragPointerId = event.pointerId;
    dragOffset = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    dragStartPoint = {
      x: event.clientX,
      y: event.clientY,
    };
    suppressClick = false;

    ghost = {
      visible: true,
      text: items[index]?.text || '',
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
    };

    event.currentTarget.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }

  function handlePointerMove(event) {
    if (dragPointerId !== event.pointerId || draggingIndex === null) return;

    const movedEnough =
      Math.abs(event.clientX - dragStartPoint.x) > 6 ||
      Math.abs(event.clientY - dragStartPoint.y) > 6;

    if (movedEnough) {
      suppressClick = true;
    }

    ghost = {
      ...ghost,
      x: event.clientX - dragOffset.x,
      y: event.clientY - dragOffset.y,
    };

    isDropZoneActive = isPointerInsideDropZone(event.clientX, event.clientY);
  }

  function handlePointerUp(event) {
    if (dragPointerId !== event.pointerId || draggingIndex === null) return;

    if (suppressClick && isPointerInsideDropZone(event.clientX, event.clientY)) {
      placeItem(draggingIndex);
    }

    clearDragState();
  }

  function handlePointerCancel() {
    clearDragState();
  }

  function handleChipClick(index) {
    if (suppressClick) {
      suppressClick = false;
      return;
    }

    placeItem(index);
  }

  function confirm() {
    if (!slotted || answered) return;

    answered = true;
    const result = onAnswer(slotted.text);
    answerWasCorrect = result.correct;

    if (!result.correct) {
      feedbackText = result.feedback || 'Bizu: volte para o enunciado e pense em qual palavra completa a frase com sentido.';

      if (feedbackTimerId) clearTimeout(feedbackTimerId);
      feedbackTimerId = setTimeout(() => {
        answered = false;
        answerWasCorrect = null;
        feedbackText = '';
        items = [...items, slotted];
        slotted = null;
        feedbackTimerId = null;
      }, 4800);
    }
  }

  $effect(() => {
    return () => { if (feedbackTimerId) clearTimeout(feedbackTimerId); };
  });

  function askHint() {
    if (answered) return;

    const result = onHint?.();
    if (!result?.available) {
      feedbackText = result?.message || 'Bizu indisponivel agora.';
      return;
    }

    feedbackText = result.hint;
  }

  let promptText = $derived(String(challenge?.prompt || ''));
  let hasPlaceholder = $derived(promptText.includes('_____'));
  let promptParts = $derived(hasPlaceholder ? promptText.split('_____') : [promptText, '']);
</script>

<div class="renderer drag-drop-renderer">
  {#if hasPlaceholder}
    <div class="phrase-container">
      <span class="phrase-text">{promptParts[0]}</span>
      <button
        type="button"
        class="drop-zone"
        class:filled={slotted}
        class:drop-active={isDropZoneActive}
        class:correct={answered && answerWasCorrect === true}
        class:wrong={answered && answerWasCorrect === false}
        bind:this={dropZoneEl}
        onclick={removeSlot}
      >
        {#if slotted}
          {slotted.text}
        {:else}
          Solte aqui
        {/if}
      </button>
      {#if promptParts[1]}
        <span class="phrase-text">{promptParts[1]}</span>
      {/if}
    </div>
  {:else}
    <div class="prompt-block">
      <p class="prompt-standalone">{promptText}</p>
      <div class="answer-box">
        <span class="answer-label">Complete com:</span>
        <button
          type="button"
          class="drop-zone"
          class:filled={slotted}
          class:drop-active={isDropZoneActive}
          class:correct={answered && answerWasCorrect === true}
          class:wrong={answered && answerWasCorrect === false}
          bind:this={dropZoneEl}
          onclick={removeSlot}
        >
          {#if slotted}
            {slotted.text}
          {:else}
            Solte aqui
          {/if}
        </button>
      </div>
    </div>
  {/if}

  <div class="backpack">
    <p class="backpack-label">Mochila</p>
    <div class="backpack-items">
      {#each items as item, index (item.text + index)}
        <button
          type="button"
          class="word-chip"
          class:dragging={draggingIndex === index}
          onpointerdown={(event) => handlePointerDown(event, index)}
          onpointermove={handlePointerMove}
          onpointerup={handlePointerUp}
          onpointercancel={handlePointerCancel}
          onlostpointercapture={handlePointerCancel}
          onclick={() => handleChipClick(index)}
          disabled={answered}
        >
          {item.text}
        </button>
      {/each}
    </div>
    <p class="backpack-hint">Arraste uma opcao ate a lacuna ou clique para preencher.</p>
  </div>

  {#if slotted && !answered}
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
  .drag-drop-renderer {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2rem;
  }

  .phrase-container {
    font-size: 1.3rem;
    color: var(--color-text, #e2e8f0);
    line-height: 2;
    text-align: center;
    max-width: 680px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 0.45rem;
  }

  .phrase-text {
    word-break: break-word;
  }

  .prompt-block {
    width: min(100%, 680px);
    display: flex;
    flex-direction: column;
    gap: 1rem;
    align-items: center;
  }

  .prompt-standalone {
    font-size: 1.3rem;
    color: var(--color-text, #e2e8f0);
    line-height: 1.8;
    text-align: center;
    word-break: break-word;
  }

  .answer-box {
    display: flex;
    flex-wrap: wrap;
    gap: 0.55rem;
    align-items: center;
    justify-content: center;
  }

  .answer-label {
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--color-muted, #94a3b8);
  }

  .drop-zone {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 140px;
    min-height: 52px;
    padding: 0.55rem 1.1rem;
    border: 2px dashed var(--color-primary, #8b5cf6);
    border-radius: 12px;
    background: rgba(139, 92, 246, 0.08);
    text-align: center;
    transition: all 0.2s ease;
    cursor: pointer;
    font-weight: 700;
    color: var(--color-text, #e2e8f0);
  }

  .drop-zone.filled {
    border-style: solid;
    background: rgba(139, 92, 246, 0.16);
  }

  .drop-zone.drop-active {
    transform: scale(1.03);
    border-color: #c084fc;
    box-shadow: 0 0 0 4px rgba(192, 132, 252, 0.12);
  }

  .drop-zone.correct {
    border-color: #4ade80;
    background: rgba(74, 222, 128, 0.15);
    color: #dcfce7;
    animation: glow-correct 0.3s ease-in-out alternate 2;
  }

  .drop-zone.wrong {
    border-color: #f87171;
    background: rgba(248, 113, 113, 0.15);
    color: #fecaca;
    animation: glow-wrong 0.3s ease-in-out alternate 2;
  }

  .backpack {
    width: min(100%, 640px);
    background: var(--color-surface, #1e293b);
    border: 1px solid var(--color-border, #334155);
    border-radius: 18px;
    padding: 1.25rem;
  }

  .backpack-label {
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-muted, #94a3b8);
    margin-bottom: 0.75rem;
  }

  .backpack-items {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    justify-content: center;
    align-items: center;
  }

  .word-chip {
    padding: 0.7rem 1.25rem;
    border: 2px solid var(--color-border, #334155);
    border-radius: 12px;
    background: var(--color-bg, #0f172a);
    color: var(--color-text, #e2e8f0);
    font-size: 1rem;
    font-weight: 600;
    cursor: grab;
    touch-action: none;
    user-select: none;
    transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease, opacity 0.15s ease;
  }

  .word-chip:hover:not(:disabled) {
    border-color: var(--color-primary, #8b5cf6);
    box-shadow: 0 4px 14px rgba(139, 92, 246, 0.18);
    transform: translateY(-1px);
  }

  .word-chip.dragging {
    opacity: 0.18;
    transform: scale(0.98);
    box-shadow: none;
  }

  .word-chip:disabled {
    cursor: default;
    opacity: 0.8;
  }

  .backpack-hint {
    margin-top: 0.9rem;
    color: var(--color-muted, #94a3b8);
    font-size: 0.92rem;
    text-align: center;
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

  .drag-ghost {
    position: fixed;
    z-index: 1200;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.7rem 1.25rem;
    border: 2px solid var(--color-primary, #8b5cf6);
    border-radius: 12px;
    background: rgba(15, 23, 42, 0.96);
    color: var(--color-text, #e2e8f0);
    font-size: 1rem;
    font-weight: 600;
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.24);
    pointer-events: none;
  }

  @media (max-width: 640px) {
    .phrase-container {
      font-size: 1.1rem;
    }

    .prompt-standalone {
      font-size: 1.1rem;
    }

    .drop-zone {
      min-width: 120px;
      min-height: 48px;
    }

    .backpack {
      padding: 1rem;
    }

    .word-chip {
      width: 100%;
      cursor: pointer;
    }
  }
</style>
