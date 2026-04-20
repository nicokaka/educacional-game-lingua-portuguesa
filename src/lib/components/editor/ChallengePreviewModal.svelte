<script>
  import MultipleChoiceRenderer from '../renderers/MultipleChoiceRenderer.svelte';
  import TrueFalseRenderer from '../renderers/TrueFalseRenderer.svelte';
  import OrderingRenderer from '../renderers/OrderingRenderer.svelte';
  import DragDropRenderer from '../renderers/DragDropRenderer.svelte';
  import OpenTextRenderer from '../renderers/OpenTextRenderer.svelte';

  let { challenge, onclose } = $props();

  // Prepara o challenge no mesmo formato que o gameSession produziria,
  // mas sem nenhuma dependência de rede ou sessão de aluno.
  let previewChallenge = $derived(preparePreviewChallenge(challenge));

  function preparePreviewChallenge(ch) {
    if (!ch) return null;
    const clone = JSON.parse(JSON.stringify(ch));

    // Ordering: embaralha fragments para mostrar como o aluno vê
    if (clone.type === 'ordering') {
      const frags = Array.isArray(clone.fragments) ? [...clone.fragments] : [];
      // Fisher-Yates shuffle
      for (let i = frags.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [frags[i], frags[j]] = [frags[j], frags[i]];
      }
      clone.displayFragments = frags;
    }

    // DragDrop: inclui resposta correta na mochila e embaralha
    if (clone.type === 'drag_drop') {
      const loot = Array.isArray(clone.loot) ? [...clone.loot] : [];
      const correctItem = { text: clone.correctAnswer || '', correct: true };
      const allItems = [...loot.filter(i => i.text?.trim()), correctItem];
      for (let i = allItems.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allItems[i], allItems[j]] = [allItems[j], allItems[i]];
      }
      clone.loot = allItems;
    }

    return clone;
  }

  // Handlers de pré-visualização: aceitam interação mas não salvam nada
  function previewAnswer(answer) {
    if (!previewChallenge) return { correct: false };

    if (previewChallenge.type === 'multiple_choice') {
      const correct = previewChallenge.options?.find(o => o.correct)?.text;
      const selected = previewChallenge.options?.find(o => o.id === answer || o.text === answer);
      const isCorrect = selected?.correct === true;
      return {
        correct: isCorrect,
        feedback: isCorrect
          ? '✅ Correto! (pré-visualização)'
          : selected?.feedback || '❌ Incorreto. (pré-visualização)',
      };
    }

    if (previewChallenge.type === 'true_false') {
      const statements = previewChallenge.statements || [];
      const isCorrect = Array.isArray(answer) &&
        answer.every((ans, i) => ans === statements[i]?.correctAnswer);
      return {
        correct: isCorrect,
        feedback: isCorrect ? '✅ Correto! (pré-visualização)' : '❌ Incorreto. (pré-visualização)',
      };
    }

    if (previewChallenge.type === 'ordering') {
      const frags = previewChallenge.fragments || [];
      const isCorrect = Array.isArray(answer) && answer.length === frags.length && answer.every((ans, i) => ans === frags[i]);
      return {
        correct: isCorrect,
        feedback: isCorrect
          ? '✅ Ordem correta! (pré-visualização)'
          : `❌ Ordem esperada: ${frags.join(' / ')}`,
      };
    }

    if (previewChallenge.type === 'drag_drop') {
      const isCorrect = (answer || '').toLowerCase().trim() ===
        (previewChallenge.correctAnswer || '').toLowerCase().trim();
      return {
        correct: isCorrect,
        feedback: isCorrect
          ? '✅ Correto! (pré-visualização)'
          : `❌ Resposta correta: ${previewChallenge.correctAnswer}`,
      };
    }

    if (previewChallenge.type === 'open_text') {
      return { submitted: true, message: '✅ Resposta registrada. (pré-visualização — não salva)' };
    }

    return { correct: false };
  }

  function previewHint() {
    const hint = previewChallenge?.hint?.trim();
    return hint
      ? { available: true, text: hint }
      : { available: false, message: 'Nenhum bizu cadastrado para esta pergunta.' };
  }

  function closeOnBackdrop(event) {
    if (event.target === event.currentTarget) onclose?.();
  }

  function closeOnKey(event) {
    if (event.key === 'Escape') onclose?.();
  }
</script>

<svelte:window onkeydown={closeOnKey} />

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  class="preview-overlay"
  role="dialog"
  aria-modal="true"
  aria-label="Pré-visualização da pergunta"
  tabindex="-1"
  onmousedown={closeOnBackdrop}
