<script>
  let { challenge, onAnswer } = $props();
  let answered = $state(false);

  // State do drag
  let draggingIndex = $state(-1);
  let dragPos = $state({ x: 0, y: 0 });
  let startPos = { x: 0, y: 0 };
  let dragEl = null;

  // Backpack local (cópia dos loot items) — $derived para reagir ao challenge mudar
  let items = $state([]);
  let slotted = $state(null);

  // Reinicializa quando o challenge muda
  $effect(() => {
    items = [...challenge.loot];
    slotted = null;
    answered = false;
  });

  function onPointerDown(e, index) {
    if (answered) return;
    draggingIndex = index;
    const rect = e.currentTarget.getBoundingClientRect();
    startPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    dragEl = e.currentTarget;
    dragEl.setPointerCapture(e.pointerId);
    dragPos = { x: 0, y: 0 };
  }

  function onPointerMove(e) {
    if (draggingIndex < 0) return;
    const rect = dragEl.parentElement.getBoundingClientRect();
    dragPos = {
      x: e.clientX - rect.left - startPos.x - (draggingIndex * 0), // offset
      y: e.clientY - rect.top - startPos.y,
    };
  }

  function onPointerUp(e) {
    if (draggingIndex < 0) return;

    // Hit-test: verifica se soltou na drop zone
    const dropZone = document.querySelector('.drop-zone');
    if (dropZone) {
      const rect = dropZone.getBoundingClientRect();
      if (
        e.clientX >= rect.left && e.clientX <= rect.right &&
        e.clientY >= rect.top && e.clientY <= rect.bottom
      ) {
        // Soltar na lacuna
        const item = items[draggingIndex];
        slotted = item;
        items = items.filter((_, i) => i !== draggingIndex);
      }
    }

    draggingIndex = -1;
    dragPos = { x: 0, y: 0 };
  }

  function removeSlot() {
    if (answered || !slotted) return;
    items = [...items, slotted];
    slotted = null;
  }

  function confirm() {
    if (!slotted || answered) return;
    answered = true;
    const result = onAnswer(slotted.text);

    if (!result.correct) {
      setTimeout(() => {
        answered = false;
        // Devolve item à mochila
        items = [...items, slotted];
        slotted = null;
      }, 1500);
    }
  }

  // Renderiza o prompt com a lacuna destacada
  function renderPrompt() {
    const parts = challenge.prompt.split('_____');
    return parts;
  }

  let promptParts = $derived(challenge.prompt.split('_____'));
</script>

<div class="renderer drag-drop-renderer">
  <!-- Frase com lacuna -->
  <div class="phrase-container">
    <span class="phrase-text">{promptParts[0]}</span>
    <button
      type="button"
      class="drop-zone"
      class:filled={slotted}
      class:correct={answered && slotted?.correct}
      class:wrong={answered && !slotted?.correct}
      onclick={removeSlot}
    >
      {#if slotted}
        {slotted.text}
      {:else}
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
      {/if}
    </button>
    {#if promptParts[1]}
      <span class="phrase-text">{promptParts[1]}</span>
    {/if}
  </div>

  <!-- Mochila -->
  <div class="backpack">
    <p class="backpack-label">🎒 Mochila</p>
    <div class="backpack-items">
      {#each items as item, index (item.text + index)}
        <div
          class="word-chip"
          class:dragging={draggingIndex === index}
          style={draggingIndex === index ? `transform: translate(${dragPos.x}px, ${dragPos.y}px); z-index: 100;` : ''}
          onpointerdown={(e) => onPointerDown(e, index)}
          onpointermove={onPointerMove}
          onpointerup={onPointerUp}
          role="button"
          tabindex="0"
        >
          {item.text}
        </div>
      {/each}
    </div>
  </div>

  {#if slotted && !answered}
    <button class="confirm-btn" onclick={confirm}>
      Confirmar ✓
    </button>
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
    max-width: 600px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
  }

  .drop-zone {
    display: inline-block;
    min-width: 120px;
    padding: 0.4rem 1rem;
    border: 2px dashed var(--color-primary, #8b5cf6);
    border-radius: 8px;
    background: rgba(139, 92, 246, 0.08);
    text-align: center;
    transition: all 0.2s ease;
    cursor: pointer;
    font-weight: 600;
  }

  .drop-zone.filled {
    border-style: solid;
    background: rgba(139, 92, 246, 0.15);
  }

  .drop-zone.correct {
    border-color: #4ade80;
    background: rgba(74, 222, 128, 0.15);
    animation: glow-correct 0.3s ease-in-out alternate 2;
  }

  .drop-zone.wrong {
    border-color: #f87171;
    background: rgba(248, 113, 113, 0.15);
    animation: glow-wrong 0.3s ease-in-out alternate 2;
  }

  .backpack {
    background: var(--color-surface, #1e293b);
    border: 1px solid var(--color-border, #334155);
    border-radius: 16px;
    padding: 1.25rem;
    min-width: 300px;
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
    gap: 0.5rem;
    position: relative;
  }

  .word-chip {
    padding: 0.6rem 1.2rem;
    border: 2px solid var(--color-border, #334155);
    border-radius: 10px;
    background: var(--color-bg, #0f172a);
    color: var(--color-text, #e2e8f0);
    font-size: 1rem;
    font-weight: 500;
    cursor: grab;
    user-select: none;
    touch-action: none;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
    will-change: transform;
  }

  .word-chip:hover {
    border-color: var(--color-primary, #8b5cf6);
    box-shadow: 0 2px 8px rgba(139, 92, 246, 0.2);
  }

  .word-chip.dragging {
    cursor: grabbing;
    border-color: var(--color-primary, #8b5cf6);
    box-shadow: 0 8px 24px rgba(139, 92, 246, 0.3);
    position: relative;
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
</style>
