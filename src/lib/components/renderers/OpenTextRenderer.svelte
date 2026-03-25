<script>
  let { challenge, onAnswer } = $props();

  let responseText = $state('');
  let feedbackText = $state('');
  let submitted = $state(false);
  let sending = $state(false);

  $effect(() => {
    challenge?.id;
    responseText = '';
    feedbackText = '';
    submitted = false;
    sending = false;
  });

  async function submitResponse() {
    if (sending || submitted) return;

    const trimmedResponse = responseText.trim();
    if (!trimmedResponse) {
      feedbackText = 'Digite uma resposta antes de enviar.';
      return;
    }

    sending = true;
    feedbackText = '';

    try {
      const result = await onAnswer?.(trimmedResponse);

      if (result?.submitted) {
        submitted = true;
        feedbackText = result.message || 'Resposta enviada para correcao do professor.';
        return;
      }

      feedbackText = result?.message || 'Nao foi possivel enviar sua resposta.';
    } catch (error) {
      feedbackText = error?.message || 'Nao foi possivel enviar sua resposta.';
    } finally {
      sending = false;
    }
  }
</script>

<div class="renderer open-text-renderer">
  <p class="challenge-prompt">{challenge.prompt}</p>
  <p class="input-helper">
    Escreva com calma: seu navegador pode sugerir acentos e correcoes em portugues.
  </p>

  <textarea
    class="open-text-input"
    bind:value={responseText}
    placeholder="Escreva sua resposta aqui..."
    rows="7"
    lang="pt-BR"
    spellcheck={true}
    autocapitalize="sentences"
    autocorrect="on"
    disabled={sending || submitted}
  ></textarea>

  <button class="confirm-btn" onclick={submitResponse} disabled={sending || submitted}>
    {sending ? 'Enviando...' : submitted ? 'Resposta enviada' : 'Enviar resposta'}
  </button>

  {#if feedbackText}
    <div class="feedback-box" class:success={submitted} class:error={!submitted}>
      <p>{feedbackText}</p>
    </div>
  {/if}
</div>

<style>
  .open-text-renderer {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.25rem;
  }

  .challenge-prompt {
    font-size: 1.3rem;
    text-align: center;
    color: var(--color-text, #e2e8f0);
    line-height: 1.6;
    max-width: 620px;
  }

  .input-helper {
    max-width: 620px;
    margin: -0.35rem 0 -0.15rem;
    color: var(--color-muted, #94a3b8);
    font-size: 0.92rem;
    line-height: 1.45;
    text-align: center;
  }

  .open-text-input {
    width: 100%;
    max-width: 620px;
    min-height: 170px;
    border: 1px solid rgba(148, 163, 184, 0.22);
    border-radius: 18px;
    background: rgba(15, 23, 42, 0.78);
    color: var(--color-text, #e2e8f0);
    padding: 1rem 1.05rem;
    font-size: 1rem;
    line-height: 1.55;
    resize: vertical;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }

  .open-text-input:focus {
    outline: none;
    border-color: rgba(139, 92, 246, 0.8);
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.12);
  }

  .open-text-input:disabled {
    opacity: 0.78;
    cursor: default;
  }

  .confirm-btn {
    padding: 0.75rem 2rem;
    border: none;
    border-radius: 10px;
    background: var(--color-primary, #8b5cf6);
    color: white;
    font-size: 1.05rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .confirm-btn:hover:not(:disabled) {
    background: var(--color-primary-hover, #7c3aed);
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(139, 92, 246, 0.4);
  }

  .confirm-btn:disabled {
    opacity: 0.72;
    cursor: default;
  }

  .feedback-box {
    width: 100%;
    max-width: 620px;
    padding: 0.95rem 1rem;
    border-radius: 16px;
    text-align: left;
  }

  .feedback-box.success {
    border: 1px solid rgba(74, 222, 128, 0.34);
    background: rgba(22, 101, 52, 0.18);
    color: #dcfce7;
  }

  .feedback-box.error {
    border: 1px solid rgba(248, 113, 113, 0.34);
    background: rgba(127, 29, 29, 0.18);
    color: #fecaca;
  }

  .feedback-box p {
    margin: 0;
    line-height: 1.5;
  }
</style>