>
  <div class="preview-shell">
    <div class="preview-header">
      <span class="preview-badge">👁 Pré-visualização</span>
      <p class="preview-hint-text">Interaja livremente — nada é salvo aqui.</p>
      <button class="preview-close" onclick={() => onclose?.()} aria-label="Fechar pré-visualização">✕</button>
    </div>

    <div class="preview-body">
      {#if !previewChallenge}
        <p class="preview-empty">Nenhuma pergunta para exibir.</p>
      {:else if previewChallenge.type === 'multiple_choice'}
        {#key previewChallenge.id}
          <MultipleChoiceRenderer
            challenge={previewChallenge}
            onAnswer={previewAnswer}
            onHint={previewHint}
          />
        {/key}
      {:else if previewChallenge.type === 'true_false'}
        {#key previewChallenge.id}
          <TrueFalseRenderer
            challenge={previewChallenge}
            onAnswer={previewAnswer}
            onHint={previewHint}
          />
        {/key}
      {:else if previewChallenge.type === 'ordering'}
        {#key previewChallenge.id}
          <OrderingRenderer
            challenge={previewChallenge}
            onAnswer={previewAnswer}
            onHint={previewHint}
          />
        {/key}
      {:else if previewChallenge.type === 'drag_drop'}
        {#key previewChallenge.id}
          <DragDropRenderer
            challenge={previewChallenge}
            onAnswer={previewAnswer}
            onHint={previewHint}
          />
        {/key}
      {:else if previewChallenge.type === 'open_text'}
        {#key previewChallenge.id}
          <OpenTextRenderer
            challenge={previewChallenge}
            onAnswer={previewAnswer}
          />
        {/key}
      {:else}
        <p class="preview-empty">Tipo de pergunta não reconhecido: {previewChallenge.type}</p>
      {/if}
    </div>

    <div class="preview-footer">
      <button class="preview-reset" onclick={() => { previewChallenge = preparePreviewChallenge(challenge); }}>
        🔄 Resetar pergunta
      </button>
      <button class="preview-close-btn" onclick={() => onclose?.()}>Fechar</button>
    </div>
  </div>
</div>

<style>
  .preview-overlay {
    position: fixed;
    inset: 0;
    background: rgba(2, 6, 23, 0.75);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    z-index: 100;
  }

  .preview-shell {
    width: min(640px, 96vw);
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    background: linear-gradient(180deg, rgba(22, 33, 58, 0.99), rgba(10, 17, 38, 0.99));
    border: 1px solid rgba(139, 92, 246, 0.3);
    border-radius: 20px;
    box-shadow: 0 24px 64px rgba(2, 6, 23, 0.7), 0 0 0 1px rgba(139, 92, 246, 0.1);
    overflow: hidden;
  }

  .preview-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem 1.25rem;
    background: rgba(139, 92, 246, 0.08);
    border-bottom: 1px solid rgba(139, 92, 246, 0.18);
    flex-shrink: 0;
  }

  .preview-badge {
    background: rgba(139, 92, 246, 0.22);
    color: #c4b5fd;
    font-size: 0.8rem;
    font-weight: 700;
    padding: 0.3rem 0.75rem;
    border-radius: 999px;
    border: 1px solid rgba(139, 92, 246, 0.3);
    white-space: nowrap;
  }

  .preview-hint-text {
    font-size: 0.78rem;
    color: rgba(148, 163, 184, 0.7);
    flex: 1;
  }

  .preview-close {
    background: none;
    border: none;
    color: rgba(148, 163, 184, 0.7);
    font-size: 1.1rem;
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    border-radius: 6px;
    transition: color 0.15s, background 0.15s;
    line-height: 1;
  }

  .preview-close:hover {
    color: #f1f5f9;
    background: rgba(255, 255, 255, 0.07);
  }

  .preview-body {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem 1.25rem;
    /* Remove estilos de batalha dos renderers que não fazem sentido no editor */
    --color-surface: rgba(15, 23, 42, 0.6);
  }

  .preview-empty {
    color: rgba(148, 163, 184, 0.6);
    font-size: 0.95rem;
    text-align: center;
    padding: 2rem;
  }

  .preview-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.85rem 1.25rem;
    border-top: 1px solid rgba(148, 163, 184, 0.1);
    background: rgba(0, 0, 0, 0.15);
    flex-shrink: 0;
  }

  .preview-reset {
    background: none;
    border: 1px solid rgba(148, 163, 184, 0.2);
    border-radius: 8px;
    color: rgba(148, 163, 184, 0.8);
    font-size: 0.82rem;
    font-weight: 600;
    padding: 0.45rem 0.9rem;
    cursor: pointer;
    transition: all 0.15s;
  }

  .preview-reset:hover {
    border-color: rgba(139, 92, 246, 0.45);
    color: #c4b5fd;
    background: rgba(139, 92, 246, 0.07);
  }

  .preview-close-btn {
    background: rgba(139, 92, 246, 0.18);
    border: 1px solid rgba(139, 92, 246, 0.35);
    border-radius: 8px;
    color: #c4b5fd;
    font-size: 0.88rem;
    font-weight: 700;
    padding: 0.5rem 1.25rem;
    cursor: pointer;
    transition: all 0.15s;
  }

  .preview-close-btn:hover {
    background: rgba(139, 92, 246, 0.28);
    border-color: rgba(139, 92, 246, 0.6);
  }
</style>
